import type { Context } from '@gravito/core/compat'

/**
 * Unique identifier for a user session.
 *
 * @public
 * @since 3.0.0
 */
export type SessionId = string

/**
 * Internal representation of a user session stored in the backend.
 *
 * @public
 * @since 3.0.0
 */
export interface SessionRecord {
  /** The dynamic data stored in the session. */
  data: Record<string, unknown>
  /** Epoch timestamp representing when the session was created. */
  createdAt: number
  /** Epoch timestamp representing the last time the session was accessed. */
  lastActivityAt: number
  /**
   * Temporary "flash" data that persists for exactly one request cycle.
   *
   * Flash data provides a mechanism to pass messages between requests,
   * commonly used for success notifications, validation errors, or temporary alerts.
   * The data automatically expires after being read once.
   *
   * **How Flash Data Works:**
   *
   * Flash data uses a two-phase rotation system with `now` and `next` arrays:
   * - `now`: Flash keys available in the current request (set in previous request)
   * - `next`: Flash keys to be available in the next request (set in current request)
   *
   * On each request, the framework automatically:
   * 1. Moves `next` → `now` (making previous flash data available)
   * 2. Clears `next` (preparing for new flash data)
   * 3. After response, discards `now` (flash data consumed)
   *
   * **Lifecycle Example:**
   *
   * ```typescript
   * // Request 1: User submits form
   * session.flash('success', 'Profile updated!')
   * // Internal state: data._flash = { next: ['success'] }
   *
   * // Request 2: Redirect to profile page
   * const message = session.getFlash('success') // Returns 'Profile updated!'
   * // Internal state: data._flash = { now: ['success'], next: [] }
   *
   * // Request 3: User navigates elsewhere
   * const message = session.getFlash('success') // Returns undefined
   * // Flash data has been automatically cleared
   * ```
   *
   * **Common Use Cases:**
   * - Form submission success/error messages
   * - Validation errors after redirect
   * - One-time notifications
   * - Post-authentication welcome messages
   *
   * **Advanced Operations:**
   *
   * ```typescript
   * // Keep all flash data for one more request
   * session.reflash()
   *
   * // Keep specific flash keys for one more request
   * session.keep(['error', 'warning'])
   * ```
   */
  flash?: {
    /** Flash data available in the current request. */
    now: string[]
    /** Flash data to be carried over to the next request. */
    next: string[]
  }
}

/**
 * Interface for backend session storage adapters (Memory, Redis, DB, etc.).
 *
 * @public
 * @since 3.0.0
 */
export interface SessionStore {
  /**
   * Retrieve a session record by its unique ID.
   *
   * @param id - The unique session identifier.
   */
  get(id: SessionId): Promise<SessionRecord | null>

  /**
   * Persist a session record with a specific Time-To-Live.
   *
   * @param id - The unique session identifier.
   * @param record - The session data to store.
   * @param ttlSeconds - How long to keep the session in storage.
   */
  set(id: SessionId, record: SessionRecord, ttlSeconds: number): Promise<void>

  /**
   * Manually expire and remove a session.
   *
   * @param id - The unique session identifier to delete.
   */
  delete(id: SessionId): Promise<void>
}

/**
 * Configuration for the session identifier cookie.
 *
 * @public
 * @since 3.0.0
 */
export interface OrbitPulsarCookieOptions {
  /** Name of the cookie. @default 'gravito_session' */
  name?: string
  /** URL path scope for the cookie. @default '/' */
  path?: string
  /** If true, cookie is inaccessible to client-side scripts. @default true */
  httpOnly?: boolean
  /** CSRF protection level for the cookie. @default 'Lax' */
  sameSite?: 'Lax' | 'Strict' | 'None'
  /** If true, cookie is only sent over HTTPS. @default false */
  secure?: boolean
}

/**
 * Configuration for CSRF (Cross-Site Request Forgery) protection.
 *
 * @public
 * @since 3.0.0
 */
