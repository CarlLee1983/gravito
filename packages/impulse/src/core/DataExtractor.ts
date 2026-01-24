import type { Context } from '@gravito/core/compat'

/**
 * Data source for validation.
 *
 * @public
 * @since 3.0.0
 */
export type DataSource = 'json' | 'form' | 'query' | 'param'

/**
 * Extracts data from different sources in the request context.
 *
 * This class handles the complexity of extracting data from various
 * sources like JSON body, form data, query parameters, or route parameters.
 * It provides a unified interface for data extraction regardless of source.
 *
 * @public
 * @since 3.0.0
 */
export class DataExtractor {
  /**
   * Extract raw data from context based on the specified source.
   *
   * @param ctx - The request context.
   * @param source - The data source to extract from.
   * @returns A promise that resolves to the raw data object.
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
