/**
 * 優先級事件隊列
 *
 * 使用優先級堆實現的高效優先級隊列
 * - O(1) 查看最高優先級事件
 * - O(log n) 添加事件
 * - O(log n) 移除最高優先級事件
 */

import { type CacheEvent, PriorityEscalationManager } from './index'

/**
 * 優先級隊列實現
 */
export class EventQueue {
  private heap: CacheEvent[] = []

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
    if (this.heap.length === 0) return undefined

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
   * 用於批處理
   */
  dequeueByPriority(maxSize: number = Infinity): CacheEvent[] {
    const result: CacheEvent[] = []

    while (result.length < maxSize && this.heap.length > 0) {
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

      // 比較當前和父節點的優先級
      const cmp = PriorityEscalationManager.comparePriority(
        this.heap[index],
        this.heap[parentIndex]
      )

      // 如果子節點優先級更高，交換
      if (cmp < 0) {
        ;[this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]]
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

      // 比較左子節點
      if (leftChild < this.heap.length) {
        const cmp = PriorityEscalationManager.comparePriority(
          this.heap[leftChild],
          this.heap[smallest]
        )
        if (cmp < 0) {
          smallest = leftChild
        }
      }

      // 比較右子節點
      if (rightChild < this.heap.length) {
        const cmp = PriorityEscalationManager.comparePriority(
          this.heap[rightChild],
          this.heap[smallest]
        )
        if (cmp < 0) {
          smallest = rightChild
        }
      }

      // 如果子節點優先級更高，交換
      if (smallest !== index) {
        ;[this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]]
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
    if (index === -1) return false

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
