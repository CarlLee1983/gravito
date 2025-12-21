import { Schema, validate } from '@gravito/mass'
import { Hono } from 'hono'
import { logger } from 'hono/logger'

/**
 * User route module.
 *
 * Important: use Hono's `.route()` to compose modules. This is required to preserve full
 * TypeScript type inference.
 */
const userRoute = new Hono()

// Use logger middleware
userRoute.use('*', logger())

/**
 * Login
 * POST /api/users/login
 */
userRoute.post(
  '/login',
  validate(
    'json',
    Schema.Object({
      username: Schema.String({ minLength: 3 }),
      password: Schema.String({ minLength: 6 }),
    })
  ),
  (c) => {
    const { username } = c.req.valid('json')
    return c.json({
      success: true,
      token: 'fake-jwt-token',
      message: `Welcome ${username}`,
    })
  }
)

/**
 * Get user info
 * GET /api/users/:id
 */
userRoute.get(
  '/:id',
  validate(
    'param',
    Schema.Object({
      id: Schema.String({ pattern: '^[0-9]+$' }),
    })
  ),
  (c) => {
    const { id } = c.req.valid('param')
    return c.json({
      success: true,
      user: {
        id: parseInt(id, 10),
        name: 'John Doe',
        email: 'john@example.com',
      },
    })
  }
)

/**
 * Search users
 * GET /api/users/search?q=keyword&page=1
 */
userRoute.get(
  '/search',
  validate(
    'query',
    Schema.Object({
      q: Schema.String({ minLength: 1 }),
      page: Schema.Optional(Schema.Number({ minimum: 1 })),
    })
  ),
  (c) => {
    const { q, page } = c.req.valid('query')
    return c.json({
      success: true,
      query: q,
      page: page ?? 1,
      results: [],
    })
  }
)

export { userRoute }
