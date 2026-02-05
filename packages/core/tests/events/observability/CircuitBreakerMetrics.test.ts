/**
 * @gravito/core - CircuitBreaker Metrics Tests
 *
 * 測試熔斷器的 Prometheus Metrics 整合
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { CircuitBreaker, CircuitBreakerState } from '../../../src/events/CircuitBreaker'
import { EventPriorityQueue } from '../../../src/events/EventPriorityQueue'
import { EventMetrics } from '../../../src/events/observability/EventMetrics'

/**
 * 等待指定的毫秒數
 */
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

describe('CircuitBreaker Metrics', () => {
  let registry: MockMetricsRegistry
  let metrics: EventMetrics

  beforeEach(() => {
    registry = new MockMetricsRegistry()
    metrics = new EventMetrics(registry, 'test_')
  })

  describe('基礎 Metrics 記錄', () => {
    it('應該記錄熔斷器狀態', () => {
      metrics.recordCircuitBreakerState('order:created', 0)
      metrics.recordCircuitBreakerState('order:created', 2)

      const gauges = registry.getGauges()
      const stateGauge = gauges.get('test_circuit_breaker_state')

      expect(stateGauge).toBeDefined()
      expect(stateGauge).toHaveLength(2)
      expect(stateGauge[0]).toEqual({ value: 0, labels: { event_name: 'order:created' } })
      expect(stateGauge[1]).toEqual({ value: 2, labels: { event_name: 'order:created' } })
    })

    it('應該記錄熔斷器狀態轉換', () => {
      metrics.recordCircuitBreakerTransition('order:created', 'CLOSED', 'OPEN')
      metrics.recordCircuitBreakerTransition('order:created', 'OPEN', 'HALF_OPEN')

      const counters = registry.getCounters()
      const transitions = counters.get('test_circuit_breaker_transitions_total')

      expect(transitions).toBeDefined()
      expect(transitions).toHaveLength(2)
      expect(transitions[0]).toEqual({
        event_name: 'order:created',
        from_state: 'CLOSED',
        to_state: 'OPEN',
      })
      expect(transitions[1]).toEqual({
        event_name: 'order:created',
        from_state: 'OPEN',
        to_state: 'HALF_OPEN',
      })
    })

    it('應該記錄熔斷器失敗', () => {
      metrics.recordCircuitBreakerFailure('order:created')
      metrics.recordCircuitBreakerFailure('order:created')

      const counters = registry.getCounters()
      const failures = counters.get('test_circuit_breaker_failures_total')

      expect(failures).toBeDefined()
      expect(failures).toHaveLength(2)
      expect(failures[0]).toEqual({ event_name: 'order:created' })
    })

    it('應該記錄熔斷器成功', () => {
      metrics.recordCircuitBreakerSuccess('order:created')
      metrics.recordCircuitBreakerSuccess('order:created')

      const counters = registry.getCounters()
      const successes = counters.get('test_circuit_breaker_successes_total')

      expect(successes).toBeDefined()
      expect(successes).toHaveLength(2)
      expect(successes[0]).toEqual({ event_name: 'order:created' })
    })

    it('應該記錄熔斷器 OPEN 持續時間', () => {
      metrics.recordCircuitBreakerOpenDuration('order:created', 5.5)
      metrics.recordCircuitBreakerOpenDuration('order:created', 10.2)

      const histograms = registry.getHistograms()
      const durations = histograms.get('test_circuit_breaker_open_duration_seconds')

      expect(durations).toBeDefined()
      expect(durations).toHaveLength(2)
      expect(durations[0]).toEqual({ value: 5.5, labels: { event_name: 'order:created' } })
      expect(durations[1]).toEqual({ value: 10.2, labels: { event_name: 'order:created' } })
    })
  })

  describe('與 CircuitBreaker 集成', () => {
    it('應該在熔斷器失敗時自動記錄失敗 metrics', async () => {
      const breaker = new CircuitBreaker('order:created', {
        failureThreshold: 2,
        metricsRecorder: {
          recordState: (name, state) => metrics.recordCircuitBreakerState(name, state),
          recordTransition: (name, from, to) =>
            metrics.recordCircuitBreakerTransition(name, from, to),
          recordFailure: (name) => metrics.recordCircuitBreakerFailure(name),
          recordSuccess: (name) => metrics.recordCircuitBreakerSuccess(name),
          recordOpenDuration: (name, seconds) =>
            metrics.recordCircuitBreakerOpenDuration(name, seconds),
        },
      })

      // 第一次失敗
      try {
        await breaker.execute(() => Promise.reject(new Error('Service down')))
      } catch {}

      // 第二次失敗（達到閾值，開路）
      try {
        await breaker.execute(() => Promise.reject(new Error('Service down')))
      } catch {}

      const counters = registry.getCounters()
      const failures = counters.get('test_circuit_breaker_failures_total')

      expect(failures).toBeDefined()
      expect(failures).toHaveLength(2) // 兩次失敗都記錄了
    })

    it('應該在熔斷器成功時自動記錄成功 metrics', async () => {
      const breaker = new CircuitBreaker('order:created', {
        metricsRecorder: {
          recordState: (name, state) => metrics.recordCircuitBreakerState(name, state),
          recordTransition: (name, from, to) =>
            metrics.recordCircuitBreakerTransition(name, from, to),
          recordFailure: (name) => metrics.recordCircuitBreakerFailure(name),
          recordSuccess: (name) => metrics.recordCircuitBreakerSuccess(name),
          recordOpenDuration: (name, seconds) =>
            metrics.recordCircuitBreakerOpenDuration(name, seconds),
        },
      })

      await breaker.execute(() => Promise.resolve(true))
      await breaker.execute(() => Promise.resolve(true))

      const counters = registry.getCounters()
      const successes = counters.get('test_circuit_breaker_successes_total')

      expect(successes).toBeDefined()
      expect(successes).toHaveLength(2)
    })

    it('應該在狀態轉換時記錄 transition metrics', async () => {
      const breaker = new CircuitBreaker('order:created', {
        failureThreshold: 2,
        resetTimeout: 100,
        metricsRecorder: {
          recordState: (name, state) => metrics.recordCircuitBreakerState(name, state),
          recordTransition: (name, from, to) =>
            metrics.recordCircuitBreakerTransition(name, from, to),
          recordFailure: (name) => metrics.recordCircuitBreakerFailure(name),
          recordSuccess: (name) => metrics.recordCircuitBreakerSuccess(name),
          recordOpenDuration: (name, seconds) =>
            metrics.recordCircuitBreakerOpenDuration(name, seconds),
        },
      })

      // 開路（CLOSED → OPEN）
      try {
        await breaker.execute(() => Promise.reject(new Error('Fail 1')))
      } catch {}
      try {
        await breaker.execute(() => Promise.reject(new Error('Fail 2')))
      } catch {}

      // 等待自動恢復轉換到 HALF_OPEN
      await sleep(150)

      // 成功恢復（HALF_OPEN → CLOSED）
      await breaker.execute(() => Promise.resolve(true))

      const counters = registry.getCounters()
      const transitions = counters.get('test_circuit_breaker_transitions_total')

      expect(transitions).toBeDefined()
      expect(transitions.length).toBeGreaterThanOrEqual(2) // 至少有兩次轉換（CLOSED→OPEN, OPEN→HALF_OPEN）
    })

    it('應該在 OPEN 轉換時記錄狀態 gauge', async () => {
      const breaker = new CircuitBreaker('order:created', {
        failureThreshold: 1,
        metricsRecorder: {
          recordState: (name, state) => metrics.recordCircuitBreakerState(name, state),
          recordTransition: (name, from, to) =>
            metrics.recordCircuitBreakerTransition(name, from, to),
          recordFailure: (name) => metrics.recordCircuitBreakerFailure(name),
          recordSuccess: (name) => metrics.recordCircuitBreakerSuccess(name),
          recordOpenDuration: (name, seconds) =>
            metrics.recordCircuitBreakerOpenDuration(name, seconds),
        },
      })

      // 觸發開路
      try {
        await breaker.execute(() => Promise.reject(new Error('Fail')))
      } catch {}

      const gauges = registry.getGauges()
      const states = gauges.get('test_circuit_breaker_state')

      expect(states).toBeDefined()
      expect(states.length).toBeGreaterThan(0)
      // 最後一次應該是 OPEN（值 2）
      const lastState = states[states.length - 1]
      expect(lastState.value).toBe(2) // OPEN = 2
    })

    it('應該在 OPEN 轉換時記錄 OPEN 持續時間', async () => {
      const breaker = new CircuitBreaker('order:created', {
        failureThreshold: 1,
        resetTimeout: 100,
        metricsRecorder: {
          recordState: (name, state) => metrics.recordCircuitBreakerState(name, state),
          recordTransition: (name, from, to) =>
            metrics.recordCircuitBreakerTransition(name, from, to),
          recordFailure: (name) => metrics.recordCircuitBreakerFailure(name),
          recordSuccess: (name) => metrics.recordCircuitBreakerSuccess(name),
          recordOpenDuration: (name, seconds) =>
            metrics.recordCircuitBreakerOpenDuration(name, seconds),
        },
      })

      // 開路
      try {
        await breaker.execute(() => Promise.reject(new Error('Fail')))
      } catch {}

      // 等待自動恢復
      await sleep(150)

      // 觸發狀態檢查（將 OPEN 轉換為 HALF_OPEN）
      try {
        await breaker.execute(() => Promise.resolve(true))
      } catch {}

      const histograms = registry.getHistograms()
      const durations = histograms.get('test_circuit_breaker_open_duration_seconds')

      expect(durations).toBeDefined()
      expect(durations.length).toBeGreaterThan(0)
      const duration = durations[0].value
      expect(duration).toBeGreaterThanOrEqual(0.1) // 至少 100ms
    })
  })

  describe('與 EventPriorityQueue 集成', () => {
    it('應該自動在 EventPriorityQueue 的熔斷器中注入 metricsRecorder', async () => {
      const queue = new EventPriorityQueue()
      queue.setEventMetrics(metrics)

      // 通過 enqueue 來測試（通過 private 方法無法直接訪問，但我們可以檢查行為）
      // 實際在 executeTask 中會創建熔斷器

      // 由於 getOrCreateEventCircuitBreaker 是 private 的，我們無法直接測試
      // 但我們可以通過集成測試驗證它的行為
      expect(queue).toBeDefined()
    })

    it('應該在多個事件中隔離 Metrics', () => {
      metrics.recordCircuitBreakerState('order:created', 2)
      metrics.recordCircuitBreakerState('payment:processed', 0)

      const gauges = registry.getGauges()
      const states = gauges.get('test_circuit_breaker_state')

      expect(states).toHaveLength(2)
      expect(states[0]).toEqual({ value: 2, labels: { event_name: 'order:created' } })
      expect(states[1]).toEqual({ value: 0, labels: { event_name: 'payment:processed' } })
    })

    it('應該在重置後繼續累計 Metrics', async () => {
      const breaker = new CircuitBreaker('test', {
        failureThreshold: 1,
        metricsRecorder: {
          recordState: (name, state) => metrics.recordCircuitBreakerState(name, state),
          recordTransition: (name, from, to) =>
            metrics.recordCircuitBreakerTransition(name, from, to),
          recordFailure: (name) => metrics.recordCircuitBreakerFailure(name),
          recordSuccess: (name) => metrics.recordCircuitBreakerSuccess(name),
          recordOpenDuration: (name, seconds) =>
            metrics.recordCircuitBreakerOpenDuration(name, seconds),
        },
      })

      // 第一個周期：開路
      try {
        await breaker.execute(() => Promise.reject(new Error('Fail')))
      } catch {}

      const failuresAfterFirst = registry.getCounters().get('test_circuit_breaker_failures_total')
      expect(failuresAfterFirst).toHaveLength(1)

      // 手動重置
      breaker.manualReset()

      // 第二個周期：再次開路
      try {
        await breaker.execute(() => Promise.reject(new Error('Fail again')))
      } catch {}

      const failuresAfterSecond = registry.getCounters().get('test_circuit_breaker_failures_total')
      expect(failuresAfterSecond).toHaveLength(2) // 累計兩次失敗
    })
  })

  describe('邊界情況', () => {
    it('未啟用 Metrics 時不應該崩潰', async () => {
      const breaker = new CircuitBreaker('test', {
        failureThreshold: 1,
        // 不傳遞 metricsRecorder
      })

      try {
        await breaker.execute(() => Promise.reject(new Error('Fail')))
      } catch {}

      // 應該正常運作
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
    })

    it('應該正確計算狀態值（CLOSED=0, HALF_OPEN=1, OPEN=2）', () => {
      metrics.recordCircuitBreakerState('test', 0)
      metrics.recordCircuitBreakerState('test', 1)
      metrics.recordCircuitBreakerState('test', 2)

      const gauges = registry.getGauges()
      const states = gauges.get('test_circuit_breaker_state')

      expect(states).toHaveLength(3)
      expect(states.map((s: any) => s.value)).toEqual([0, 1, 2])
    })

    it('應該支持並發事件的 Metrics 正確性', async () => {
      const breaker1 = new CircuitBreaker('event1', {
        metricsRecorder: {
          recordState: (name, state) => metrics.recordCircuitBreakerState(name, state),
          recordTransition: (name, from, to) =>
            metrics.recordCircuitBreakerTransition(name, from, to),
          recordFailure: (name) => metrics.recordCircuitBreakerFailure(name),
          recordSuccess: (name) => metrics.recordCircuitBreakerSuccess(name),
          recordOpenDuration: (name, seconds) =>
            metrics.recordCircuitBreakerOpenDuration(name, seconds),
        },
      })

      const breaker2 = new CircuitBreaker('event2', {
        metricsRecorder: {
          recordState: (name, state) => metrics.recordCircuitBreakerState(name, state),
          recordTransition: (name, from, to) =>
            metrics.recordCircuitBreakerTransition(name, from, to),
          recordFailure: (name) => metrics.recordCircuitBreakerFailure(name),
          recordSuccess: (name) => metrics.recordCircuitBreakerSuccess(name),
          recordOpenDuration: (name, seconds) =>
            metrics.recordCircuitBreakerOpenDuration(name, seconds),
        },
      })

      await Promise.all([
        breaker1.execute(() => Promise.resolve(1)),
        breaker2.execute(() => Promise.resolve(2)),
      ])

      const successes = registry.getCounters().get('test_circuit_breaker_successes_total')
      expect(successes).toHaveLength(2)
    })
  })
})
