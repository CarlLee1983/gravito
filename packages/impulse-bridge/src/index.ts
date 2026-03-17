import type { GravitoContext } from '@gravito/core'
import type { FormRequest } from '@gravito/impulse'

/**
 * ImpulseBridge facilitates the synchronization of backend validation rules
 * and form blueprints with frontend frameworks (primarily via Inertia.js).
 *
 * It allows you to "share" a FormRequest structure so that frontend
 * components can automatically perform client-side validation using the
 * same rules defined on the server.
 *
 * @public
 */
export const ImpulseBridge = {
  /**
   * Serializes a FormRequest class and shares its blueprint with the frontend.
   *
   * @param ctx - The Gravito request context.
   * @param key - The unique identifier for this form blueprint on the frontend.
   * @param RequestClass - The FormRequest class (not instance) to share.
   *
   * @example
   * ```typescript
   * async show(ctx: Context) {
   *   ImpulseBridge.share(ctx, 'register', RegistrationRequest);
   *   return ctx.inertia('Auth/Register');
   * }
   * ```
   */
  share(ctx: GravitoContext, key: string, RequestClass: new () => FormRequest) {
    const request = new RequestClass() as any
    const blueprint = request.getBlueprint()

    // 1. Try to inject into InertiaService if it exists (@gravito/ion)
    const inertia = ctx.get('inertia') as any
    if (inertia && typeof inertia.share === 'function') {
      const currentSharedProps = inertia.getSharedProps?.() ?? {}
      const currentBlueprints = currentSharedProps.blueprints ?? {}
      currentBlueprints[key] = blueprint
      inertia.share('blueprints', currentBlueprints)
      return
    }

    // 2. Fallback to generic shared state
    const shared: any = ctx.get('inertiaShared') || {}
    shared.blueprints = shared.blueprints || {}
    shared.blueprints[key] = blueprint

    ctx.set('inertiaShared', shared)
  },
}

/**
 * Middleware that automatically shares a set of FormRequest blueprints
 * with every request matched by the router.
 *
 * @param blueprints - A map of key-to-FormRequestClass pairs.
 * @public
 */
export function impulseBridgeMiddleware(blueprints: Record<string, new () => FormRequest>) {
  return async (ctx: GravitoContext, next: () => Promise<Response | undefined>) => {
    for (const [key, RequestClass] of Object.entries(blueprints)) {
      ImpulseBridge.share(ctx, key, RequestClass)
    }
    return await next()
  }
}
