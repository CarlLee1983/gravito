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
      case 'json':
        return ctx.req.json().catch(() => ({}))
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
      case 'param':
        return ctx.req.params()
      default:
        return {}
    }
  }
}
