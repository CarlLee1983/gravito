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

export const jwt = ensure(honoJwt.jwt, 'jwt')
export const verify = ensure(honoJwt.verify, 'verify')
export const decode = ensure(honoJwt.decode, 'decode')
export const sign = ensure(honoJwt.sign, 'sign')
export const verifyWithJwks = ensure(honoJwt.verifyWithJwks, 'verifyWithJwks')

/**
 * Compatibility types for Hono v4
 */
export type JwtPayload = any // Fallback to any for now to avoid deep internal imports that might break
export type JwtHeader = any
export type JwtOptions = any
export type JwtFunction = (options: any) => MiddlewareHandler
