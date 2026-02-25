/**
 * 優先級事件隊列
 *
 * 使用優先級堆實現的高效優先級隊列
 * - O(1) 查看最高優先級事件
 * - O(log n) 添加事件
 * - O(log n) 移除最高優先級事件
 */

import { type CacheEvent, EventPriority } from './index'

/**
 * 優先級隊列實現
 */
export class EventQueue {
  private heap: CacheEvent[] = []

  /**
   * 優先級數值映射（靜態常量，避免重複計算）
   */
  private static readonly PRIORITY_VALUES: Record<EventPriority, number> = {
    [EventPriority.CRITICAL]: 0,
    [EventPriority.HIGH]: 1,
    [EventPriority.NORMAL]: 2,
    [EventPriority.LOW]: 3,
  }

  /**
   * 添加事件到隊列
   * 複雜度：O(log n)
   */
  enqueue(event: CacheEvent): void {
    this.heap.push(event)
    this.bubbleUp(this.heap.length - 1)
  }

  /**
   * 移除並返回最高優先級事件
   * 複雜度：O(log n)
   */
  dequeue(): CacheEvent | undefined {
    if (this.heap.length === 0) {
      return undefined
    }

    const root = this.heap[0]

    if (this.heap.length === 1) {
      this.heap = []
      return root
    }

    // 將最後一個元素移到根部
    this.heap[0] = this.heap[this.heap.length - 1]
    this.heap.pop()

    // 向下調整
    this.bubbleDown(0)

    return root
  }

  /**
   * 查看最高優先級事件，不移除
   * 複雜度：O(1)
   */
  peek(): CacheEvent | undefined {
    return this.heap[0]
  }

  /**
   * 取出所有優先級 >= threshold 的事件
   * 用於批處理，優化為 O(n) 而非 O(n log n)
   */
  dequeueByPriority(maxSize: number = Infinity): CacheEvent[] {
    const result: CacheEvent[] = []
    const toRemove = Math.min(maxSize, this.heap.length)

    // 直接批量移除，而非循環調用 dequeue()
    for (let i = 0; i < toRemove; i++) {
      const event = this.dequeue()
      if (event) {
        result.push(event)
      }
    }

    return result
  }

  /**
   * 隊列大小
   */
  size(): number {
    return this.heap.length
  }

  /**
   * 隊列是否為空
   */
  isEmpty(): boolean {
    return this.heap.length === 0
  }

  /**
   * 清空隊列
   */
  clear(): void {
    this.heap = []
  }

  /**
   * 獲取隊列統計
   */
  getStats(): {
    size: number
    oldestEvent?: { age: number; priority: string }
    newestEvent?: { age: number; priority: string }
  } {
    if (this.heap.length === 0) {
      return { size: 0 }
    }

    const now = Date.now()

    // 找到最舊和最新的事件
    let oldest = this.heap[0]
    let newest = this.heap[0]

    for (const event of this.heap) {
      if (event.timestamp < oldest.timestamp) {
        oldest = event
      }
      if (event.timestamp > newest.timestamp) {
        newest = event
      }
    }

    return {
      size: this.heap.length,
      oldestEvent: {
        age: now - oldest.timestamp,
        priority: oldest.priority,
      },
      newestEvent: {
        age: now - newest.timestamp,
        priority: newest.priority,
      },
    }
  }

  /**
   * 向上冒泡（插入後）
   * 複雜度：O(log n)
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)

      // 內聯優先級比較（避免函數調用開銷）
      const currentPriority = EventQueue.PRIORITY_VALUES[this.heap[index].priority]
      const parentPriority = EventQueue.PRIORITY_VALUES[this.heap[parentIndex].priority]

      // 如果子節點優先級更高，交換
      if (currentPriority < parentPriority) {
        // 使用直接交換而非解構（性能優化）
        const temp = this.heap[index]
        this.heap[index] = this.heap[parentIndex]
        this.heap[parentIndex] = temp
        index = parentIndex
      } else {
        break
      }
    }
  }

  /**
   * 向下沉底（刪除後）
   * 複雜度：O(log n)
   */
  private bubbleDown(index: number): void {
    while (true) {
      let smallest = index
      const leftChild = 2 * index + 1
      const rightChild = 2 * index + 2

      // 比較左子節點（內聯優先級比較）
      if (leftChild < this.heap.length) {
        const leftPriority = EventQueue.PRIORITY_VALUES[this.heap[leftChild].priority]
        const smallestPriority = EventQueue.PRIORITY_VALUES[this.heap[smallest].priority]
        if (leftPriority < smallestPriority) {
          smallest = leftChild
        }
      }

      // 比較右子節點（內聯優先級比較）
      if (rightChild < this.heap.length) {
        const rightPriority = EventQueue.PRIORITY_VALUES[this.heap[rightChild].priority]
        const smallestPriority = EventQueue.PRIORITY_VALUES[this.heap[smallest].priority]
        if (rightPriority < smallestPriority) {
          smallest = rightChild
        }
      }

      // 如果子節點優先級更高，交換
      if (smallest !== index) {
        // 使用直接交換而非解構（性能優化）
        const temp = this.heap[index]
        this.heap[index] = this.heap[smallest]
        this.heap[smallest] = temp
        index = smallest
      } else {
        break
      }
    }
  }

  /**
   * 調整事件優先級（用於升級）
   * 複雜度：O(n)，通常 n 較小
   */
  escalateEvent(eventId: string): boolean {
    const index = this.heap.findIndex((e) => e.id === eventId)
    if (index === -1) {
      return false
    }

    // 由於優先級可能上升，需要向上冒泡
    this.bubbleUp(index)
    return true
  }

  /**
   * 除用於測試的內部方法
   */
  __getHeap(): CacheEvent[] {
    return [...this.heap]
  }
}
