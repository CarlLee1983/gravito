/**
 * Model collection (similar to Laravel's Collection).
 */
export declare class ModelCollection<T> extends Array<T> {
  constructor(items?: T[])
  /**
   * Convert to a plain array.
   */
  toArray(): T[]
  /**
   * Convert to JSON.
   */
  toJSON(): any[]
  /**
   * Find the first item that matches a predicate.
   */
  find(callback: (item: T, index: number, array: T[]) => boolean): T | undefined
  /**
   * Get the first item.
   */
  first(): T | undefined
  /**
   * Get the last item.
   */
  last(): T | undefined
  /**
   * Map.
   */
  map<U>(callback: (item: T, index: number, array: T[]) => U): ModelCollection<U>
  /**
   * Filter.
   */
  filter(callback: (item: T, index: number, array: T[]) => boolean): ModelCollection<T>
}
//# sourceMappingURL=ModelCollection.d.ts.map
