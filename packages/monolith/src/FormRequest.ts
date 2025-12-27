import { type TSchema, validate } from '@gravito/mass'
import type { Context } from 'gravito-core'
import { Sanitizer } from './Sanitizer'

export abstract class FormRequest {
  protected context!: Context

  /**
   * Define the validation schema.
   */
  abstract schema(): TSchema

  /**
   * Define the source of data (json, query, form, etc.).
   */
  source(): 'json' | 'query' | 'form' {
    return 'json'
  }

  /**
   * Determine if the user is authorized to make this request.
   */
  authorize(): boolean {
    return true
  }

  /**
   * Set the context.
   */
  public setContext(context: Context): this {
    this.context = context
    return this
  }

  /**
   * Get the validated data.
   */
  public validated(): any {
    // In Hono, validated data is stored in the request
    const data = (this.context.req as any).valid(this.source())

    return Sanitizer.clean(data)
  }

  /**
   * Static helper to create a Hono middleware from this request class.
   */
  public static middleware(): any {
    const RequestClass = this as any
    const instance = new RequestClass()

    return async (c: any, next: any) => {
      instance.setContext(c)

      // 1. Authorization Check
      if (!instance.authorize()) {
        return c.json({ message: 'This action is unauthorized.' }, 403)
      }

      // 2. Validation
      const validator = validate(instance.source(), instance.schema(), (result: any, c: any) => {
        if (!result.success) {
          // Format errors to be user-friendly (Laravel style)
          const errors: Record<string, string[]> = {}

          // Hono TypeBox validator failure result.error is often an Iterable
          // or has an 'issues' array (StandardSchema)
          const issues =
            result.error?.issues ||
            (typeof result.error?.Errors === 'function'
              ? Array.from(result.error.Errors())
              : Array.from(result.error || []))

          if (issues && issues.length > 0) {
            for (const issue of issues as any[]) {
              // StandardSchema 'path' is array, TypeBox 'path' is string
              const path = Array.isArray(issue.path) ? issue.path.join('.') : issue.path || ''
              const key = path.replace(/^\//, '').replace(/\//g, '.') || 'root'
              if (!errors[key]) {
                errors[key] = []
              }
              errors[key].push(issue.message || 'Validation failed')
            }
          }

          return c.json(
            {
              message: 'The given data was invalid.',
              errors: Object.keys(errors).length > 0 ? errors : { root: ['Validation failed'] },
            },
            422
          )
        }
      })

      return validator(c, next)
    }
  }
}
