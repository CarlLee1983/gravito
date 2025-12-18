import { randomBytes } from 'node:crypto'
import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import type { Context, Next } from 'hono'

export type SessionId = string

export interface SessionRecord {
  data: Record<string, unknown>
  createdAt: number
  lastActivityAt: number
  flash?: {
    now: string[]
    next: string[]
  }
}

export interface SessionStore {
  get(id: SessionId): Promise<SessionRecord | null>
  set(id: SessionId, record: SessionRecord, ttlSeconds: number): Promise<void>
  delete(id: SessionId): Promise<void>
}

export interface OrbitSessionCookieOptions {
  name?: string
  path?: string
  httpOnly?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
  secure?: boolean
}

export interface OrbitCsrfOptions {
  enabled?: boolean
  headerName?: string
  cookieName?: string
  cookiePath?: string
  cookieSecure?: boolean
  cookieSameSite?: 'Lax' | 'Strict' | 'None'
  ignore?: (ctx: Context) => boolean
}

export interface OrbitSessionOptions {
  exposeAs?: string
  driver?: 'memory' | 'cache'
  store?: SessionStore // Advanced: custom store overrides driver
  cacheKey?: string // Default: 'cache' (ctx.get)
  keyPrefix?: string // Default: 'session:'
  cookie?: OrbitSessionCookieOptions
  idleTimeoutSeconds?: number
  absoluteTimeoutSeconds?: number
  touchIntervalSeconds?: number
  csrf?: OrbitCsrfOptions
  now?: () => number
}

export interface SessionService {
  id(): SessionId
  isStarted(): boolean
  get<T = unknown>(key: string, defaultValue?: T): T
  has(key: string): boolean
  put(key: string, value: unknown): void
  forget(key: string): void
  all(): Record<string, unknown>
  pull<T = unknown>(key: string, defaultValue?: T): T

  flash(key: string, value: unknown): void
  getFlash<T = unknown>(key: string, defaultValue?: T): T
  reflash(): void
  keep(keys?: string[]): void

  regenerate(): void
  invalidate(): void
}

export interface CsrfService {
  token(): string
}

declare module 'hono' {
  interface ContextVariableMap {
    session: SessionService
    csrf: CsrfService
  }
}

class MemorySessionStore implements SessionStore {
  private store = new Map<string, { record: SessionRecord; expiresAt: number }>()
  constructor(private now: () => number) {}

  async get(id: SessionId): Promise<SessionRecord | null> {
    const item = this.store.get(id)
    if (!item) return null
    if (this.now() > item.expiresAt) {
      this.store.delete(id)
      return null
    }
    return item.record
  }

  async set(id: SessionId, record: SessionRecord, ttlSeconds: number): Promise<void> {
    this.store.set(id, { record, expiresAt: this.now() + ttlSeconds * 1000 })
  }

  async delete(id: SessionId): Promise<void> {
    this.store.delete(id)
  }
}

function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function generateSessionId(): SessionId {
  return base64Url(randomBytes(32))
}

