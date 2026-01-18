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
   * Fast shallow comparison (covers 99% of ORM use cases)
   */
  private isEqual(a: unknown, b: unknown): boolean {
    // Fast path: reference equality or primitive values
    if (a === b) {
      return true
    }
    if (a == null || b == null) {
      return a === b
    }

    // Type mismatch
    const typeA = typeof a
    const typeB = typeof b
    if (typeA !== typeB) {
      return false
    }

    // Primitive types already handled by ===
    if (typeA !== 'object') {
      return false
    }

    // Special object types
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime()
    }

    // Array shallow comparison
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false
      }
      return a.every((val, idx) => val === b[idx])
    }

    // Plain object shallow comparison (covers 99% of Model use cases)
    const keysA = Object.keys(a as object)
    const keysB = Object.keys(b as object)

    if (keysA.length !== keysB.length) {
      return false
    }

    return keysA.every((key) => {
      const valA = (a as Record<string, unknown>)[key]
      const valB = (b as Record<string, unknown>)[key]

      // Shallow equality check
      return valA === valB
    })
  }

  /**
   * Clone value for storage
   * Uses native structuredClone or fast shallow copy
   */
  private cloneValue(value: unknown): unknown {
    // Primitive values can be returned directly
    if (value === null || value === undefined) {
      return value
    }
    if (typeof value !== 'object') {
      return value
    }

    // Use native structuredClone if available
    if (typeof structuredClone !== 'undefined') {
      try {
        return structuredClone(value)
      } catch {
        // fallback to manual cloning
      }
    }

    // Fast path: shallow copy (sufficient for most ORM cases)
    if (Array.isArray(value)) {
      return value.slice()
    }

    if (value instanceof Date) {
      return new Date(value.getTime())
    }

    if (value instanceof Map) {
      return new Map(value)
    }

    if (value instanceof Set) {
      return new Set(value)
    }

    // Plain object shallow copy
    return { ...value }
  }
}
