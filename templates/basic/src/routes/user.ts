import { Hono } from 'hono'
import { Schema, validate } from '@gravito/validator'
import { logger } from 'hono/logger'

/**
 * 使用者路由模組
 *
 * 重要：使用 Hono 的 .route() 方法來串接模組，
 * 這是為了獲得完整 TypeScript 型別推導的必要寫法。
 */
const userRoute = new Hono()

// 使用 logger 中間件
userRoute.use('*', logger())

/**
 * 登入 API
 * POST /api/users/login
 */
userRoute.post(
  '/login',
  validate('json', Schema.Object({
    username: Schema.String({ minLength: 3 }),
    password: Schema.String({ minLength: 6 }),
  })),
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
 * 取得使用者資訊
 * GET /api/users/:id
 */
userRoute.get(
  '/:id',
  validate('param', Schema.Object({
    id: Schema.String({ pattern: '^[0-9]+$' }),
  })),
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
 * 搜尋使用者
 * GET /api/users/search?q=keyword&page=1
 */
userRoute.get(
  '/search',
  validate('query', Schema.Object({
    q: Schema.String({ minLength: 1 }),
    page: Schema.Optional(Schema.Number({ minimum: 1 })),
  })),
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

