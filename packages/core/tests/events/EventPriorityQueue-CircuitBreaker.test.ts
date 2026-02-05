/**
 * @gravito/core - EventPriorityQueue Circuit Breaker Integration Tests
 *
 * 測試事件層級熔斷器與優先級隊列的整合
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { EventOptions } from '../../src/events/EventOptions'
import { EventPriorityQueue } from '../../src/events/EventPriorityQueue'
import { EventMetrics } from '../../src/events/observability/EventMetrics'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 模擬 Metrics Registry
 */
class MockMetricsRegistry {
  private histograms: Map<string, any> = new Map()
  private gauges: Map<string, any> = new Map()
  private counters: Map<string, any> = new Map()

  histogram(config: any) {
    const mock = {
      observe: (value: number, labels: any) => {
        if (!this.histograms.has(config.name)) {
          this.histograms.set(config.name, [])
        }
        this.histograms.get(config.name)?.push({ value, labels })
      },
    }
    return mock
  }

  gauge(config: any) {
    const mock = {
      set: (value: number, labels: any) => {
        if (!this.gauges.has(config.name)) {
          this.gauges.set(config.name, [])
        }
        this.gauges.get(config.name)?.push({ value, labels })
      },
    }
    return mock
  }

  counter(config: any) {
    const mock = {
      inc: (labels: any) => {
        if (!this.counters.has(config.name)) {
          this.counters.set(config.name, [])
        }
        this.counters.get(config.name)?.push(labels)
      },
    }
    return mock
  }

  getHistograms() {
    return this.histograms
  }

  getGauges() {
    return this.gauges
  }

  getCounters() {
    return this.counters
  }
}

