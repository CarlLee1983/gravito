/**
 * Deep equality comparison abstraction.
 *
 * Provides unified deep equality checking across Bun, Node.js, and Deno runtimes.
 * Uses Bun.deepEquals() when available, falls back to recursive comparison.
 *
 * @module runtime/deep-equals
 * @since 3.2.0
 */
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
export declare function getDeepEquals(): DeepEqualsFn
