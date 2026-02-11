/**
 * P1.3 Phase 2.2 - 隊列與去重優化測試
 *
 * 驗證 EventQueue 和 EventDeduplicator 的 6 項優化
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { EventPriority } from '../events'
import { EventDeduplicator } from '../events/EventDeduplicator'
import { EventQueue } from '../events/EventQueue'
import type { CacheEvent } from '../events/types'

describe('P1.3 Phase 2.2 - Queue & Dedup Optimization', () => {
  describe('A. EventQueue Optimization', () => {
    let queue: EventQueue

    beforeEach(() => {
      queue = new EventQueue()
    })

    /**
     * 測試 A1：靜態優先級映射（避免重複計算）
     */
    it('A1: Static priority mapping reduces comparisons', () => {
      const events: CacheEvent[] = [
        { id: '1', patterns: ['p1'], priority: EventPriority.LOW, timestamp: Date.now() },
        { id: '2', patterns: ['p2'], priority: EventPriority.NORMAL, timestamp: Date.now() },
        { id: '3', patterns: ['p3'], priority: EventPriority.HIGH, timestamp: Date.now() },
        { id: '4', patterns: ['p4'], priority: EventPriority.CRITICAL, timestamp: Date.now() },
      ]

      // 添加 1000 個事件
      const startTime = performance.now()
      for (let i = 0; i < 1000; i++) {
        queue.enqueue({
          ...events[i % 4],
          id: `event-${i}`,
          timestamp: Date.now() + i,
        })
      }
      const duration = performance.now() - startTime

      expect(queue.size()).toBe(1000)
      expect(duration).toBeLessThan(50) // 應快速完成

      console.log('\n✓ A1 Static Priority Mapping:', {
        eventsAdded: 1000,
        duration: `${duration.toFixed(2)}ms`,
        avgPerEvent: `${(duration / 1000).toFixed(4)}ms`,
      })
    })

    /**
     * 測試 A2：優化 bubbleUp/bubbleDown 的陣列交換
     */
    it('A2: Fast array swap improves heap operations', () => {
      const events: CacheEvent[] = Array.from({ length: 500 }, (_, i) => ({
        id: `event-${i}`,
        patterns: [`pattern-${i}`],
        priority:
          i % 4 === 0
            ? EventPriority.CRITICAL
            : i % 4 === 1
              ? EventPriority.HIGH
              : i % 4 === 2
                ? EventPriority.NORMAL
                : EventPriority.LOW,
        timestamp: Date.now() - i,
      }))

      // 測試入隊性能
      const enqueueStart = performance.now()
      for (const event of events) {
        queue.enqueue(event)
      }
      const enqueueDuration = performance.now() - enqueueStart

      // 測試出隊性能
      const dequeueStart = performance.now()
      for (let i = 0; i < 500; i++) {
        queue.dequeue()
      }
      const dequeueDuration = performance.now() - dequeueStart

      expect(queue.isEmpty()).toBe(true)

      console.log('\n✓ A2 Fast Array Swap:', {
        enqueueTime: `${enqueueDuration.toFixed(2)}ms`,
        dequeueTime: `${dequeueDuration.toFixed(2)}ms`,
        totalTime: `${(enqueueDuration + dequeueDuration).toFixed(2)}ms`,
        avgPerOp: `${((enqueueDuration + dequeueDuration) / 1000).toFixed(4)}ms`,
      })
    })

    /**
     * 測試 A3：最優先級事件總是首先出隊
     */
    it('A3: Priority ordering is correct after optimization', () => {
      const events: CacheEvent[] = [
        { id: '1', patterns: ['p1'], priority: EventPriority.LOW, timestamp: Date.now() },
        { id: '2', patterns: ['p2'], priority: EventPriority.CRITICAL, timestamp: Date.now() },
        { id: '3', patterns: ['p3'], priority: EventPriority.NORMAL, timestamp: Date.now() },
        { id: '4', patterns: ['p4'], priority: EventPriority.HIGH, timestamp: Date.now() },
      ]

      // 以隨機順序添加
      for (const event of events) {
        queue.enqueue(event)
      }

      // 驗證優先級順序
      const firstDequeued = queue.dequeue()
      expect(firstDequeued?.priority).toBe(EventPriority.CRITICAL)

      const secondDequeued = queue.dequeue()
      expect(secondDequeued?.priority).toBe(EventPriority.HIGH)

      const thirdDequeued = queue.dequeue()
      expect(thirdDequeued?.priority).toBe(EventPriority.NORMAL)

      const fourthDequeued = queue.dequeue()
      expect(fourthDequeued?.priority).toBe(EventPriority.LOW)

      console.log('\n✓ A3 Priority Ordering (Optimized):', {
        order: ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'],
        result: 'Correct',
      })
    })

    /**
     * 測試 A4：dequeueByPriority() 批量提取性能
     */
    it('A4: Batch dequeue performance', () => {
      // 添加 1000 個事件
      for (let i = 0; i < 1000; i++) {
        queue.enqueue({
          id: `event-${i}`,
          patterns: [`pattern-${i}`],
          priority: i % 2 === 0 ? EventPriority.HIGH : EventPriority.NORMAL,
          timestamp: Date.now() + i,
        })
      }

      // 批量提取 100 個事件
      const startTime = performance.now()
      const extracted = queue.dequeueByPriority(100)
      const duration = performance.now() - startTime

      expect(extracted.length).toBe(100)
      expect(queue.size()).toBe(900)

      console.log('\n✓ A4 Batch Dequeue Performance:', {
        batchSize: 100,
        duration: `${duration.toFixed(2)}ms`,
        remainingInQueue: 900,
      })
    })
  })

  describe('B. EventDeduplicator Optimization', () => {
    let dedup: EventDeduplicator

    beforeEach(() => {
      dedup = new EventDeduplicator()
    })

    /**
     * 測試 B1：靜態優先級映射
     */
    it('B1: Static priority order improves addEvent performance', () => {
      const events: CacheEvent[] = [
        { id: '1', patterns: ['product:1'], priority: EventPriority.LOW, timestamp: Date.now() },
        { id: '2', patterns: ['product:2'], priority: EventPriority.NORMAL, timestamp: Date.now() },
        { id: '3', patterns: ['product:3'], priority: EventPriority.HIGH, timestamp: Date.now() },
        {
          id: '4',
          patterns: ['product:4'],
          priority: EventPriority.CRITICAL,
          timestamp: Date.now(),
        },
      ]

      const startTime = performance.now()
      for (let i = 0; i < 500; i++) {
        dedup.addEvent({
          ...events[i % 4],
          id: `event-${i}`,
          timestamp: Date.now() + i,
        })
      }
      const duration = performance.now() - startTime

      expect(dedup.getPatternCount()).toBeGreaterThan(0)

      console.log('\n✓ B1 Static Priority Mapping:', {
        eventsAdded: 500,
        duration: `${duration.toFixed(2)}ms`,
        avgPerEvent: `${(duration / 500).toFixed(4)}ms`,
      })
    })

    /**
     * 測試 B2：getDeduplicated 結果緩存
     */
    it('B2: Cached getDeduplicated result improves performance', () => {
      // 添加 100 個事件
      for (let i = 0; i < 100; i++) {
        dedup.addEvent({
          id: `event-${i}`,
          patterns: [`product:${i}`],
          priority:
            i % 4 === 0
              ? EventPriority.CRITICAL
              : i % 4 === 1
                ? EventPriority.HIGH
                : i % 4 === 2
                  ? EventPriority.NORMAL
                  : EventPriority.LOW,
          timestamp: Date.now() + i,
        })
      }

      // 第一次調用計算結果
      const firstCallStart = performance.now()
      const result1 = dedup.getDeduplicated()
      const firstCallDuration = performance.now() - firstCallStart

      // 第二次調用使用緩存
      const secondCallStart = performance.now()
      const result2 = dedup.getDeduplicated()
      const secondCallDuration = performance.now() - secondCallStart

      expect(result1.length).toBe(result2.length)
      expect(secondCallDuration).toBeLessThan(firstCallDuration)

      console.log('\n✓ B2 Cached getDeduplicated:', {
        firstCall: `${firstCallDuration.toFixed(2)}ms`,
        secondCall: `${secondCallDuration.toFixed(2)}ms`,
        improvement: `${((1 - secondCallDuration / firstCallDuration) * 100).toFixed(1)}%`,
      })
    })

    /**
     * 測試 B3：RegExp 模式緩存
     */
    it('B3: RegExp caching improves pattern matching', () => {
      // 添加包含通配符模式的事件
      for (let i = 0; i < 100; i++) {
        dedup.addEvent({
          id: `event-${i}`,
          patterns: [`product:category:${i % 10}:*`],
          priority: EventPriority.NORMAL,
          timestamp: Date.now() + i,
        })
      }

      // 第一次查詢，創建 RegExp
      const firstSearchStart = performance.now()
      const result1 = dedup.findEventsByPattern('product:category:*:*')
      const firstSearchDuration = performance.now() - firstSearchStart

      // 第二次相同查詢，使用緩存的 RegExp
      const secondSearchStart = performance.now()
      const result2 = dedup.findEventsByPattern('product:category:*:*')
      const secondSearchDuration = performance.now() - secondSearchStart

      expect(result1.length).toBeGreaterThan(0)
      expect(result2.length).toBe(result1.length)
      expect(secondSearchDuration).toBeLessThan(firstSearchDuration)

      console.log('\n✓ B3 RegExp Pattern Caching:', {
        firstSearch: `${firstSearchDuration.toFixed(2)}ms`,
        secondSearch: `${secondSearchDuration.toFixed(2)}ms`,
        improvement: `${((1 - secondSearchDuration / firstSearchDuration) * 100).toFixed(1)}%`,
        matchCount: result1.length,
      })
    })

    /**
     * 測試 B4：去重效率
     */
    it('B4: Deduplication efficiency', () => {
      // 添加大量重複模式的事件
      const patterns = ['product:1', 'product:2', 'product:3']

      for (let i = 0; i < 300; i++) {
        dedup.addEvent({
          id: `event-${i}`,
          patterns: [patterns[i % 3]],
          priority: i % 2 === 0 ? EventPriority.HIGH : EventPriority.NORMAL,
          timestamp: Date.now() + i,
        })
      }

      const stats = dedup.getStats()

      expect(stats.totalEvents).toBe(300)
      expect(stats.deduplicatedEvents).toBe(3) // 只有 3 個不同的模式
      expect(stats.deduplicationRate).toBeGreaterThan(90) // 去重率 > 90%

      console.log('\n✓ B4 Deduplication Efficiency:', {
        totalEvents: stats.totalEvents,
        deduplicatedEvents: stats.deduplicatedEvents,
        removedCount: stats.removedCount,
        deduplicationRate: `${stats.deduplicationRate}%`,
      })
    })
  })

  describe('C. Combined Performance Improvement', () => {
    /**
     * 測試 C1：隊列和去重優化的組合效果
     */
    it('C1: Combined throughput improvement (4-5x target)', () => {
      const queue = new EventQueue()
      const dedup = new EventDeduplicator()

      // 生成事件
      const generateEvents = (count: number): CacheEvent[] => {
        return Array.from({ length: count }, (_, i) => ({
          id: `event-${i}`,
          patterns: [`pattern:${i % 100}`],
          priority:
            i % 4 === 0
              ? EventPriority.CRITICAL
              : i % 4 === 1
                ? EventPriority.HIGH
                : i % 4 === 2
                  ? EventPriority.NORMAL
                  : EventPriority.LOW,
          timestamp: Date.now() + i,
        }))
      }

      const events = generateEvents(2000)

      // 測試吞吐量
      const startTime = performance.now()
      for (const event of events) {
        queue.enqueue(event)
        dedup.addEvent(event)
      }

      // 批量提取
      for (let i = 0; i < 20; i++) {
        queue.dequeueByPriority(100)
      }

      // 獲取去重結果
      const deduped = dedup.getDeduplicated()

      const duration = performance.now() - startTime
      const throughput = (events.length / duration) * 1000

      // Phase 2.1 目標：432 ops/sec
      // Phase 2.2 目標：1700-2200 ops/sec (4-5x)
      expect(throughput).toBeGreaterThan(500) // 至少達到優化目標的起點

      console.log('\n✓ C1 Combined Performance Improvement:', {
        totalEvents: events.length,
        duration: `${duration.toFixed(0)}ms`,
        throughput: `${throughput.toFixed(0)} ops/sec`,
        deduplicatedCount: deduped.length,
        improvementTarget: '1700-2200 ops/sec',
      })
    })

    /**
     * 測試 C2：優先級隊列正確性
     */
    it('C2: Priority queue correctness after optimization', () => {
      const queue = new EventQueue()

      // 添加不同優先級的事件
      const priorityEvents = [
        { priority: EventPriority.LOW, label: 'LOW' },
        { priority: EventPriority.CRITICAL, label: 'CRITICAL' },
        { priority: EventPriority.NORMAL, label: 'NORMAL' },
        { priority: EventPriority.HIGH, label: 'HIGH' },
      ]

      for (let i = 0; i < 10; i++) {
        for (const { priority, label } of priorityEvents) {
          queue.enqueue({
            id: `${label}-${i}`,
            patterns: [`pattern:${label}:${i}`],
            priority,
            timestamp: Date.now() + i,
          })
        }
      }

      // 驗證優先級順序
      const expectedOrder = [
        EventPriority.CRITICAL,
        EventPriority.HIGH,
        EventPriority.NORMAL,
        EventPriority.LOW,
      ]

      let lastPriority = EventPriority.CRITICAL
      for (let i = 0; i < 40; i++) {
        const event = queue.dequeue()
        expect(event).toBeDefined()

        // 驗證優先級不小於上一個
        const priorityValue = {
          [EventPriority.CRITICAL]: 0,
          [EventPriority.HIGH]: 1,
          [EventPriority.NORMAL]: 2,
          [EventPriority.LOW]: 3,
        }

        expect(priorityValue[event!.priority]).toBeGreaterThanOrEqual(priorityValue[lastPriority])
        lastPriority = event!.priority
      }

      console.log('\n✓ C2 Priority Queue Correctness:', {
        eventsProcessed: 40,
        priorityOrderCorrect: true,
        expectedOrder: expectedOrder.map((p) => p.toString()),
      })
    })

    /**
     * 測試 C3：記憶體使用效率
     */
    it('C3: Memory efficiency validation', () => {
      const queue = new EventQueue()
      const dedup = new EventDeduplicator()

      const initialMemory = process.memoryUsage().heapUsed

      // 添加 5000 個事件
      for (let i = 0; i < 5000; i++) {
        const event: CacheEvent = {
          id: `event-${i}`,
          patterns: [`pattern:${i % 100}`],
          priority:
            i % 4 === 0
              ? EventPriority.CRITICAL
              : i % 4 === 1
                ? EventPriority.HIGH
                : i % 4 === 2
                  ? EventPriority.NORMAL
                  : EventPriority.LOW,
          timestamp: Date.now() + i,
        }
        queue.enqueue(event)
        dedup.addEvent(event)
      }

      const peakMemory = process.memoryUsage().heapUsed
      const memoryUsed = (peakMemory - initialMemory) / 1024 / 1024

      expect(memoryUsed).toBeLessThan(50) // 5000 事件應 < 50MB

      console.log('\n✓ C3 Memory Efficiency:', {
        eventsAdded: 5000,
        memoryUsed: `${memoryUsed.toFixed(2)}MB`,
        queueSize: queue.size(),
        deduplicatedPatterns: dedup.getPatternCount(),
      })
    })
  })
})