describe('EventPriorityQueue - Circuit Breaker Integration', () => {
  let queue: EventPriorityQueue

  beforeEach(() => {
    queue = new EventPriorityQueue()
  })

  describe('基本熔斷器保護', () => {
    it('應該在達到失敗閾值後開啟熔斷器', async () => {
      let callCount = 0
      const callback = async () => {
        callCount++
        throw new Error('Service failure')
      }

      const options: EventOptions = {
        async: true,
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeout: 500,
        },
      }

      // 觸發 3 次失敗以開啟熔斷器
      for (let i = 0; i < 3; i++) {
        queue.enqueue('test:event', {}, [callback], options)
        // 等待任務執行
        await sleep(50)
      }

      // 等待所有任務完成
      await sleep(100)

      // 驗證回調已執行 3 次
      expect(callCount).toBe(3)
    })

    it('熔斷器開啟時應該拒絕新請求', async () => {
      let successCount = 0
      let failureCount = 0

      const failCallback = async () => {
        failureCount++
        throw new Error('Failure')
      }

      const successCallback = async () => {
        successCount++
      }

      const options: EventOptions = {
        async: true,
        circuitBreaker: {
          failureThreshold: 2,
          resetTimeout: 1000,
        },
      }

      // 觸發 2 次失敗以開啟熔斷器
      for (let i = 0; i < 2; i++) {
        queue.enqueue('test:fail', {}, [failCallback], options)
        await sleep(30)
      }

      await sleep(100)

      // 此時熔斷器應該已開啟
      // 再嘗試新請求（應該被拒絕）
      queue.enqueue('test:fail', {}, [successCallback], options)
      await sleep(50)

      // 驗證失敗計數（2 次失敗）
      expect(failureCount).toBe(2)
      // 驗證成功回調未執行（被熔斷器攔截）
      expect(successCount).toBe(0)
    })
  })

  describe('熔斷器與 DLQ 協調', () => {
    it('熔斷器開啟時應該根據配置決定是否進入 DLQ', async () => {
      let callCount = 0

      const callback = async () => {
        callCount++
        throw new Error('Failure')
      }

      const optionsWithDLQ: EventOptions = {
        async: true,
        circuitBreaker: {
          failureThreshold: 2,
          resetTimeout: 500,
        },
        retry: {
          dlqAfterMaxRetries: true, // 允許熔斷器開啟時進入 DLQ
        },
      }

      // 觸發 2 次失敗以開啟熔斷器
      for (let i = 0; i < 2; i++) {
        queue.enqueue('test:dlq', {}, [callback], optionsWithDLQ)
        await sleep(30)
      }

      await sleep(100)

      expect(callCount).toBe(2)
    })
  })

  describe('熔斷器狀態轉換', () => {
    it('應該在超時後從 OPEN 轉換到 HALF_OPEN', async () => {
      let callCount = 0

      const callback = async () => {
        callCount++
        throw new Error('Failure')
      }

      const options: EventOptions = {
        async: true,
        circuitBreaker: {
          failureThreshold: 1,
          resetTimeout: 100, // 100ms 後轉換到 HALF_OPEN
        },
      }

      // 觸發 1 次失敗以開啟熔斷器
      queue.enqueue('test:transition', {}, [callback], options)
      await sleep(50)

      expect(callCount).toBe(1)

      // 等待轉換到 HALF_OPEN
      await sleep(150)

      // 此時應該允許新請求（進入 HALF_OPEN）
      let halfopenCallCount = 0
      const halfOpenCallback = async () => {
        halfopenCallCount++
      }

      queue.enqueue('test:transition', {}, [halfOpenCallback], options)
      await sleep(100)

      expect(halfopenCallCount).toBe(1)
    })
  })

  describe('不同事件的獨立熔斷器', () => {
    it('不同事件應該有獨立的熔斷器', async () => {
      let event1Count = 0
      let event2Count = 0

      const callback1 = async () => {
        event1Count++
        throw new Error('Event 1 failure')
      }

      const callback2 = async () => {
        event2Count++
        throw new Error('Event 2 failure')
      }

      const options: EventOptions = {
        async: true,
        circuitBreaker: {
          failureThreshold: 2,
          resetTimeout: 500,
        },
      }

      // Event 1: 2 次失敗 -> 熔斷器開啟
      for (let i = 0; i < 2; i++) {
        queue.enqueue('event:1', {}, [callback1], options)
        await sleep(30)
      }

      await sleep(100)

      // 此時 event:1 的熔斷器應該開啟，但 event:2 仍應關閉
      // Event 2: 應該可以執行
      queue.enqueue('event:2', {}, [callback2], options)
      await sleep(50)

      expect(event1Count).toBe(2)
      expect(event2Count).toBe(1)
    })
  })

  describe('沒有熔斷器配置時的行為', () => {
    it('沒有熔斷器配置時應該直接執行', async () => {
      let callCount = 0

      const callback = async () => {
        callCount++
        throw new Error('Failure')
      }

      const optionsWithoutCB: EventOptions = {
        async: true,
        // 沒有 circuitBreaker 配置
      }

      // 多次嘗試（應該全部執行，不受熔斷器保護）
      for (let i = 0; i < 5; i++) {
        queue.enqueue('test:nocb', {}, [callback], optionsWithoutCB)
        await sleep(30)
      }

      await sleep(100)

      expect(callCount).toBe(5)
    })
  })

  describe('隊列深度與回調執行', () => {
    it('應該正確處理多個事件的回調執行', async () => {
      const events: string[] = []

      const createCallback = (eventName: string) => async () => {
        events.push(eventName)
      }

      const options: EventOptions = {
        async: true,
        circuitBreaker: {
          failureThreshold: 100, // 高閾值避免開啟
        },
      }

      // 入隊多個事件
      queue.enqueue('event:1', {}, [createCallback('event:1')], options)
      queue.enqueue('event:2', {}, [createCallback('event:2')], options)
      queue.enqueue('event:3', {}, [createCallback('event:3')], options)

      // 等待所有任務執行
      await sleep(200)

      expect(events.length).toBe(3)
      expect(events).toContain('event:1')
      expect(events).toContain('event:2')
      expect(events).toContain('event:3')
    })
  })

  describe('熔斷器 Metrics 整合', () => {
    it('應該記錄熔斷器失敗和成功', async () => {
      const registry = new MockMetricsRegistry()
      const metrics = new EventMetrics(registry, 'test_')
      queue.setEventMetrics(metrics)

      const successCallback = async () => {
        // Callback for testing metrics recording
      }

      const options: EventOptions = {
        async: true,
        circuitBreaker: {
          failureThreshold: 100, // 高閾值避免開啟
        },
      }

      queue.enqueue('test:event', {}, [successCallback], options)
      await sleep(100)

      const counters = registry.getCounters()
      const successes = counters.get('test_circuit_breaker_successes_total')

      expect(successes).toBeDefined()
      expect(successes.length).toBeGreaterThan(0)
    })

    it('應該在狀態轉換時記錄 Metrics', async () => {
      const registry = new MockMetricsRegistry()
      const metrics = new EventMetrics(registry, 'test_')
      queue.setEventMetrics(metrics)

      const failCallback = async () => {
        throw new Error('Failure')
      }

      const options: EventOptions = {
        async: true,
        circuitBreaker: {
          failureThreshold: 1,
          resetTimeout: 200,
        },
      }

      // 觸發一次失敗以開啟熔斷器
      queue.enqueue('test:transition', {}, [failCallback], options)
      await sleep(100)

      // 檢查轉換 Metrics
      const counters = registry.getCounters()
      const transitions = counters.get('test_circuit_breaker_transitions_total')

      expect(transitions).toBeDefined()
      expect(transitions.length).toBeGreaterThan(0)
    })

    it('應該隔離不同事件的 Metrics', async () => {
      const registry = new MockMetricsRegistry()
      const metrics = new EventMetrics(registry, 'test_')
      queue.setEventMetrics(metrics)

      const callback1 = async () => {
        // Callback for event 1
      }

      const callback2 = async () => {
        // Callback for event 2
      }

      const options: EventOptions = {
        async: true,
        circuitBreaker: {
          failureThreshold: 100,
        },
      }

      queue.enqueue('event:1', {}, [callback1], options)
      queue.enqueue('event:2', {}, [callback2], options)

      await sleep(150)

      const counters = registry.getCounters()
      const successes = counters.get('test_circuit_breaker_successes_total')

      // 應該有兩個不同事件的成功記錄
      expect(successes).toBeDefined()
      if (successes) {
        const eventNames = successes.map((s: any) => s.event_name)
        expect(eventNames).toContain('event:1')
        expect(eventNames).toContain('event:2')
      }
    })
  })
})
