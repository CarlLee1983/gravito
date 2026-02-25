/**
 * Dirty Tracker for monitoring attribute modifications on model instances.
 *
 * Maintains a snapshot of original values and tracks which keys have been
 * changed. Supports optimized structural comparison and deep change detection
 * for complex objects.
 *
 * @template T - The shape of the model attributes.
 */

import { getDeepEquals } from '@gravito/core'

export class DirtyTracker<T extends Record<string, unknown>> {
  /**
   * Stores the initial values as retrieved from the database.
   */
  private original: Map<keyof T, unknown> = new Map()

  /**
   * Tracks keys that differ from their original state.
   */
  private dirty: Set<keyof T> = new Set()

  /**
   * When enabled, nested objects are compared recursively.
   */
  private useDeepComparison = false

  /**
   * Configures the comparison strategy for nested structures.
   *
   * @param enabled - True to enable recursive comparison.
   */
  setDeepComparison(enabled: boolean): void {
    this.useDeepComparison = enabled
  }

  /**
   * Records initial state and clears the dirty set.
   *
   * Called typically during hydration or after a successful save.
   *
   * @param data - The baseline values.
   */
  setOriginal(data: Partial<T>): void {
    this.original.clear()
    this.dirty.clear()
    for (const [key, value] of Object.entries(data)) {
      this.original.set(key as keyof T, this.cloneValue(value))
    }
  }

  /**
   * Checks for changes and updates the dirty set accordingly.
   *
   * Compares the new value against the original. If they match, the key
   * is removed from the dirty set (reversion).
   *
   * @param key - The attribute name.
   * @param newValue - The proposed new value.
   */
  mark(key: keyof T, newValue: unknown): void {
    const original = this.original.get(key)

    if (!this.isEqual(original, newValue)) {
      this.dirty.add(key)
    } else {
      this.dirty.delete(key)
    }
  }

  /**
   * Indicates if any attributes or a specific attribute has been modified.
   *
   * @param key - Optional specific attribute to check.
   * @returns True if changes are detected.
   */
  isDirty(key?: keyof T): boolean {
    if (key) {
      return this.dirty.has(key)
    }
    return this.dirty.size > 0
  }

  /**
   * Returns a list of all modified attribute names.
   */
  getDirty(): Array<keyof T> {
    return Array.from(this.dirty)
  }

  /**
   * Extracts current values for all dirty attributes.
   *
   * @param current - The source object containing all current values.
   * @returns An object with only the modified entries.
   */
  getDirtyValues(current: Partial<T>): Partial<T> {
    const result: Partial<T> = {}
    for (const key of this.dirty) {
      result[key] = current[key]
    }
    return result
  }

  /**
   * Retrieves the original value of an attribute from the snapshot.
   */
  getOriginal(key: keyof T): unknown {
    return this.original.get(key)
  }

  /**
   * Retrieves the complete original snapshot.
   */
  getOriginals(): Partial<T> {
    const result: Partial<T> = {}
    for (const [key, value] of this.original) {
      result[key] = value as T[keyof T]
    }
    return result
  }

  /**
   * Synchronizes the snapshot with the current state.
   *
   * @param data - The new baseline data.
   */
  sync(data: Partial<T>): void {
    this.setOriginal(data)
  }

  /**
   * Reverts the dirty flag for a specific attribute.
   */
  reset(key: keyof T): void {
    this.dirty.delete(key)
  }

  /**
   * Clears all tracking information.
   */
  resetAll(): void {
    this.dirty.clear()
  }

