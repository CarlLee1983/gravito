/**
 * @fileoverview Orbit Session - Session management for Gravito
 *
 * Provides secure session handling with multiple storage backends
 * and CSRF protection.
 *
 * @module @gravito/pulsar
 * @since 1.0.0
 */

import type {
  CacheService,
  GravitoContext,
  GravitoNext,
  GravitoOrbit,
  PlanetCore,
} from '@gravito/core'
import { generateToken, parseCookieHeader, safeEquals, serializeCookie } from './helpers'
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
    const cacheKey = resolved.cacheKey ?? 'cache'
    const keyPrefix = resolved.keyPrefix ?? 'session:'
    const cookieName = resolved.cookie?.name ?? 'gravito_session'
    const cookiePath = resolved.cookie?.path ?? '/'
    const cookieSameSite = resolved.cookie?.sameSite ?? 'Lax'
    const cookieHttpOnly = resolved.cookie?.httpOnly ?? true
    const cookieSecure = resolved.cookie?.secure ?? process.env.NODE_ENV === 'production'
    const idleTimeoutSeconds = resolved.idleTimeoutSeconds ?? 60 * 30
    const touchIntervalSeconds = resolved.touchIntervalSeconds ?? 60

    const csrfEnabled = resolved.csrf?.enabled ?? true
    const csrfHeaderNames = ['X-XSRF-TOKEN', 'X-CSRF-TOKEN']
    const csrfCookieName = resolved.csrf?.cookieName ?? 'XSRF-TOKEN'
    const csrfCookiePath = resolved.csrf?.cookiePath ?? '/'
    const csrfCookieSameSite = resolved.csrf?.cookieSameSite ?? 'Lax'
    const csrfCookieSecure = resolved.csrf?.cookieSecure ?? process.env.NODE_ENV === 'production'
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
      const markDirty = () => {
        dirty = true
      }

      const session: any = {
        id: () => sessionId,
        get: (k: string, d?: any) => {
          const parts = k.split('.')
          let curr: any = data
          for (const p of parts) {
            if (p === '__proto__' || p === 'constructor' || p === 'prototype') return d
            if (curr == null || typeof curr !== 'object') return d
            curr = curr[p]
          }
          return curr ?? d
        },
        put: (k: string, v: any) => {
          const parts = k.split('.')
          let curr = data
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            if (part === '__proto__' || part === 'constructor' || part === 'prototype') return
            if (!(part in curr)) curr[part] = {}
            curr = curr[part]
          }
          const lastPart = parts[parts.length - 1]
          if (lastPart === '__proto__' || lastPart === 'constructor' || lastPart === 'prototype')
            return
          curr[lastPart] = v
          markDirty()
        },
        set: (k: string, v: any) => session.put(k, v),
        forget: (k: string) => {
          const parts = k.split('.')
          let curr = data
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            if (part === '__proto__' || part === 'constructor' || part === 'prototype') return
            if (!(part in curr)) return
            curr = curr[part]
          }
          const lastPart = parts[parts.length - 1]
          if (lastPart === '__proto__' || lastPart === 'constructor' || lastPart === 'prototype')
            return
          delete curr[lastPart]
          markDirty()
        },
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
        invalidate: () => {
          data = {}
          sessionId = generateToken()
          markDirty()
          isRegenerated = true
        },
        destroy: () => session.invalidate(),
        flash: (k: string, v: any) => {
          if (!data._flash) data._flash = {}
          data._flash[k] = v
          markDirty()
        },
        getFlash: (k: string, d?: any) => {
          return data._flash?.[k] ?? d
        },
        keep: (keys: string[]) => {
          // TODO: Implement flash data persistence logic
        },
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

            // Robust comparison with double-decode safety
            const cleanIncoming = incoming ? decodeURIComponent(decodeURIComponent(incoming)) : ''

            if (!cleanIncoming || !safeEquals(cleanIncoming, expected)) {
              console.error(
                `[CSRF ERROR] Mismatch URL: ${c.req.url}, Expected: ${expected}, GOT: ${cleanIncoming || '(empty)'}`
              )
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

      // Final Cookie Delivery
      const common = `; Path=${cookiePath}; SameSite=${cookieSameSite}; Max-Age=${60 * 60 * 24 * 7}${cookieSecure ? '; Secure' : ''}`
      const sidStr = `${cookieName}=${sessionId}${common}; HttpOnly`
      const csrfStr = `${csrfCookieName}=${encodeURIComponent(currentToken)}${common}` // Notice: NOT HttpOnly

      c.header('Set-Cookie', sidStr, { append: true })
      c.header('Set-Cookie', csrfStr, { append: true })

      const resToMod = res || (c as any).native?.res
      if (resToMod?.headers) {
        try {
          resToMod.headers.append('Set-Cookie', sidStr)
          resToMod.headers.append('Set-Cookie', csrfStr)
        } catch (e) {}
      }

      return res
    })
  }
}
