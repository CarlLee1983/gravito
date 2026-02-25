/**
 * Deep equality comparison abstraction.
 *
 * Provides unified deep equality checking across Bun, Node.js, and Deno runtimes.
 * Uses Bun.deepEquals() when available, falls back to recursive comparison.
 *
 * @module runtime/deep-equals
 * @since 3.2.0
 */

import { getRuntimeKind } from './detection'

/**
 * Options for deep equality comparison.
 * @public
 */
export interface DeepEqualsOptions {
  /**
   * When true, uses strict equality semantics:
   * - NaN !== NaN
   * - +0 !== -0
   *
   * When false (default), uses lenient semantics:
   * - NaN === NaN
   * - +0 === -0
   */
  strict?: boolean
}

/**
 * Function signature for deep equality comparison.
 * @public
 */
export type DeepEqualsFn = (a: unknown, b: unknown, options?: DeepEqualsOptions) => boolean

/**
 * Creates a fallback deep equality function with cycle detection.
 *
 * Recursively compares objects, arrays, maps, sets, dates, and regexps.
 * Handles circular references using WeakSet tracking.
 *
 * @returns A deep equality comparison function.
 * @internal
 */
function createFallbackDeepEquals(): DeepEqualsFn {
  return (a: unknown, b: unknown, options?: DeepEqualsOptions): boolean => {
    const visited = new WeakSet<object>()
    return deepEqualInternal(a, b, visited, options?.strict ?? false)
  }
}

/**
 * Internal recursive deep equality comparison.
 * @internal
 */
function deepEqualInternal(
  a: unknown,
  b: unknown,
  visited: WeakSet<object>,
  strict: boolean
): boolean {
  // 淺比較
  if (a === b) {
    return true
  }

  // null / undefined 檢查
  if (a == null || b == null) {
    return a === b
  }

  // 型別檢查
  const typeA = typeof a
  const typeB = typeof b
  if (typeA !== typeB) {
    return false
  }

  // 非物件型別（除了 object）
  if (typeA !== 'object') {
    if (!strict) {
      // 非嚴格模式：NaN === NaN，+0 === -0
      if (Number.isNaN(a) && Number.isNaN(b)) {
        return true
      }
      return a === b
    }
    // 嚴格模式：使用 === （NaN !== NaN，+0 !== -0）
    return a === b
  }

  // Date 比較
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }
  if (a instanceof Date || b instanceof Date) {
    return false
  }

  // RegExp 比較
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags
  }
  if (a instanceof RegExp || b instanceof RegExp) {
    return false
  }

  // 循環引用偵測
  const aObj = a as object
  const bObj = b as object
  if (visited.has(aObj) || visited.has(bObj)) {
    return a === b
  }
  visited.add(aObj)
  visited.add(bObj)

  // Array 比較
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false
    }
    return a.every((val, idx) => deepEqualInternal(val, b[idx], visited, strict))
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return false
  }

  // Map 比較
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) {
      return false
    }
    for (const [key, val] of a) {
      if (!b.has(key) || !deepEqualInternal(val, b.get(key), visited, strict)) {
        return false
      }
    }
    return true
  }
  if (a instanceof Map || b instanceof Map) {
    return false
  }

  // Set 比較
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) {
      return false
    }
    const arrA = Array.from(a)
    const arrB = Array.from(b)
    return arrA.every((val) =>
      arrB.some((bVal) => deepEqualInternal(val, bVal, visited, strict))
    )
  }
  if (a instanceof Set || b instanceof Set) {
    return false
  }

  // 普通物件比較
  const keysA = Object.keys(a as object)
  const keysB = Object.keys(b as object)

  if (keysA.length !== keysB.length) {
    return false
  }

  return keysA.every((key) => {
    const valA = (a as Record<string, unknown>)[key]
    const valB = (b as Record<string, unknown>)[key]
    return deepEqualInternal(valA, valB, visited, strict)
  })
}

/**
 * Singleton cache for deep equals function.
 * @internal
 */
let deepEqualsFn: DeepEqualsFn | null = null

/**
 * Get the optimized deep equality comparison function for the current runtime.
 *
 * - **Bun**: Uses native Bun.deepEquals() for maximum performance (C++ optimized)
 * - **Node.js/Deno/Unknown**: Uses fallback recursive implementation with cycle detection
 *
 * Results are cached after first invocation for efficiency.
 *
 * @returns A function that performs deep equality comparison
 * @public
 *
 * @example
 * ```typescript
 * const deepEquals = getDeepEquals()
 *
 * const obj1 = { a: [1, 2], b: { c: 3 } }
 * const obj2 = { a: [1, 2], b: { c: 3 } }
 *
 * console.log(deepEquals(obj1, obj2)) // true
 *
 * // Strict mode for +0 / -0 and NaN
 * console.log(deepEquals(NaN, NaN)) // true (lenient)
 * console.log(deepEquals(NaN, NaN, { strict: true })) // false
 * ```
 */
export function getDeepEquals(): DeepEqualsFn {
  if (deepEqualsFn) {
    return deepEqualsFn
  }

  const kind = getRuntimeKind()
  if (kind === 'bun' && typeof Bun !== 'undefined') {
    deepEqualsFn = (a: unknown, b: unknown, options?: DeepEqualsOptions): boolean => {
      return Bun.deepEquals(a, b, options?.strict ?? false)
    }
    return deepEqualsFn
  }

  deepEqualsFn = createFallbackDeepEquals()
  return deepEqualsFn
}
