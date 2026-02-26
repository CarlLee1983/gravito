import type { MiddlewareHandler } from 'hono'
/**
 * JWT Authentication Middleware.
 *
 * Protects routes by requiring a valid JSON Web Token in the request.
 * It automatically extracts the token from the Authorization header (Bearer scheme)
 * and validates it against the provided secret or public key.
 *
 * @remarks
 * This middleware is the primary way to secure Photon routes. It integrates
 * with Hono's JWT implementation but is optimized for the Gravito ecosystem.
 *
 * @param options - Configuration for JWT validation including secret, alg, and cookie name.
 * @returns A Hono middleware handler.
 * @throws {Error} If the `hono/jwt` helper is not available in the current environment.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { jwt } from '@gravito/photon/jwt'
 *
 * const app = new Photon()
 *
 * // Protect all routes under /api/private
 * app.use('/api/private/*', jwt({ secret: 'your-secure-secret' }))
 *
 * app.get('/api/private/profile', (c) => {
 *   const payload = c.get('jwtPayload')
 *   return c.json({ user: payload.sub })
 * })
 * ```
 * @public
 */
export declare const jwt: (options: {
  secret: import('hono/utils/jwt/jws').SignatureKey
  cookie?:
    | string
    | {
        key: string
        secret?: string | BufferSource
        prefixOptions?: import('hono/utils/cookie').CookiePrefixOptions
      }
  alg: import('hono/utils/jwt/jwa').SignatureAlgorithm
  headerName?: string
  verification?: import('hono/utils/jwt/jwt').VerifyOptions
}) => MiddlewareHandler
/**
 * Verify a JWT token's signature and expiration.
 *
 * Ensures the token is authentic and has not expired using the provided secret or key.
 * This is the primary way to manually validate tokens outside of middleware.
 *
 * @remarks
 * Use this function when you need to manually verify a token, such as in
 * WebSocket connections or custom authentication flows.
 *
 * @param token - The JWT string to verify.
 * @param secret - The secret key or public key for signature verification.
 * @param alg - The expected signing algorithm (e.g., 'HS256', 'RS256').
 * @returns The decoded and verified payload.
 * @throws {Error} If the token is invalid, expired, or signature verification fails.
 *
 * @example
 * ```typescript
 * import { verify } from '@gravito/photon/jwt'
 *
 * try {
 *   const payload = await verify(token, 'my-secret')
 *   console.log('Valid token for user:', payload.sub)
 * } catch (e) {
 *   console.error('Invalid token:', e.message)
 * }
 * ```
 * @public
 */
export declare const verify: (
  token: string,
  publicKey: import('hono/utils/jwt/jws').SignatureKey,
  algOrOptions:
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
    | import('hono/utils/jwt/jwt').VerifyOptionsWithAlg
) => Promise<import('hono/utils/jwt/types').JWTPayload>
/**
 * Decode a JWT token without verifying its signature.
 *
 * Useful for inspecting payload data (like `exp` or `sub`) before verification.
 *
 * @remarks
 * This function is useful for debugging or for extracting information from
 * a token before deciding how to verify it.
 *
 * @warning This does NOT validate the token. Never trust the data returned
 * by this function for security-critical decisions without subsequent verification.
 *
 * @param token - The JWT string to decode.
 * @returns The decoded header and payload.
 * @throws {Error} If the token format is malformed.
 *
 * @example
 * ```typescript
 * import { decode } from '@gravito/photon/jwt'
 *
 * const { header, payload } = decode(token)
 * console.log('Token algorithm:', header.alg)
 * console.log('User ID:', payload.sub)
 * ```
 * @public
 */
export declare const decode: (token: string) => {
  header: import('hono/utils/jwt/jwt').TokenHeader
  payload: import('hono/utils/jwt/types').JWTPayload
}
/**
 * Sign a payload to create a new JWT token.
 *
 * Generates a cryptographically signed string containing the provided claims.
 *
 * @remarks
 * Use this function to issue new tokens after a successful login or for
 * inter-service communication.
 *
 * @param payload - The data to include in the token.
 * @param secret - The secret key or private key for signing.
 * @param alg - The signing algorithm to use (default: 'HS256').
 * @returns A signed JWT string.
 * @throws {Error} If signing fails due to invalid keys or unsupported algorithms.
 *
 * @example
 * ```typescript
 * import { sign } from '@gravito/photon/jwt'
 *
 * const token = await sign(
 *   { sub: 'user_123', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 },
 *   'my-secret'
 * )
 * ```
 * @public
 */
export declare const sign: (
  payload: import('hono/utils/jwt/types').JWTPayload,
  privateKey: import('hono/utils/jwt/jws').SignatureKey,
  alg?:
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
) => Promise<string>
/**
 * Verify a JWT token using a JSON Web Key Set (JWKS).
 *
 * Ideal for verifying tokens issued by OIDC providers (like Auth0, AWS Cognito, or Google)
 * where public keys are rotated and published at a JWKS endpoint.
 *
 * @remarks
 * This function automatically handles key rotation by fetching the latest
 * public keys from the specified JWKS URI.
 *
 * @param token - The JWT string to verify.
 * @param options - JWKS configuration including the JWKS URI.
 * @returns The verified payload.
 * @throws {Error} If the JWKS cannot be fetched or the token fails verification.
 *
 * @example
 * ```typescript
 * import { verifyWithJwks } from '@gravito/photon/jwt'
 *
 * const payload = await verifyWithJwks(token, {
 *   jwksUri: 'https://example.com/.well-known/jwks.json'
 * })
 * ```
 * @public
 */
export declare const verifyWithJwks: (
  token: string,
  options: {
    keys?: import('hono/utils/jwt/jws').HonoJsonWebKey[]
    jwks_uri?: string
    verification?: import('hono/utils/jwt/jwt').VerifyOptions
    allowedAlgorithms: readonly import('hono/utils/jwt/jwa').AsymmetricAlgorithm[]
  },
  init?: RequestInit
) => Promise<import('hono/utils/jwt/types').JWTPayload>
/**
 * JWT Payload type compatibility.
 * @public
 */
export type JwtPayload = Record<string, unknown>
/**
 * JWT Header type compatibility.
 * @public
 */
export type JwtHeader = Record<string, unknown>
/**
 * JWT Options type compatibility.
 * @public
 */
export type JwtOptions = {
  secret: string | Buffer
  cookie?: string
  alg?: string
  [key: string]: unknown
}
/**
 * JWT Middleware function type compatibility.
 * @public
 */
export type JwtFunction = (options: JwtOptions) => MiddlewareHandler
