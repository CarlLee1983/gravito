/**
 * Model 集合類別（類似 Laravel 的 Collection）
 */
export class ModelCollection<T> extends Array<T> {
  constructor(items: T[] = []) {
    super(...items)
    Object.setPrototypeOf(this, ModelCollection.prototype)
  }

  /**
   * 轉換為普通陣列
   */
  toArray(): T[] {
    return [...this]
  }

  /**
   * 轉換為 JSON
   */
  toJSON(): any[] {
    return this.map((item: any) => {
      if (item && typeof item.toJSON === 'function') {
        return item.toJSON()
      }
      return item
    })
  }

  /**
   * 查找第一個符合條件的項目
   */
  find(callback: (item: T, index: number) => boolean): T | undefined {
    return super.find(callback)
  }

  /**
   * 獲取第一個項目
   */
  first(): T | undefined {
    return this[0]
  }

  /**
   * 獲取最後一個項目
   */
  last(): T | undefined {
    return this[this.length - 1]
  }

  /**
   * 映射
   */
  map<U>(callback: (item: T, index: number) => U): ModelCollection<U> {
    return new ModelCollection(super.map(callback))
  }

  /**
   * 過濾
   */
  filter(callback: (item: T, index: number) => boolean): ModelCollection<T> {
    return new ModelCollection(super.filter(callback))
  }
}
