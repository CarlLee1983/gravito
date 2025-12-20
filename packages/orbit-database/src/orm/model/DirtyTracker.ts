/**
 * Dirty Tracker
 * @description Tracks dirty (modified) attributes on model instances
 */

/**
 * Dirty Tracker
 * Tracks which attributes have been modified
 */
export class DirtyTracker<T extends Record<string, unknown>> {
  private original: Map<keyof T, unknown> = new Map()
  private dirty: Set<keyof T> = new Set()

  /**
   * Set the original values (from database)
   */
  setOriginal(data: Partial<T>): void {
    this.original.clear()
    this.dirty.clear()
    for (const [key, value] of Object.entries(data)) {
      this.original.set(key as keyof T, this.cloneValue(value))
    }
  }

  /**
   * Mark an attribute as dirty
   */
  mark(key: keyof T, newValue: unknown): void {
    const original = this.original.get(key)

    // Only mark as dirty if value actually changed
    if (!this.isEqual(original, newValue)) {
      this.dirty.add(key)
    } else {
      // Value was reverted to original
      this.dirty.delete(key)
    }
  }

  /**
   * Check if an attribute is dirty
   */
  isDirty(key?: keyof T): boolean {
    if (key) {
      return this.dirty.has(key)
    }
    return this.dirty.size > 0
  }

  /**
   * Get all dirty attribute names
   */
  getDirty(): Array<keyof T> {
    return Array.from(this.dirty)
  }

  /**
   * Get the dirty values
   */
  getDirtyValues(current: Partial<T>): Partial<T> {
    const result: Partial<T> = {}
    for (const key of this.dirty) {
      result[key] = current[key]
    }
    return result
  }

  /**
   * Get the original value of an attribute
   */
  getOriginal(key: keyof T): unknown {
    return this.original.get(key)
  }

  /**
   * Get all original values
   */
  getOriginals(): Partial<T> {
    const result: Partial<T> = {}
    for (const [key, value] of this.original) {
      result[key] = value as T[keyof T]
    }
    return result
  }

  /**
   * Clear dirty state (after save)
   */
  sync(data: Partial<T>): void {
    this.setOriginal(data)
  }

  /**
   * Reset a single attribute to original
   */
  reset(key: keyof T): void {
    this.dirty.delete(key)
  }

  /**
   * Reset all dirty attributes
   */
  resetAll(): void {
    this.dirty.clear()
  }

  /**
   * Check if values are equal
   */
  private isEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true
    }
    if (a === null || b === null) {
      return false
    }
    if (a === undefined || b === undefined) {
      return false
    }

    // Deep compare for objects and arrays
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b)
    }

    return false
  }

  /**
   * Clone value for storage
   */
  private cloneValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value
    }
    if (typeof value === 'object') {
      return JSON.parse(JSON.stringify(value))
    }
    return value
  }
}