function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=')
    if (!rawKey) continue
    out[rawKey] = decodeURIComponent(rest.join('=') ?? '')
  }
  return out
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    path?: string
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Lax' | 'Strict' | 'None'
    maxAge?: number
  }
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${options.path ?? '/'}`)
  if (options.maxAge != null) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  return parts.join('; ')
}

function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export class OrbitSession implements GravitoOrbit {
  constructor(private options: OrbitSessionOptions = {}) {}

  install(core: PlanetCore): void {
    const configFromCore = core.config.has('session')
      ? (core.config.get<OrbitSessionOptions>('session') ?? {})
      : {}

    const resolved: OrbitSessionOptions = {
      ...configFromCore,
      ...this.options,
      cookie: { ...(configFromCore.cookie ?? {}), ...(this.options.cookie ?? {}) },
      csrf: { ...(configFromCore.csrf ?? {}), ...(this.options.csrf ?? {}) },
    }

    const exposeAs = resolved.exposeAs ?? 'session'
    const driver = resolved.driver ?? 'memory'
    const cacheKey = resolved.cacheKey ?? 'cache'
    const keyPrefix = resolved.keyPrefix ?? 'session:'
    const cookieName = resolved.cookie?.name ?? 'gravito_session'
    const cookiePath = resolved.cookie?.path ?? '/'
    const cookieSameSite = resolved.cookie?.sameSite ?? 'Lax'
    const cookieHttpOnly = resolved.cookie?.httpOnly ?? true
    const cookieSecure = resolved.cookie?.secure ?? process.env.NODE_ENV === 'production'

    const idleTimeoutSeconds = resolved.idleTimeoutSeconds ?? 60 * 30
    const absoluteTimeoutSeconds = resolved.absoluteTimeoutSeconds ?? 60 * 60 * 24 * 7
    const touchIntervalSeconds = resolved.touchIntervalSeconds ?? 60

    const csrfEnabled = resolved.csrf?.enabled ?? true
    const csrfHeaderName = resolved.csrf?.headerName ?? 'X-CSRF-Token'
    const csrfCookieName = resolved.csrf?.cookieName ?? 'XSRF-TOKEN'
    const csrfCookiePath = resolved.csrf?.cookiePath ?? '/'
    const csrfCookieSameSite = resolved.csrf?.cookieSameSite ?? 'Lax'
    const csrfCookieSecure = resolved.csrf?.cookieSecure ?? process.env.NODE_ENV === 'production'
    const csrfIgnore = resolved.csrf?.ignore

    const now = resolved.now ?? (() => Date.now())
    const memoryStore = new MemorySessionStore(now)

    core.logger.info(
      `[OrbitSession] Initializing Session (cookie: ${cookieName}, idle: ${idleTimeoutSeconds}s, absolute: ${absoluteTimeoutSeconds}s)`
    )

    core.hooks.doAction('session:init', {
      cookieName,
      driver,
      idleTimeoutSeconds,
      absoluteTimeoutSeconds,
      touchIntervalSeconds,
      csrf: csrfEnabled,
    })

    core.app.use('*', async (c: Context, next: Next) => {
      const store: SessionStore = resolved.store
        ? resolved.store
        : driver === 'cache'
          ? {
              get: async (id) => {
                const cache = c.get(cacheKey as any) as any
                if (!cache?.get) {
                  throw new Error(
                    `[OrbitSession] Session driver is "cache" but cache service "${cacheKey}" was not found in context.`
                  )
                }
                const raw = (await cache.get(`${keyPrefix}${id}`)) as string | null | undefined
                if (!raw) return null
                try {
                  return JSON.parse(raw) as SessionRecord
                } catch {
                  return null
                }
              },
              set: async (id, record, ttlSeconds) => {
                const cache = c.get(cacheKey as any) as any
                await cache.set(`${keyPrefix}${id}`, JSON.stringify(record), ttlSeconds)
              },
              delete: async (id) => {
                const cache = c.get(cacheKey as any) as any
                await cache.delete(`${keyPrefix}${id}`)
              },
            }
          : memoryStore

      const startedAt = now()
      const cookies = parseCookieHeader(c.req.header('Cookie'))
      const cookieSid = cookies[cookieName]

      let sessionId: SessionId = cookieSid || generateSessionId()
      let record: SessionRecord | null = cookieSid ? await store.get(cookieSid) : null

      const isExpired =
        record != null &&
        (startedAt - record.lastActivityAt > idleTimeoutSeconds * 1000 ||
          startedAt - record.createdAt > absoluteTimeoutSeconds * 1000)

      if (!record || isExpired) {
        if (cookieSid && record == null) {
          core.hooks.doAction('session:miss', { id: cookieSid })
        }
        if (isExpired && cookieSid) {
          core.hooks.doAction('session:expired', { id: cookieSid })
        }
        if (isExpired && cookieSid) {
          await store.delete(cookieSid)
        }

        record = {
          data: {},
          createdAt: startedAt,
          lastActivityAt: startedAt,
          flash: { now: [], next: [] },
        }
        sessionId = generateSessionId()
      }

      const data = { ...(record.data ?? {}) }
      const flashNow = new Set(record.flash?.now ?? [])
      const flashNext = new Set(record.flash?.next ?? [])

      let started = false
      let dirty = false
      let regeneratedFrom: SessionId | null = null

      const ensureStarted = () => {
        started = true
      }

      const markDirty = () => {
        dirty = true
        ensureStarted()
      }

      const sessionService: SessionService = {
        id: () => sessionId,
        isStarted: () => started,
        get: (key, defaultValue) => {
          ensureStarted()
          return (key in data ? (data[key] as any) : defaultValue) as any
        },
        has: (key) => {
          ensureStarted()
          return key in data
        },
        put: (key, value) => {
          data[key] = value
          markDirty()
        },
        forget: (key) => {
          if (key in data) {
            delete data[key]
            markDirty()
          } else {
            ensureStarted()
          }
        },
        all: () => {
          ensureStarted()
          const out: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(data)) out[k] = v
          return out
        },
        pull: (key, defaultValue) => {
          ensureStarted()
          const val = (key in data ? (data[key] as any) : defaultValue) as any
          if (key in data) {
            delete data[key]
            markDirty()
          }
          return val
        },
        flash: (key, value) => {
          data[key] = value
          flashNext.add(key)
          markDirty()
        },
        getFlash: (key, defaultValue) => {
          ensureStarted()
          if (!flashNow.has(key)) return defaultValue as any
          return (key in data ? (data[key] as any) : defaultValue) as any
        },
        reflash: () => {
          for (const key of flashNow) flashNext.add(key)
          markDirty()
        },
        keep: (keys) => {
          const keepKeys = keys && keys.length > 0 ? keys : Array.from(flashNow)
          for (const key of keepKeys) {
            if (flashNow.has(key)) flashNext.add(key)
          }
          markDirty()
        },
        regenerate: () => {
          regeneratedFrom = sessionId
          sessionId = generateSessionId()
          markDirty()
        },
        invalidate: () => {
          regeneratedFrom = sessionId
          sessionId = generateSessionId()
          for (const key of Object.keys(data)) delete data[key]
          flashNow.clear()
          flashNext.clear()
          markDirty()
        },
      }

      const csrfService: CsrfService = {
        token: () => {
          ensureStarted()
          const existing = data._csrf
          if (typeof existing === 'string' && existing.length > 0) return existing
          const token = base64Url(randomBytes(32))
          data._csrf = token
          markDirty()
          return token
        },
      }

      c.set(exposeAs, sessionService)
      c.set('csrf', csrfService)

      if (csrfEnabled) {
        const method = c.req.method.toUpperCase()
        const isSafeMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
        const ignored = csrfIgnore ? Boolean(csrfIgnore(c)) : false

        if (!isSafeMethod && !ignored) {
          const incoming = c.req.header(csrfHeaderName) ?? ''
          const expected = csrfService.token()
          if (!incoming || !safeEquals(incoming, expected)) {
            return c.json(
              {
                success: false,
                error: {
                  code: 'CSRF_ERROR',
                  message: 'CSRF token mismatch',
                },
              },
              403
            )
          }
        }
      }

      await next()

      const finishedAt = now()
      const shouldTouch =
        started && finishedAt - record.lastActivityAt >= touchIntervalSeconds * 1000

      if (started) {
        for (const key of flashNow) {
          if (!flashNext.has(key)) delete data[key]
        }
      }

      const finalFlashNow = Array.from(flashNext)
      const finalFlashNext: string[] = []

      const absoluteRemainingSeconds = Math.max(
        0,
        Math.floor((record.createdAt + absoluteTimeoutSeconds * 1000 - finishedAt) / 1000)
      )
      const ttlSeconds = Math.max(
        1,
        Math.min(absoluteRemainingSeconds, idleTimeoutSeconds + touchIntervalSeconds)
      )

      const shouldSave = dirty || shouldTouch

      if (shouldSave) {
        const toSave: SessionRecord = {
          data,
          createdAt: record.createdAt,
          lastActivityAt: finishedAt,
          flash: { now: finalFlashNow, next: finalFlashNext },
        }

        core.hooks.doAction('session:saving', { id: sessionId })
        await store.set(sessionId, toSave, ttlSeconds)
        core.hooks.doAction('session:saved', { id: sessionId })

        if (regeneratedFrom && regeneratedFrom !== sessionId) {
          await store.delete(regeneratedFrom)
          core.hooks.doAction('session:regenerated', { from: regeneratedFrom, to: sessionId })
        }

        c.res.headers.append(
          'Set-Cookie',
          serializeCookie(cookieName, sessionId, {
            path: cookiePath,
            httpOnly: cookieHttpOnly,
            sameSite: cookieSameSite,
            secure: cookieSecure,
            maxAge: Math.min(absoluteTimeoutSeconds, 60 * 60 * 24 * 365),
          })
        )
      }

      if (csrfEnabled && started) {
        const token = typeof data._csrf === 'string' ? data._csrf : csrfService.token()
        c.res.headers.append(
          'Set-Cookie',
          serializeCookie(csrfCookieName, token, {
            path: csrfCookiePath,
            httpOnly: false,
            sameSite: csrfCookieSameSite,
            secure: csrfCookieSecure,
            maxAge: Math.min(absoluteTimeoutSeconds, 60 * 60 * 24 * 365),
          })
        )
      }
    })
  }
}
