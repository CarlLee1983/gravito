import type { Context } from '@gravito/core/compat'

/**
 * Request Data Source Type
 *
 * Defines from which parts of the request a FormRequest can extract data for validation.
 * Each source type corresponds to a different part of the request, suitable for different API design patterns.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * // JSON request body - Suitable for POST/PUT/PATCH APIs
 * source: DataSource = 'json'
 *
 * // Form data - Suitable for file uploads or traditional HTML forms
 * source: DataSource = 'form'
 *
 * // URL query parameters - Suitable for GET request filtering and pagination
 * source: DataSource = 'query'
 *
 * // Route parameters - Suitable for validating resource IDs in the URL
 * source: DataSource = 'param'
 * ```
 */
export type DataSource = 'json' | 'form' | 'query' | 'param'

/**
 * Request Data Extractor
 *
 * Encapsulates the complex logic of extracting data from different request sources, providing a unified interface.
 * Handles various edge cases such as empty request bodies, malformed JSON, and flattening of array query parameters.
 *
 * Design Considerations:
 * - **Error Tolerance**: Returns an empty object instead of throwing an error when parsing fails, leaving it to the validator to handle.
 * - **Performance Optimization**: Caches the JSON request body to avoid redundant parsing.
 * - **Type Safety**: Although it returns `unknown`, it provides a foundation for subsequent schema validation.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const extractor = new DataExtractor()
 *
 * // Extract JSON request body
 * const jsonData = await extractor.extract(ctx, 'json')
 *
 * // Extract query parameters
 * const queryData = await extractor.extract(ctx, 'query')
 * ```
 */
export class DataExtractor {
  /**
   * Extract raw data from a specified source
   *
   * Determines the extraction strategy based on the `source` parameter:
   * - `json`: Parses the JSON request body (with caching and error handling)
   * - `form`: Parses FormData and converts it into a plain object
   * - `query`: Parses URL query parameters (flattens single-element arrays)
   * - `param`: Extracts route parameters
   *
   * @param ctx - Gravito request context object
   * @param source - Data source type
   * @returns Raw data object; returns an empty object on parsing failure
   *
   * @example
   * ```typescript
   * // Extract from JSON body
   * const data = await extractor.extract(ctx, 'json')
   * // Might return: { name: "John", email: "john@example.com" }
   *
   * // Extract from query parameters
   * // URL: /users?page=1&limit=10&sort=name
   * const query = await extractor.extract(ctx, 'query')
   * // Returns: { page: "1", limit: "10", sort: "name" }
   * ```
   */
  public async extract(ctx: Context, source: DataSource): Promise<unknown> {
    switch (source) {
      case 'json': {
        const contentType = ctx.req.header('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          return {}
        }

        const cached = ctx.get('__parsedBody')
        if (cached !== undefined) {
          return cached
        }

        const body = await ctx.req.json().catch(() => ({}))
        ctx.set('__parsedBody', body)
        return body
      }
      case 'form': {
        const fd = await ctx.req.formData().catch(() => null)
        if (!fd) {
          return {}
        }
        const obj: Record<string, unknown> = {}
        fd.forEach((value, key) => {
          obj[key] = value
        })
        return obj
      }
      case 'query': {
        const queries = ctx.req.queries()
        const flattened: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(queries)) {
          if (Array.isArray(value) && value.length === 1) {
            flattened[key] = value[0]
          } else {
            flattened[key] = value
          }
        }
        return flattened
      }
      case 'param': {
        // Try standard Gravito/Hono param accessor
        if (typeof ctx.req.param === 'function') {
          // In some Hono versions, param() returns all params if no key provided
          // or we might need to check if params() exists (Gravito extension)
          const params = (ctx.req as any).param()
          if (typeof params === 'object') return params
        }
        if (typeof (ctx.req as any).params === 'function') {
          return (ctx.req as any).params()
        }
        return {}
      }
      default:
        return {}
    }
  }
}
