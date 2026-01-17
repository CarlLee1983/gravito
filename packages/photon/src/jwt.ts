import type { MiddlewareHandler } from 'hono'
import type * as HonoJwt from 'hono/jwt'

// Bun can require hono/jwt but ESM import may fail; proxy via require for runtime.
const honoJwt = require('hono/jwt') as Partial<typeof HonoJwt>

const ensure =
  <T extends (...args: any[]) => any>(fn: T | undefined, _name: string) =>
  (...args: Parameters<T>): ReturnType<T> => {
    if (!fn) {
      throw new Error(`hono/jwt helper '\${name}' is not available`)
    }
    return fn(...args)
  }

/**
 * JWT Middleware.
 * @public
 */
export const jwt = ensure(honoJwt.jwt, 'jwt')

/**
 * Verify JWT token.
 * @public
 */
export const verify = ensure(honoJwt.verify, 'verify')

/**
 * Decode JWT token without verification.
 * @public
 */
export const decode = ensure(honoJwt.decode, 'decode')

/**
 * Sign payload to create JWT token.
 * @public
 */
export const sign = ensure(honoJwt.sign, 'sign')

/**
 * Verify JWT token using JWKS.
 * @public
 */
export const verifyWithJwks = ensure(honoJwt.verifyWithJwks, 'verifyWithJwks')

/**
 * JWT Payload typecompatibility.
 * @public
 */
export type JwtPayload = any // Fallback to any for now to avoid deep internal imports that might break
/**
 * JWT Header type compatibility.
 * @public
 */
export type JwtHeader = any

/**
 * JWT Options type compatibility.
 * @public
 */
export type JwtOptions = any

/**
 * JWT Middleware function type compatibility.
 * @public
 */
export type JwtFunction = (options: any) => MiddlewareHandler
