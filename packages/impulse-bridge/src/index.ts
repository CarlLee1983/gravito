import type { GravitoContext } from '@gravito/core'
import type { FormRequest } from '@gravito/impulse'

/**
 * Impulse Bridge
 *
 * Provides utilities to synchronize backend validation rules with the frontend.
 */
export const ImpulseBridge = {
  /**
   * Share a FormRequest blueprint with the frontend (via Inertia).
   *
   * @example
   * async show(ctx: Context) {
   *   ImpulseBridge.share(ctx, 'login', LoginFormRequest)
   *   return ctx.inertia('Login')
   * }
   */
  share(ctx: GravitoContext, key: string, RequestClass: new () => FormRequest) {
    const request = new RequestClass() as any
    const blueprint = request.getBlueprint()

    // 1. Try to inject into InertiaService if it exists (@gravito/ion)
    const inertia = ctx.get('inertia') as any
    if (inertia && typeof inertia.share === 'function') {
      const currentBlueprints = (inertia.getSharedProps?.().blueprints as any) || {}
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
 * Global middleware to automatically inject blueprints if requested.
 */
export function impulseBridgeMiddleware(blueprints: Record<string, new () => FormRequest>) {
  return async (ctx: GravitoContext, next: () => Promise<Response | undefined>) => {
    for (const [key, RequestClass] of Object.entries(blueprints)) {
      ImpulseBridge.share(ctx, key, RequestClass)
    }
    return await next()
  }
}
