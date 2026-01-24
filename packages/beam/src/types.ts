/**
 * Options for the Beam (RPC) client.
 *
 * Orbit Beam uses these options to configure the underlying HTTP client.
 * It extends the standard fetch RequestInit but adds framework-specific
 * features like dynamic header resolution.
 *
 * @public
 */
export interface BeamOptions extends Omit<RequestInit, 'headers'> {
  /**
   * Custom headers to include in every request.
   *
   * Can be either:
   * - A static object: `Record<string, string>`
   * - A resolver function: `() => Record<string, string> | Promise<Record<string, string>>`
   *
   * The resolver function is useful for dynamic headers like authentication tokens
   * that may need to be refreshed or retrieved from a store.
   *
   * @example
   * ```typescript
   * headers: { 'X-Custom': 'value' }
   * ```
   *
   * @example
   * ```typescript
   * headers: () => ({ 'Authorization': `Bearer ${getToken()}` })
   * ```
   */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
}
