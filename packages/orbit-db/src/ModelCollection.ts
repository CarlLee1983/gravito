/**
 * Model collection (similar to Laravel's Collection).
 */
export class ModelCollection<T> extends Array<T> {
  constructor(items: T[] = []) {
    super(...items)
    Object.setPrototypeOf(this, ModelCollection.prototype)
  }

  /**
   * Convert to a plain array.
   */
  toArray(): T[] {
    return [...this]
  }

  /**
   * Convert to JSON.
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
   * Find the first item that matches a predicate.
   */
  find(callback: (item: T, index: number) => boolean): T | undefined {
    return super.find(callback)
  }

  /**
   * Get the first item.
   */
  first(): T | undefined {
    return this[0]
  }

  /**
   * Get the last item.
   */
  last(): T | undefined {
    return this[this.length - 1]
  }

  /**
   * Map.
   */
  map<U>(callback: (item: T, index: number) => U): ModelCollection<U> {
    return new ModelCollection(super.map(callback))
  }

  /**
   * Filter.
   */
  filter(callback: (item: T, index: number) => boolean): ModelCollection<T> {
    return new ModelCollection(super.filter(callback))
  }
}