  /**
   * Compares two values for equality using optimized structural comparison.
   *
   * Performs shallow comparison by default. When deep comparison is enabled,
   * uses the optimized deep equality adapter from the runtime abstraction layer.
   *
   * @param a - First value.
   * @param b - Second value.
   * @returns True if equal.
   * @internal
   */
  private isEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true
    }

    if (a instanceof Date) {
      return b instanceof Date && a.getTime() === b.getTime()
    }
    if (b instanceof Date) {
      return false
    }

    if (a == null || b == null) {
      return a === b
    }

    const typeA = typeof a
    const typeB = typeof b
    if (typeA !== typeB) {
      return false
    }

    if (typeA !== 'object') {
      return false
    }

    if (a instanceof RegExp && b instanceof RegExp) {
      return a.source === b.source && a.flags === b.flags
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false
      }
      if (this.useDeepComparison) {
        const deepEquals = getDeepEquals()
        return a.every((val, idx) => deepEquals(val, b[idx]))
      }
      return a.every((val, idx) => val === b[idx])
    }

    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) {
        return false
      }
      if (this.useDeepComparison) {
        const deepEquals = getDeepEquals()
        for (const [key, val] of a) {
          if (!b.has(key) || !deepEquals(val, b.get(key))) {
            return false
          }
        }
        return true
      }
      for (const [key, val] of a) {
        if (!b.has(key) || val !== b.get(key)) {
          return false
        }
      }
      return true
    }

    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) {
        return false
      }
      if (this.useDeepComparison) {
        const deepEquals = getDeepEquals()
        const arrA = Array.from(a)
        const arrB = Array.from(b)
        return arrA.every((val) => arrB.some((bVal) => deepEquals(val, bVal)))
      }
      for (const val of a) {
        if (!b.has(val)) {
          return false
        }
      }
      return true
    }

    const keysA = Object.keys(a as object)
    const keysB = Object.keys(b as object)

    if (keysA.length !== keysB.length) {
      return false
    }

    if (this.useDeepComparison) {
      const deepEquals = getDeepEquals()
      return keysA.every((key) => {
        const valA = (a as Record<string, unknown>)[key]
        const valB = (b as Record<string, unknown>)[key]
        return deepEquals(valA, valB)
      })
    }

    return keysA.every((key) => {
      const valA = (a as Record<string, unknown>)[key]
      const valB = (b as Record<string, unknown>)[key]
      return valA === valB
    })
  }

  /**
   * Clones a value to ensure the original snapshot remains immutable.
   *
   * @param value - Value to clone.
   * @internal
   */
  private cloneValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value
    }
    if (typeof value !== 'object') {
      return value
    }

    if (value instanceof Date) {
      return new Date(value.getTime())
    }

    if (value instanceof RegExp) {
      return new RegExp(value.source, value.flags)
    }

    if (this.useDeepComparison) {
      return this.deepClone(value)
    }

    if (Array.isArray(value)) {
      return value.slice()
    }

    if (value instanceof Map) {
      return new Map(value)
    }

    if (value instanceof Set) {
      return new Set(value)
    }

    return { ...value }
  }

  /**
   * Performs recursive deep cloning.
   * @internal
   */
  private deepClone(value: unknown, visited: WeakMap<object, unknown> = new WeakMap()): unknown {
    if (value === null || value === undefined || typeof value !== 'object') {
      return value
    }

    if (visited.has(value as object)) {
      return visited.get(value as object)
    }

    if (value instanceof Date) {
      const cloned = new Date(value.getTime())
      visited.set(value, cloned)
      return cloned
    }

    if (value instanceof RegExp) {
      const cloned = new RegExp(value.source, value.flags)
      visited.set(value, cloned)
      return cloned
    }

    if (Array.isArray(value)) {
      const cloned: unknown[] = []
      visited.set(value, cloned)
      for (const item of value) {
        cloned.push(this.deepClone(item, visited))
      }
      return cloned
    }

    if (value instanceof Map) {
      const cloned = new Map()
      visited.set(value, cloned)
      for (const [key, val] of value) {
        cloned.set(this.deepClone(key, visited), this.deepClone(val, visited))
      }
      return cloned
    }

    if (value instanceof Set) {
      const cloned = new Set()
      visited.set(value, cloned)
      for (const item of value) {
        cloned.add(this.deepClone(item, visited))
      }
      return cloned
    }

    const cloned: Record<string, unknown> = {}
    visited.set(value, cloned)
    for (const [key, val] of Object.entries(value)) {
      cloned[key] = this.deepClone(val, visited)
    }
    return cloned
  }
}