export interface OrbitCsrfOptions {
  /** Whether to enable automatic CSRF protection. @default true */
  enabled?: boolean
  /** Header name to check for tokens. @default 'X-XSRF-TOKEN' */
  headerName?: string
  /** Name of the cookie containing the token. @default 'XSRF-TOKEN' */
  cookieName?: string
  /** URL path scope for the CSRF cookie. @default '/' */
  cookiePath?: string
  /** If true, CSRF cookie is only sent over HTTPS. @default false */
  cookieSecure?: boolean
  /** SameSite attribute for the CSRF cookie. @default 'Lax' */
  cookieSameSite?: 'Lax' | 'Strict' | 'None'
  /** Callback to bypass CSRF check for specific requests. */
  ignore?: (ctx: Context) => boolean
}

/**
 * Full configuration for the OrbitPulsar session orbit.
 *
 * @public
 * @since 3.0.0
 */
export interface OrbitPulsarOptions {
  /** Key used to expose the session service in the context. @default 'session' */
  exposeAs?: string
  /** The storage strategy to use for session persistence. @default 'memory' */
  driver?: 'memory' | 'cache' | 'redis' | 'file' | 'sqlite'
  /** Advanced: provide a custom SessionStore implementation. */
  store?: SessionStore
  /** Context key if using the 'cache' driver. */
  cacheKey?: string
  /** String prefix for all session keys in storage. */
  keyPrefix?: string
  /** Cookie settings for the session ID. */
  cookie?: OrbitPulsarCookieOptions
  /** Seconds of inactivity before a session expires. @default 7200 (2 hours) */
  idleTimeoutSeconds?: number
  /** Hard maximum lifetime of a session regardless of activity. @default 86400 (24 hours) */
  absoluteTimeoutSeconds?: number
  /** Seconds to wait between storage write 'touches' to reduce I/O. @default 60 */
  touchIntervalSeconds?: number
  /** CSRF protection settings. */
  csrf?: OrbitCsrfOptions
  /** Custom clock function for unit testing. */
  now?: () => number
  /** Specific options for the Redis driver. */
  redis?: {
    /** The Redis connection name to use from @gravito/plasma. */
    connection?: string
  }
  /** Specific options for the File-based driver. */
  file?: {
    /** Directory where session files will be stored. @default 'storage/sessions' */
    path?: string
  }
  /** Specific options for the SQLite driver. */
  sqlite?: {
    /** Path to the SQLite database file. @default 'storage/sessions.sqlite' */
    path?: string
    /** The table name for sessions. @default 'sessions' */
    tableName?: string
  }
}

/**
 * The public API for interacting with the current user's session data.
 *
 * @public
 * @since 3.0.0
 */
export interface SessionService {
  /** Returns the unique session identifier string. */
  id(): SessionId
  /** Returns true if the session has been started and initialized. */
  isStarted(): boolean
  /**
   * Retrieves a value by key with an optional default.
   *
   * @param key - The session key.
   * @param defaultValue - Fallback value if key is missing.
   */
  get<T = unknown>(key: string, defaultValue?: T): T
  /** Checks if a key exists in the session. */
  has(key: string): boolean
  /** Stores a value in the session. */
  put(key: string, value: unknown): void
  /** Alias for put(). */
  set(key: string, value: unknown): void
  /** Removes a specific key from the session. */
  forget(key: string): void
  /** Returns all data stored in the current session. */
  all(): Record<string, unknown>
  /** Retrieves and immediately removes a value from the session. */
  pull<T = unknown>(key: string, defaultValue?: T): T

  /** Stores a value in the session that only lasts for the next request. */
  flash(key: string, value: unknown): void
  /** Retrieves a flashed value. */
  getFlash<T = unknown>(key: string, defaultValue?: T): T
  /** Persists all current flash data for another request cycle. */
  reflash(): void
  /** Persists specific keys from the current flash data for another request cycle. */
  keep(keys?: string[]): void

  /** Changes the session ID while keeping the existing data. */
  regenerate(): void
  /** Clears all session data and changes the session ID. */
  invalidate(): void
  /** Permanently expires and deletes the session record from storage. */
  destroy(): void
}

/**
 * Service for managing CSRF protection tokens.
 *
 * @public
 * @since 3.0.0
 */
export interface CsrfService {
  /** Returns the current CSRF token for the session. */
  token(): string
}
