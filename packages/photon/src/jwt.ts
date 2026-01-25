import type { MiddlewareHandler } from 'hono'
import type * as HonoJwt from 'hono/jwt'

/**
 * Ensures Hono JWT helper availability at runtime.
 *
 * This wrapper addresses Bun's ESM/CommonJS interoperability challenges where `hono/jwt`
 * can be required via CommonJS but may fail with ESM imports. By proxying through `require()`,
 * we guarantee runtime availability while maintaining type safety.
 *
 * @param fn - The Hono JWT function to wrap
 * @param _name - Function name for error messages
 * @returns Wrapped function that throws descriptive error if unavailable
 * @throws {Error} When the wrapped Hono JWT function is not available at runtime
 *
 * @internal
 */
const ensure =
  <T extends (...args: any[]) => any>(fn: T | undefined, _name: string) =>
  (...args: Parameters<T>): ReturnType<T> => {
    if (!fn) {
      throw new Error(`hono/jwt helper '${name}' is not available`)
    }
    return fn(...args)
  }

/**
 * Bun-compatible proxy to Hono's JWT utilities.
 *
 * Uses CommonJS `require()` to work around Bun's ESM import limitations for `hono/jwt`.
 * This ensures all JWT utilities are available at runtime regardless of Bun version quirks.
 *
 * @internal
 */
const honoJwt = require('hono/jwt') as Partial<typeof HonoJwt>

/**
 * JWT authentication middleware for protecting routes.
 *
 * Validates JWT tokens from the `Authorization` header and makes the decoded payload
 * available via `c.get('jwtPayload')`. Automatically returns 401 Unauthorized for
 * invalid or missing tokens.
 *
 * **Use Cases:**
 * - Protecting API endpoints requiring user authentication
 * - Role-based access control in Gravito Satellites
 * - Session management without server-side storage
 *
 * @param options - JWT verification options including secret, algorithm, and custom validation
 * @returns Middleware handler that validates JWT tokens
 * @throws {Error} When Hono JWT middleware is not available at runtime
 *
 * @example
 * Basic authentication with secret
 * ```typescript
 * import { Photon, jwt } from '@gravito/photon'
 *
 * const app = new Photon()
 *
 * app.use('/api/*', jwt({ secret: 'your-secret-key' }))
 *
 * app.get('/api/profile', (c) => {
 *   const payload = c.get('jwtPayload')
 *   return c.json({ userId: payload.sub })
 * })
 * ```
 *
 * @example
 * Custom algorithm and validation
 * ```typescript
 * app.use('/admin/*', jwt({
 *   secret: process.env.JWT_SECRET!,
 *   alg: 'HS256',
 *   cookie: 'auth_token' // Read from cookie instead of header
 * }))
 * ```
 *
 * @public
 */
export const jwt = ensure(honoJwt.jwt, 'jwt')

/**
 * Verifies a JWT token string and returns the decoded payload.
 *
 * Performs cryptographic signature verification using the provided secret or public key.
 * Unlike `decode()`, this ensures the token is authentic and has not been tampered with.
 *
 * **Use Cases:**
 * - Manual token validation outside middleware context
 * - Validating tokens from custom headers or query parameters
 * - Server-to-server authentication
 *
 * @param token - The JWT token string to verify
 * @param secret - Secret key or public key for verification
 * @param alg - Algorithm used to sign the token (default: 'HS256')
 * @returns Decoded and verified JWT payload
 * @throws {Error} When token signature is invalid, expired, or malformed
 * @throws {Error} When Hono JWT verify function is not available at runtime
 *
 * @example
 * ```typescript
 * import { verify } from '@gravito/photon/jwt'
 *
 * try {
 *   const payload = await verify(token, 'secret-key')
 *   console.log('User ID:', payload.sub)
 * } catch (err) {
 *   console.error('Invalid token:', err)
 * }
 * ```
 *
 * @public
 */
export const verify = ensure(honoJwt.verify, 'verify')

/**
 * Decodes a JWT token without cryptographic verification.
 *
 * **SECURITY WARNING**: This function does NOT validate the token signature.
 * Only use this when you need to inspect token contents without caring about authenticity,
 * such as reading metadata from trusted sources or debugging.
 *
 * **Use Cases:**
 * - Reading token expiration time before verification
 * - Extracting user hints for UI rendering (must re-verify for security-critical operations)
 * - Debugging token structure in development
 *
 * @param token - The JWT token string to decode
 * @returns Decoded JWT payload without signature verification
 * @throws {Error} When token format is invalid (not a valid JWT structure)
 * @throws {Error} When Hono JWT decode function is not available at runtime
 *
 * @example
 * ```typescript
 * import { decode } from '@gravito/photon/jwt'
 *
 * const { header, payload } = decode(unverifiedToken)
 * console.log('Token algorithm:', header.alg)
 * console.log('Token expires:', new Date(payload.exp * 1000))
 * ```
 *
 * @public
 */
