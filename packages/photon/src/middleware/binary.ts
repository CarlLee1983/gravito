import type { MiddlewareHandler } from '@gravito/photon'
import { encode } from 'cborg'

/**
 * Binary Middleware for Photon
 *
 * Automatically detects 'Accept: application/cbor' and encodes
 * JSON responses using the CBOR binary format for high-performance communication.
 */
export const binaryMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    await next()

    const accept = c.req.header('Accept')
    if (accept === 'application/cbor') {
      // If the response is already a Response object and looks like JSON
      const contentType = c.res.headers.get('Content-Type')
      if (contentType?.includes('application/json')) {
        const body = await c.res.clone().json()
        const encoded = encode(body)

        // Replace response with CBOR
        c.res = new Response(encoded as any, {
          status: c.res.status,
          headers: new Headers(c.res.headers),
        })
        c.res.headers.set('Content-Type', 'application/cbor')
      }
    }
  }
}
