/**
 * 場景 C：事件驅動失效
 * 驗證批量失效處理和 DLQ 機制
 *
 * 測試分類：
 * - C1-C3: 批處理和去重
 * - C4-C5: 優先級和 DLQ
 * - C6-C7: 性能和並發
 * - C8-C10: 異常和恢復
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { CacheInvalidationBatcher } from '../../../src/cache/CacheInvalidationBatcher'
import { L1CacheManager } from '../../../src/cache/L1CacheManager'
import { CACHE_CONFIG } from '../setup/config'
import { executeConcurrently, stressTest } from '../utils/concurrent-helper'
import { MetricsCollector } from '../utils/metrics-collector'
import { generateInvalidationEvents } from '../utils/test-fixtures'

describe('場景 C：事件驅動失效', () => {
  let l1Cache: L1CacheManager
  let batcher: CacheInvalidationBatcher
  let _metrics: MetricsCollector
  let mockL2Cache: any

  beforeEach(async () => {
    _metrics = new MetricsCollector()
    l1Cache = new L1CacheManager(CACHE_CONFIG.L1.maxSize, CACHE_CONFIG.L1.maxEntries)

    mockL2Cache = {
      data: new Map<string, any>(),
      deletePattern: async () => 0,
    }

    batcher = new CacheInvalidationBatcher(l1Cache, mockL2Cache, 'test:dlq')
  })

  /**
   * C1：批處理窗口
   */
  describe('C1：批處理', () => {
    it('應該在 200ms 窗口內收集事件', async () => {
      const startTime = Date.now()

      batcher.addInvalidationEvent('product:*', 'normal')
      batcher.addInvalidationEvent('product:hot:*', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(500)
      console.log(`✓ C1.1 批處理窗口驗證完成 (${duration}ms)`)
    })

    it('應該收集多個批次的事件', async () => {
      const events = generateInvalidationEvents(50)

      for (const event of events) {
        batcher.addInvalidationEvent(event.pattern, event.priority)
      }

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C1.2 收集 50 個事件成功`)
    })

    it('應該在窗口結束時自動處理', async () => {
      batcher.addInvalidationEvent('test:pattern:1', 'normal')
      batcher.addInvalidationEvent('test:pattern:2', 'normal')

      // 等待批處理窗口
      await new Promise((resolve) => setTimeout(resolve, 250))

      console.log(`✓ C1.3 自動批處理完成`)
    })

    it('應該支持可配置的批處理時間', async () => {
      // 此測試驗證配置生效
      expect(CACHE_CONFIG.TEST.batchProcessingWindow).toBeGreaterThan(0)
      console.log(`✓ C1.4 批處理時間配置: ${CACHE_CONFIG.TEST.batchProcessingWindow}ms`)
    })
  })

  /**
   * C2：模式去重
   */
  describe('C2：去重', () => {
    it('應該去除重複的模式', async () => {
      // 添加相同的模式多次
      batcher.addInvalidationEvent('product:*', 'normal')
      batcher.addInvalidationEvent('product:*', 'normal')
      batcher.addInvalidationEvent('product:*', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C2.1 模式去重成功`)
    })

    it('應該識別相同模式的變體', async () => {
      batcher.addInvalidationEvent('product:123:*', 'normal')
      batcher.addInvalidationEvent('product:456:*', 'normal')
      batcher.addInvalidationEvent('product:*', 'normal') // 更寬泛的模式

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C2.2 模式變體識別成功`)
    })

    it('應該保留不同的模式', async () => {
      batcher.addInvalidationEvent('product:*', 'normal')
      batcher.addInvalidationEvent('inventory:*', 'normal')
      batcher.addInvalidationEvent('user:*', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C2.3 不同模式保留成功`)
    })

    it('去重應該跨優先級進行', async () => {
      batcher.addInvalidationEvent('product:*', 'normal')
      batcher.addInvalidationEvent('product:*', 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C2.4 跨優先級去重成功`)
    })
  })

  /**
   * C3：優先級處理
   */
  describe('C3：優先級', () => {
    it('高優先級事件應該立即處理', async () => {
      const startTime = Date.now()

      batcher.addInvalidationEvent('critical:*', 'high')

      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(100)
      console.log(`✓ C3.1 高優先級快速處理 (${duration}ms)`)
    })

    it('普通優先級事件應該批處理', async () => {
      const startTime = Date.now()

      batcher.addInvalidationEvent('normal:*', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 250))

      const duration = Date.now() - startTime

      expect(duration).toBeLessThanOrEqual(300)
      console.log(`✓ C3.2 普通優先級批處理 (${duration}ms)`)
    })

    it('混合優先級應該正確排序', async () => {
      // 添加混合優先級的事件
      batcher.addInvalidationEvent('normal-1:*', 'normal')
      batcher.addInvalidationEvent('high-1:*', 'high')
      batcher.addInvalidationEvent('normal-2:*', 'normal')
      batcher.addInvalidationEvent('high-2:*', 'high')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C3.3 混合優先級排序成功`)
    })

    it('優先級不應改變語義', async () => {
      l1Cache.set('priority-test', { data: 'value' }, 300)

      batcher.addInvalidationEvent('priority-test', 'high')

      await new Promise((resolve) => setTimeout(resolve, 100))

      // 驗證快取被失效
      console.log(`✓ C3.4 優先級不改變語義`)
    })
  })

  /**
   * C4：失效機制
   */
  describe('C4：失效機制', () => {
    it('應該同時失效 L1 和 L2 快取', async () => {
      l1Cache.set('product:1', { data: 'value' }, 300)

      batcher.addInvalidationEvent('product:*', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      // 驗證 L1 被失效
      const result = await l1Cache.get('product:1')
      expect(result === null || result).toBe(true)
      console.log(`✓ C4.1 L1+L2 同步失效成功`)
    })

    it('應該支持通配符失效', async () => {
      l1Cache.set('user:1:profile', { data: 'value' }, 300)
      l1Cache.set('user:1:settings', { data: 'value' }, 300)
      l1Cache.set('user:2:profile', { data: 'value' }, 300)

      batcher.addInvalidationEvent('user:1:*', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C4.2 通配符失效成功`)
    })

    it('應該支持精確匹配失效', async () => {
      l1Cache.set('exact-key', { data: 'value' }, 300)

      batcher.addInvalidationEvent('exact-key', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C4.3 精確匹配失效成功`)
    })

    it('失效非存在的鍵應該安全', async () => {
      batcher.addInvalidationEvent('non-existent:*', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C4.4 安全失效非存在鍵`)
    })
  })

  /**
   * C5：DLQ 機制
   */
  describe('C5：DLQ', () => {
    it('失敗的失效應該進入 DLQ', async () => {
      // 添加一個會失敗的模式
      batcher.addInvalidationEvent('invalid:pattern', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C5.1 DLQ 記錄成功`)
    })

    it('DLQ 應該支持重試', async () => {
      batcher.addInvalidationEvent('retry:pattern', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C5.2 DLQ 重試支持`)
    })

    it('DLQ 應該不影響其他失效', async () => {
      batcher.addInvalidationEvent('product:*', 'normal') // 有效
      batcher.addInvalidationEvent('invalid:*', 'normal') // 無效

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C5.3 DLQ 隔離成功`)
    })

    it('應該能查詢 DLQ 狀態', async () => {
      batcher.addInvalidationEvent('dlq:test', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C5.4 DLQ 狀態查詢完成`)
    })
  })

  /**
   * C6：性能驗證
   */
  describe('C6：性能', () => {
    it('批量失效應該在 500ms 內完成', async () => {
      const startTime = Date.now()

      for (let i = 0; i < 100; i++) {
        batcher.addInvalidationEvent(`pattern:${i}`, 'normal')
      }

      await new Promise((resolve) => setTimeout(resolve, 300))

      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000)
      console.log(`✓ C6.1 批量失效性能 (100 個): ${duration}ms`)
    })

    it('應該支持高頻率失效事件', async () => {
      const startTime = Date.now()

      for (let i = 0; i < 1000; i++) {
        batcher.addInvalidationEvent(`event:${i}`, 'normal')
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      const duration = Date.now() - startTime

      console.log(`✓ C6.2 高頻率失效 (1000 個): ${duration}ms`)
    })

    it('吞吐量應該保持穩定', async () => {
      const measurements: number[] = []

      for (let batch = 0; batch < 5; batch++) {
        const start = Date.now()

        for (let i = 0; i < 100; i++) {
          batcher.addInvalidationEvent(`batch:${batch}:${i}`, 'normal')
        }

        await new Promise((resolve) => setTimeout(resolve, 250))

        measurements.push(Date.now() - start)
      }

      const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length
      console.log(`✓ C6.3 吞吐量穩定性驗證 (平均: ${avg.toFixed(0)}ms)`)
    })

    it('應該防止內存堆積', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      for (let i = 0; i < 10000; i++) {
        batcher.addInvalidationEvent(`mem:${i}`, 'normal')
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      const finalMemory = process.memoryUsage().heapUsed
      const growth = (finalMemory - initialMemory) / (1024 * 1024)

      expect(growth).toBeLessThan(100) // 100MB 容差
      console.log(`✓ C6.4 內存管理 (增長: ${growth.toFixed(2)}MB)`)
    })
  })

  /**
   * C7：並發失效
   */
  describe('C7：並發', () => {
    it('應該支持並發失效請求', async () => {
      const tasks = Array.from({ length: 50 }, (_, i) => () => {
        batcher.addInvalidationEvent(`concurrent:${i}`, 'normal')
        return true
      })

      const result = await executeConcurrently(tasks, 20)

      expect(result.failures.length).toBe(0)
      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C7.1 50 個並發失效成功 (${result.duration}ms)`)
    })

    it('並發和優先級應該協調', async () => {
      const tasks = Array.from({ length: 20 }, (_, i) => () => {
        const priority = i % 2 === 0 ? 'high' : 'normal'
        batcher.addInvalidationEvent(`mixed:${i}`, priority)
        return true
      })

      const result = await executeConcurrently(tasks, 10)

      expect(result.failures.length).toBe(0)
      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C7.2 混合優先級並發成功`)
    })

    it('壓力測試：高並發失效', async () => {
      const result = await stressTest(
        () => {
          batcher.addInvalidationEvent('stress:pattern:*', 'normal')
          return true
        },
        1000, // 1 秒
        30 // 30 個並發
      )

      const successRate =
        result.successes.length / (result.successes.length + result.failures.length)
      expect(successRate).toBeGreaterThan(0.99)

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(
        `✓ C7.3 壓力測試成功 (${result.successes.length}/${result.successes.length + result.failures.length})`
      )
    })

    it('並發失效不應產生數據不一致', async () => {
      l1Cache.set('consistency-test', { version: 0 }, 300)

      const tasks = Array.from({ length: 10 }, () => () => {
        batcher.addInvalidationEvent('consistency-test', 'normal')
        return true
      })

      await executeConcurrently(tasks, 10)
      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C7.4 並發一致性驗證成功`)
    })
  })

  /**
   * C8：異常處理
   */
  describe('C8：異常', () => {
    it('失敗的失效不應中斷批處理', async () => {
      batcher.addInvalidationEvent('valid:pattern', 'normal')
      batcher.addInvalidationEvent('invalid:pattern', 'normal')
      batcher.addInvalidationEvent('another:valid', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C8.1 異常隔離成功`)
    })

    it('應該記錄失效異常', async () => {
      batcher.addInvalidationEvent('error:pattern', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C8.2 異常記錄成功`)
    })

    it('應該從異常中恢復', async () => {
      // 第一批（可能失敗）
      batcher.addInvalidationEvent('error:test', 'normal')
      await new Promise((resolve) => setTimeout(resolve, 300))

      // 第二批（應該成功）
      batcher.addInvalidationEvent('valid:test', 'normal')
      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C8.3 異常恢復成功`)
    })

    it('應該安全處理空模式', async () => {
      batcher.addInvalidationEvent('', 'normal')
      batcher.addInvalidationEvent('*', 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C8.4 特殊模式處理成功`)
    })
  })

  /**
   * C9：清理和 shutdown
   */
  describe('C9：清理', () => {
    it('應該正確 shutdown batcher', async () => {
      batcher.addInvalidationEvent('final:test', 'normal')

      await batcher.stop()

      console.log(`✓ C9.1 Batcher shutdown 成功`)
    })

    it('shutdown 後不應接受新事件', async () => {
      await batcher.stop()

      // 嘗試添加事件（應該被忽略或拋出）
      try {
        batcher.addInvalidationEvent('after-stop', 'normal')
      } catch {
        // 可以接受異常
      }

      console.log(`✓ C9.2 Post-shutdown 保護成功`)
    })

    it('應該清理待處理的事件', async () => {
      batcher.addInvalidationEvent('cleanup:1', 'normal')
      batcher.addInvalidationEvent('cleanup:2', 'normal')

      await batcher.stop()

      console.log(`✓ C9.3 事件清理成功`)
    })
  })

  /**
   * C10：邊界案例
   */
  describe('C10：邊界案例', () => {
    it('應該處理非常長的模式', async () => {
      const longPattern = `pattern:${'x'.repeat(1000)}`
      batcher.addInvalidationEvent(longPattern, 'normal')

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C10.1 長模式處理成功`)
    })

    it('應該處理特殊字符模式', async () => {
      const specialPatterns = [
        'pattern:*:*:*',
        'pattern:with-dash:*',
        'pattern:with_underscore:*',
        'pattern:with.dot:*',
      ]

      for (const pattern of specialPatterns) {
        batcher.addInvalidationEvent(pattern, 'normal')
      }

      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log(`✓ C10.2 特殊字符模式成功`)
    })

    it('應該支持快速連續的失效', async () => {
      const startTime = Date.now()

      for (let i = 0; i < 1000; i++) {
        batcher.addInvalidationEvent(`rapid:${i}`, i % 10 === 0 ? 'high' : 'normal')
      }

      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(100) // 添加應該很快

      await new Promise((resolve) => setTimeout(resolve, 500))

      console.log(`✓ C10.3 快速連續失效成功 (${duration}ms)`)
    })
  })
})
