import type { Context } from 'hono'

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
  driver?: 'memory' | 'cache' | 'redis' | 'file' | 'sqlite'
  store?: SessionStore // Advanced: custom store overrides driver
  cacheKey?: string // Default: 'cache' (ctx.get)
  keyPrefix?: string // Default: 'session:'
  cookie?: OrbitSessionCookieOptions
  idleTimeoutSeconds?: number
  absoluteTimeoutSeconds?: number
  touchIntervalSeconds?: number
  csrf?: OrbitCsrfOptions
  now?: () => number
  redis?: {
    connection?: string
  }
  file?: {
    path?: string // Default: './storage/sessions'
  }
  sqlite?: {
    path?: string // Default: 'sessions.sqlite'
    tableName?: string // Default: 'sessions'
  }
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
