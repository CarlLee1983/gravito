import type { MiddlewareHandler } from '@gravito/photon'

export const authMiddleware: MiddlewareHandler = async (_c, next) => {
  // TODO: Implement middleware logic
  await next()
}
