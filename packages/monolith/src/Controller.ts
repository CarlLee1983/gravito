import type { Context } from 'gravito-core'

export abstract class Controller {
  protected context!: Context

  /**
   * Set the request context for this controller instance.
   * This is usually called by the router adapter.
   */
  public setContext(context: Context): this {
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
  protected get<T>(key: string): T {
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
   * Throws an exception or returns the validated data.
   */
  protected async validate<T>(
    _schema: any,
    source: 'json' | 'query' | 'form' = 'json'
  ): Promise<T> {
    // In our framework, manual validation inside controller is an alternative
    // but we prefer FormRequest middleware for cleaner DX.
    // This is a placeholder for future internal validation logic.
    return (this.context.req as any).valid(source) as T
  }

  /**
   * Resolve a controller action into a Hono-compatible handler.
   */
  public static call<T extends Controller>(this: new () => T, method: keyof T): any {
    return async (c: any) => {
      const instance = new this()
      instance.setContext(c)
      const action = instance[method] as unknown as Function
      return action.apply(instance)
    }
  }
}
