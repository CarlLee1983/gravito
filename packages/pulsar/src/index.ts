/**
 * @fileoverview Orbit Session - Session management for Gravito
 *
 * Provides secure session handling with multiple storage backends
 * and CSRF protection.
 *
 * @module @gravito/pulsar
 * @since 1.0.0
 */

import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { generateToken, parseCookieHeader, safeEquals } from './helpers'
import { FileSessionStore } from './stores/FileSessionStore'
import { MemorySessionStore } from './stores/MemorySessionStore'
import { RedisSessionStore } from './stores/RedisSessionStore'
import { SqliteSessionStore } from './stores/SqliteSessionStore'
import type {
  CsrfService,
  OrbitPulsarOptions,
  SessionId,
  SessionRecord,
  SessionService,
  SessionStore,
} from './types'

export { FileSessionStore } from './stores/FileSessionStore'
export { MemorySessionStore } from './stores/MemorySessionStore'
export { RedisSessionStore } from './stores/RedisSessionStore'
export { SqliteSessionStore } from './stores/SqliteSessionStore'
export * from './types'

declare module '@gravito/core' {
  interface GravitoVariables {
    session?: SessionService
    csrf?: CsrfService
  }
}

/**
 * OrbitPulsar is the official session management and CSRF protection module for Gravito.
 *
 * It provides a stateful experience for stateless HTTP requests, supporting multiple
 * storage drivers including Memory, Redis, SQLite, and File-based storage.
 *
 * It automatically handles:
 * - Session ID generation and rotation.
 * - Encrypted and secure cookie management.
 * - Flash data persistence for single-request messages.
 * - Token-based CSRF protection for all non-GET requests.
 *
 * @example
 * ```typescript
 * import { OrbitPulsar } from '@gravito/pulsar';
 *
 * const pulsar = new OrbitPulsar({
 *   driver: 'redis',
 *   redis: { connection: 'redis://localhost:6379' },
 *   cookie: { name: 'my_session', secure: true }
 * });
 * core.addOrbit(pulsar);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class OrbitPulsar implements GravitoOrbit {
  constructor(private options: OrbitPulsarOptions = {}) {}

  install(core: PlanetCore): void {
    const configFromCore = core.config.has('session')
      ? (core.config.get<OrbitPulsarOptions>('session') ?? {})
      : {}

    const resolved: OrbitPulsarOptions = {
      ...configFromCore,
      ...this.options,
      cookie: { ...(configFromCore.cookie ?? {}), ...(this.options.cookie ?? {}) },
      csrf: { ...(configFromCore.csrf ?? {}), ...(this.options.csrf ?? {}) },
      redis: { ...(configFromCore.redis ?? {}), ...(this.options.redis ?? {}) },
    }

    const exposeAs = (resolved.exposeAs as any) ?? 'session'
    const driver = resolved.driver ?? 'memory'
    const keyPrefix = resolved.keyPrefix ?? 'session:'
    const cookieName = resolved.cookie?.name ?? 'gravito_session'
    const cookiePath = resolved.cookie?.path ?? '/'
    const cookieSameSite = resolved.cookie?.sameSite ?? 'Lax'
    const cookieSecure = resolved.cookie?.secure ?? process.env.NODE_ENV === 'production'
    const idleTimeoutSeconds = resolved.idleTimeoutSeconds ?? 60 * 30
    const touchIntervalSeconds = resolved.touchIntervalSeconds ?? 60

    const csrfEnabled = resolved.csrf?.enabled ?? true
    const csrfHeaderNames = ['X-XSRF-TOKEN', 'X-CSRF-TOKEN']
    const csrfCookieName = resolved.csrf?.cookieName ?? 'XSRF-TOKEN'
    const csrfIgnore = resolved.csrf?.ignore

    const now = resolved.now ?? (() => Date.now())
    const memoryStore = new MemorySessionStore(now)

    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      let store: SessionStore
      if (driver === 'redis') {
        store = new RedisSessionStore(keyPrefix, resolved.redis?.connection)
      } else if (driver === 'file') {
        store = new FileSessionStore(resolved.file?.path ?? '.sessions')
      } else if (driver === 'sqlite') {
        store = new SqliteSessionStore(
          resolved.sqlite?.path ?? 'session.db',
          resolved.sqlite?.tableName
        )
      } else {
        store = memoryStore
      }

      const cookieHeader = c.req.header('Cookie') || ''
      const cookies = parseCookieHeader(cookieHeader)
      const cookieSid = cookies[cookieName]
      let sessionId: SessionId = cookieSid || generateToken()
      let record: SessionRecord | null = cookieSid ? await store.get(cookieSid) : null

      if (record && now() >= record.lastActivityAt + idleTimeoutSeconds * 1000) {
        await store.delete(cookieSid!)
        record = null
        sessionId = generateToken()
      } else if (!record && cookieSid) {
        sessionId = generateToken()
      }

      let data: Record<string, any> = record?.data ?? {}
      let dirty = false
      let isRegenerated = false
      const started = !!record
      const markDirty = () => {
        dirty = true
      }

      const setCookiesHelper = (sid: string, csrfToken: string) => {
        const common = `; Path=${cookiePath}; SameSite=${cookieSameSite}; Max-Age=${60 * 60 * 24 * 7}${cookieSecure ? '; Secure' : ''}`
        const sidStr = `${cookieName}=${sid}${common}; HttpOnly`
        const csrfStr = `${csrfCookieName}=${encodeURIComponent(csrfToken)}${common}`
        c.header('Set-Cookie', sidStr, { append: true })
        c.header('Set-Cookie', csrfStr, { append: true })
      }

      // Flash data handling: Move current flash to old flash, clear current
      const oldFlash: Record<string, any> = data._flash ?? {}
      const flashReads = new Set<string>()
      data._flash = {}
      if (Object.keys(oldFlash).length > 0) {
        markDirty()
      }

      const session: any = {
        /** Returns the current session identifier. */
        id: () => sessionId,
        /** Returns true if the session was loaded from a persistent store. */
        isStarted: () => started,
        /**
         * Checks if a key exists in the session data.
         *
         * Supports dot notation for nested keys (e.g., 'user.profile.name').
         * Returns false for dangerous property names to prevent prototype pollution.
         *
         * @param k - The key path (supports dot notation)
         * @returns True if the key exists and is safe to access
         */
        has: (k: string) => {
          const parts = k.split('.')
          let curr: any = data
          for (const p of parts) {
            if (p === '__proto__' || p === 'constructor' || p === 'prototype') {
              return false
            }
            if (curr == null || typeof curr !== 'object') {
              return false
            }
            curr = curr[p]
          }
          return curr !== undefined
        },
        /** Retrieves a value by key with an optional default. */
        get: (k: string, d?: any) => {
          const parts = k.split('.')
          let curr: any = data
          for (const p of parts) {
            if (p === '__proto__' || p === 'constructor' || p === 'prototype') {
              return d
            }
            if (curr == null || typeof curr !== 'object') {
              return d
            }
            curr = curr[p]
          }
          return curr ?? d
        },
        /**
         * Stores a value in the session.
         *
         * Supports dot notation for nested keys (e.g., 'user.profile.name').
         * Silently rejects attempts to set dangerous property names
         * (__proto__, constructor, prototype) to prevent prototype pollution attacks.
         *
         * @param k - The key path (supports dot notation)
         * @param v - The value to store
         */
        put: (k: string, v: any) => {
          const parts = k.split('.')
          let curr = data
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
              return
            }
            if (!(part in curr)) {
              curr[part] = {}
            }
            curr = curr[part]
          }
          const lastPart = parts[parts.length - 1]
          if (lastPart === '__proto__' || lastPart === 'constructor' || lastPart === 'prototype') {
            return
          }
          curr[lastPart] = v
          markDirty()
        },
        /** Alias for put(). */
        set: (k: string, v: any) => session.put(k, v),
        /** Retrieves and immediately removes a value from the session. */
        pull: (k: string, d?: any) => {
          const value = session.get(k, d)
          session.forget(k)
          return value
        },
        /** Removes a specific key from the session. */
        forget: (k: string) => {
          const parts = k.split('.')
          let curr = data
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
              return
            }
            if (!(part in curr)) {
              return
            }
            curr = curr[part]
          }
          const lastPart = parts[parts.length - 1]
          if (lastPart === '__proto__' || lastPart === 'constructor' || lastPart === 'prototype') {
            return
          }
          delete curr[lastPart]
          markDirty()
        },
        /** Changes the session ID while keeping the existing data. */
        regenerate: () => {
          const old = { ...data }
          delete old._csrf
          data = old
          sessionId = generateToken()
          markDirty()
          isRegenerated = true
          if (core.hooks?.doAction) {
            core.hooks.doAction('session:regenerated', { sessionId })
          }
        },
        /** Clears all session data and changes the session ID. */
        invalidate: () => {
          data = {}
          sessionId = generateToken()
          markDirty()
          isRegenerated = true
        },
        /** Permanently expires and deletes the session. */
        destroy: () => session.invalidate(),
        /** Stores a value that only lasts for the next request. */
        flash: (k: string, v: any) => {
          if (!data._flash) {
            data._flash = {}
          }
          data._flash[k] = v
          markDirty()
        },
        /** Retrieves a flashed value. */
        getFlash: (k: string, d?: any) => {
          flashReads.add(k)
          return oldFlash[k] ?? d
        },
        /** Persists all current flash data for another request cycle. */
        reflash: () => {
          if (Object.keys(oldFlash).length > 0) {
            if (!data._flash) {
              data._flash = {}
            }
            data._flash = { ...data._flash, ...oldFlash }
            markDirty()
          }
        },
        /** Persists specific keys from current flash data for another request cycle. */
        keep: (keys: string[]) => {
          for (const key of keys) {
            if (key in oldFlash) {
              if (!data._flash) {
                data._flash = {}
              }
              data._flash[key] = oldFlash[key]
              flashReads.delete(key)
              markDirty()
            }
          }
        },
        /** Returns all data stored in the current session. */
        all: () => data,
      }

      const csrfService: CsrfService = {
        token: () => {
          if (!data._csrf) {
            data._csrf = generateToken()
            markDirty()
          }
          return data._csrf
        },
      }

      c.set(exposeAs, session)
      c.set('csrf' as any, csrfService)

      if (csrfEnabled) {
        const method = c.req.method.toUpperCase()
        if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
          if (!(typeof csrfIgnore === 'function' && csrfIgnore(c as any))) {
            const expected = csrfService.token()
            let incoming = ''

            // Try Headers first
            for (const h of csrfHeaderNames) {
              const val = c.req.header(h)
              if (val) {
                incoming = val
                break
              }
            }

            // Fallback to Cookie
            if (!incoming && cookies[csrfCookieName]) {
              incoming = cookies[csrfCookieName]
            }

            if (!incoming || !safeEquals(incoming, expected)) {
              console.error('[CSRF ERROR] CSRF token mismatch', {
                url: c.req.url,
                method: c.req.method,
                hasToken: !!incoming,
              })

              // Shared Save Logic Helper
              const saveSession = async () => {
                const currentToken = csrfService.token()
                const shouldSave =
                  dirty ||
                  isRegenerated ||
                  (record ? (now() - record.lastActivityAt) / 1000 >= touchIntervalSeconds : true)

                if (shouldSave) {
                  await store.set(
                    sessionId,
                    { data, createdAt: record?.createdAt ?? now(), lastActivityAt: now() },
                    idleTimeoutSeconds
                  )
                }

                setCookiesHelper(sessionId, currentToken)
              }

              if (c.req.header('X-Inertia')) {
                session.flash('error', 'Session expired. Please try again.')
                await saveSession()
                return c.redirect(c.req.header('Referer') || '/')
              }

              return c.json(
                { success: false, error: { code: 'CSRF_ERROR', message: 'CSRF token mismatch' } },
                403
              )
            }
          }
        }
      }

      const res = await next()

      // Post-Processing
      const currentToken = csrfService.token()
      const shouldSave =
        dirty ||
        isRegenerated ||
        (record ? (now() - record.lastActivityAt) / 1000 >= touchIntervalSeconds : true)

      if (shouldSave) {
        await store.set(
          sessionId,
          { data, createdAt: record?.createdAt ?? now(), lastActivityAt: now() },
          idleTimeoutSeconds
        )
      }

      setCookiesHelper(sessionId, currentToken)

      return res
    })
  }
}
