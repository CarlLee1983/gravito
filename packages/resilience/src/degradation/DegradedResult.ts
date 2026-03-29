/**
 * The result of an operation that may have fallen back to a degraded state.
 *
 * When `degraded` is `false`, `source` is always `'live'` and `value` comes from the primary fn.
 * When `degraded` is `true`, `source` is `'fallback'` and `value` comes from the registered fallback.
 *
 * @public
 */
export interface DegradedResult<T> {
  /** The value returned by the live or fallback operation. */
  value: T
  /** Whether the result came from a fallback (degraded path). */
  degraded: boolean
  /** Origin of the result: `'live'` for primary, `'fallback'` for fallback. */
  source: 'live' | 'fallback'
}
