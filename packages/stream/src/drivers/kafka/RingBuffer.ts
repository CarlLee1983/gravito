/**
 * 固定容量環形緩衝區，提供 O(1) push 和 shift 操作。
 *
 * 取代 Array.shift() 的 O(n) 瓶頸，用於高吞吐量訊息處理場景。
 *
 * 內部使用固定長度陣列 + head/tail 指標實現 FIFO 語義，
 * 避免重新索引開銷。
 *
 * @public
 */
export class RingBuffer<T> {
  private readonly items: Array<T | undefined>
  private readonly capacity: number
  private head = 0
  private tail = 0
  private count = 0

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('RingBuffer capacity must be positive')
    }
    this.capacity = capacity
    this.items = new Array<T | undefined>(capacity)
  }

  /**
   * 推入元素到緩衝區尾端。
   * @returns true 如果成功推入，false 如果緩衝區已滿
   */
  push(item: T): boolean {
    if (this.count >= this.capacity) {
      return false
    }

    this.items[this.tail] = item
    this.tail = (this.tail + 1) % this.capacity
    this.count++
    return true
  }

  /**
   * 從緩衝區頭部取出元素（FIFO）。
   * @returns 元素，或 undefined 如果緩衝區為空
   */
  shift(): T | undefined {
    if (this.count === 0) {
      return undefined
    }

    const item = this.items[this.head]
    this.items[this.head] = undefined // 釋放引用
    this.head = (this.head + 1) % this.capacity
    this.count--
    return item
  }

  /**
   * 查看頭部元素但不移除。
   * @returns 元素，或 undefined 如果緩衝區為空
   */
  peek(): T | undefined {
    if (this.count === 0) {
      return undefined
    }
    return this.items[this.head]
  }

  /**
   * 從頭部批次取出多個元素。
   * @param count 要取出的最大數量
   * @returns 取出的元素陣列
   */
  shiftMany(count: number): T[] {
    const result: T[] = []
    const toDequeue = Math.min(count, this.count)

    for (let i = 0; i < toDequeue; i++) {
      const item = this.items[this.head]
      this.items[this.head] = undefined
      this.head = (this.head + 1) % this.capacity
      this.count--
      if (item !== undefined) {
        result.push(item)
      }
    }

    return result
  }

  /**
   * 當前緩衝區中的元素數量。
   */
  get length(): number {
    return this.count
  }

  /**
   * 緩衝區是否為空。
   */
  get isEmpty(): boolean {
    return this.count === 0
  }

  /**
   * 緩衝區是否已滿。
   */
  get isFull(): boolean {
    return this.count >= this.capacity
  }

  /**
   * 緩衝區的最大容量。
   */
  getCapacity(): number {
    return this.capacity
  }

  /**
   * 清空緩衝區中所有元素。
   */
  clear(): void {
    for (let i = 0; i < this.capacity; i++) {
      this.items[i] = undefined
    }
    this.head = 0
    this.tail = 0
    this.count = 0
  }

  /**
   * 將緩衝區中的元素轉換為陣列（從頭到尾順序，不移除元素）。
   */
  toArray(): T[] {
    const result: T[] = []
    let idx = this.head
    for (let i = 0; i < this.count; i++) {
      const item = this.items[idx]
      if (item !== undefined) {
        result.push(item)
      }
      idx = (idx + 1) % this.capacity
    }
    return result
  }
}
