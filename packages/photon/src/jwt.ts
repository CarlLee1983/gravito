import type { MiddlewareHandler } from 'hono'
import type * as HonoJwt from 'hono/jwt'

/**
 * Supported JWT signature algorithms
 */
export type SignatureAlgorithm =
  | 'HS256'
  | 'HS384'
  | 'HS512'
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'PS256'
  | 'PS384'
  | 'PS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'EdDSA'

/**
 * JWT Payload type - matches Hono's JWTPayload
 * Contains standard JWT claims plus any custom data
 */
export interface JwtPayload {
  /** Issuer */
  iss?: string
  /** Subject */
  sub?: string
  /** Audience */
  aud?: string | string[]
  /** Expiration time (Unix timestamp) */
  exp?: number
  /** Not before (Unix timestamp) */
  nbf?: number
  /** Issued at (Unix timestamp) */
  iat?: number
  /** JWT ID */
  jti?: string
  /** Custom claims */
  [key: string]: unknown
}

/**
 * JWT Header type
 */
export interface JwtHeader {
  /** Algorithm used for signing */
  alg: SignatureAlgorithm
  /** Type (usually 'JWT') */
  typ?: string
  /** Key ID */
  kid?: string
}

/**
 * JWT Middleware options
 */
export interface JwtOptions {
  /** Secret key for HMAC algorithms or public key for RSA/ECDSA */
  secret: string | BufferSource
  /** Algorithm to use (default: HS256) */
  alg?: SignatureAlgorithm
  /** Cookie name to read JWT from (optional) */
  cookie?: string
}

/**
 * JWT Middleware function type
 */
export type JwtFunction = (options: JwtOptions) => MiddlewareHandler

// Bun can require hono/jwt but ESM import may fail; proxy via require for runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const honoJwt = require('hono/jwt') as Partial<typeof HonoJwt>

/**
 * Ensures a JWT helper function is available at runtime.
 * Throws a descriptive error if the function is not available.
 */
const ensure = <T extends (...args: never[]) => unknown>(fn: T | undefined, name: string): T => {
  if (!fn) {
    throw new Error(`hono/jwt helper '${name}' is not available`)
  }
  return fn
}

/**
 * JWT middleware for protecting routes
 * @see https://hono.dev/middleware/builtin/jwt
 */
export const jwt = ensure(honoJwt.jwt, 'jwt')

/**
 * Verify a JWT token
 * @see https://hono.dev/helpers/jwt#verify
 */
export const verify = ensure(honoJwt.verify, 'verify')

/**
 * Decode a JWT token without verifying
 * @see https://hono.dev/helpers/jwt#decode
 */
export const decode = ensure(honoJwt.decode, 'decode')

/**
 * Sign a payload to create a JWT token
 * @see https://hono.dev/helpers/jwt#sign
 */
export const sign = ensure(honoJwt.sign, 'sign')

/**
 * Verify JWT using JWKS (JSON Web Key Set)
 * @see https://hono.dev/helpers/jwt#verifywtihjwks
 */
export const verifyWithJwks = ensure(honoJwt.verifyWithJwks, 'verifyWithJwks')