export const decode = ensure(honoJwt.decode, 'decode')

/**
 * Creates and signs a JWT token from a payload object.
 *
 * Generates a cryptographically signed JWT using the specified secret and algorithm.
 * The payload can include standard claims (sub, exp, iat) or custom application data.
 *
 * **Use Cases:**
 * - Issuing access tokens after successful login
 * - Creating refresh tokens for session management
 * - Generating API tokens for third-party integrations
 *
 * @param payload - Data to encode in the JWT (user ID, roles, custom claims)
 * @param secret - Secret key for signing the token
 * @param alg - Signing algorithm (default: 'HS256')
 * @returns Signed JWT token string
 * @throws {Error} When signing fails or secret is invalid
 * @throws {Error} When Hono JWT sign function is not available at runtime
 *
 * @example
 * User authentication token
 * ```typescript
 * import { sign } from '@gravito/photon/jwt'
 *
 * const token = await sign(
 *   {
 *     sub: 'user-123',
 *     role: 'admin',
 *     exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour
 *   },
 *   'your-secret-key'
 * )
 * ```
 *
 * @example
 * Custom claims with additional metadata
 * ```typescript
 * const accessToken = await sign(
 *   {
 *     sub: userId,
 *     email: user.email,
 *     permissions: ['read:posts', 'write:comments'],
 *     iat: Math.floor(Date.now() / 1000)
 *   },
 *   process.env.JWT_SECRET!,
 *   'HS256'
 * )
 * ```
 *
 * @public
 */
export const sign = ensure(honoJwt.sign, 'sign')

/**
 * Verifies a JWT token using JSON Web Key Set (JWKS).
 *
 * Fetches the public key from a JWKS endpoint and uses it to verify the token signature.
 * Essential for integrating with third-party identity providers (Auth0, Okta, Firebase)
 * that rotate signing keys dynamically.
 *
 * **Use Cases:**
 * - Validating tokens from OAuth2/OIDC providers
 * - Multi-tenant authentication with dynamic key rotation
 * - Integrating with external identity services
 *
 * @param token - The JWT token to verify
 * @param jwksUrl - URL to the JWKS endpoint (e.g., 'https://YOUR_DOMAIN/.well-known/jwks.json')
 * @returns Verified JWT payload
 * @throws {Error} When JWKS fetch fails or key is not found
 * @throws {Error} When token signature is invalid or expired
 * @throws {Error} When Hono JWT verifyWithJwks function is not available at runtime
 *
 * @example
 * Auth0 integration
 * ```typescript
 * import { verifyWithJwks } from '@gravito/photon/jwt'
 *
 * const jwksUrl = 'https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json'
 *
 * try {
 *   const payload = await verifyWithJwks(token, jwksUrl)
 *   console.log('Verified user:', payload.sub)
 * } catch (err) {
 *   console.error('JWKS verification failed:', err)
 * }
 * ```
 *
 * @public
 */
export const verifyWithJwks = ensure(honoJwt.verifyWithJwks, 'verifyWithJwks')

/**
 * JWT payload structure.
 *
 * Currently typed as `any` to avoid deep internal imports from Hono that may break
 * across versions. In practice, payloads contain standard JWT claims (sub, exp, iat)
 * and custom application data.
 *
 * @public
 */
export type JwtPayload = any

/**
 * JWT header structure.
 *
 * Contains metadata about the token signing algorithm and key identifier.
 * Typed as `any` for forward compatibility with Hono's internal types.
 *
 * @public
 */
export type JwtHeader = any

/**
 * JWT middleware configuration options.
 *
 * Typed as `any` for forward compatibility. Typical options include:
 * - `secret`: Signing key
 * - `alg`: Algorithm (HS256, RS256, etc.)
 * - `cookie`: Read token from cookie instead of header
 *
 * @public
 */
export type JwtOptions = any

/**
 * JWT middleware factory function signature.
 *
 * Takes configuration options and returns a middleware handler for route protection.
 *
 * @public
 */
export type JwtFunction = (options: any) => MiddlewareHandler
