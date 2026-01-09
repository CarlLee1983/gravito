import type { GravitoContext } from '@gravito/core'
import { Sanitizer } from './Sanitizer.js'

export abstract class BaseController {
  protected sanitizer = new Sanitizer()

  async call(ctx: GravitoContext, method: string): Promise<Response> {
    const action = (this as any)[method] as (ctx: GravitoContext) => Promise<Response>
    if (typeof action !== 'function') {
      throw new Error(`Method ${method} not found on controller`)
    }

    return await action.apply(this, [ctx])
  }
}

export abstract class Controller {
  protected context!: GravitoContext

  /**
   * Set the request context for this controller instance.
   */
  public setContext(context: GravitoContext): this {
    this.context = context
    return this
  }

  /**
   * Return a JSON response.
   */
  protected json(data: any, status = 200) {
    return this.context.json(data, status as any)
  }

  /**
   * Return a text response.
   */
  protected text(text: string, status = 200) {
    return this.context.text(text, status as any)
  }

  /**
   * Redirect to a given URL.
   */
  protected redirect(url: string, status = 302) {
    return this.context.redirect(url, status as any)
  }

  /**
   * Get an item from the context variables.
   */
  protected get(key: string): any {
    return this.context.get(key as any)
  }

  /**
   * Get the request object.
   */
  protected get request() {
    return this.context.req
  }

  /**
   * Validate the request against a schema.
   */
  protected async validate(_schema: any, source: 'json' | 'query' | 'form' = 'json'): Promise<any> {
    const req = this.context.req as any
    return req.valid(source)
  }

  /**
   * Resolve a controller action into a handler compatible with GravitoContext.
   */
  public static call(method: string): any {
    return async (c: GravitoContext) => {
      const instance = new (this as any)()
      instance.setContext(c)
      const action = instance[method] as (ctx: GravitoContext) => Promise<Response>
      return action.apply(instance, [c])
    }
  }
}
