import type { CacheManager } from '@gravito/stasis'
import { CreateUserSchema, LoginSchema } from '../models/User'

// In-memory user store
const userStore = new Map<
  string,
  { id: string; name: string; email: string; password: string; role: string }
>()

// Simple JWT simulation
const generateToken = (userId: string, email: string, role: string): string => {
  return Buffer.from(JSON.stringify({ sub: userId, email, role, iat: Date.now() })).toString(
    'base64'
  )
}

export const verifyToken = (token: string): { sub: string; email: string; role: string } | null => {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString())
  } catch {
    return null
  }
}

export interface ApiContext {
  user?: { sub: string; email: string; role: string }
  req: { json: () => Promise<unknown> }
  json: (data: unknown, status: number) => { data: unknown; status: number }
  setJson: (data: unknown) => void
}

export const createApiRoutes = (cache: CacheManager) => ({
  register: async (ctx: ApiContext) => {
    const body = await ctx.req.json()
    const input = CreateUserSchema.parse(body)

    const existing = Array.from(userStore.values()).find((u) => u.email === input.email)
    if (existing) {
      return ctx.json({ error: 'Email already registered' }, 400)
    }

    const userId = `user_${Date.now()}`
    userStore.set(userId, {
      id: userId,
      name: input.name,
      email: input.email,
      password: input.password,
      role: 'user',
    })

    await cache.delete('users:all')
    return ctx.json({ success: true, userId }, 201)
  },

  login: async (ctx: ApiContext) => {
    const body = await ctx.req.json()
    const input = LoginSchema.parse(body)

    const user = Array.from(userStore.values()).find(
      (u) => u.email === input.email && u.password === input.password
    )

    if (!user) {
      return ctx.json({ error: 'Invalid credentials' }, 401)
    }

    const token = generateToken(user.id, user.email, user.role)
    return ctx.json({ token }, 200)
  },

  listUsers: async (ctx: ApiContext) => {
    if (!ctx.user) {
      return ctx.json({ error: 'Unauthorized' }, 401)
    }

    const cacheKey = 'users:all'
    const cached = await cache.get<unknown[]>(cacheKey)

    if (cached) {
      return ctx.json(cached, 200)
    }

    const users = Array.from(userStore.values()).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }))

    await cache.set(cacheKey, users, 300)
    return ctx.json(users, 200)
  },

  createUser: async (ctx: ApiContext) => {
    if (!ctx.user || ctx.user.role !== 'admin') {
      return ctx.json({ error: 'Insufficient permissions' }, 403)
    }

    const body = await ctx.req.json()
    const input = CreateUserSchema.parse(body)

    const existing = Array.from(userStore.values()).find((u) => u.email === input.email)
    if (existing) {
      return ctx.json({ error: 'Email already registered' }, 400)
    }

    const userId = `user_${Date.now()}`
    userStore.set(userId, {
      id: userId,
      name: input.name,
      email: input.email,
      password: input.password,
      role: 'user',
    })

    await cache.delete('users:all')
    return ctx.json({ success: true, userId }, 201)
  },

  health: async (ctx: ApiContext) => {
    return ctx.json({ status: 'ok', timestamp: new Date().toISOString() }, 200)
  },
})
