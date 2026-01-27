import { Schema, validate } from '@gravito/mass'
import { Photon } from '@gravito/photon'
import { logger } from '@gravito/photon/logger'

const userRoute = new Photon()

userRoute.use('*', logger())

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
    const { username } = (c as any).req.valid('json')
    return c.json({
      success: true,
      token: 'fake-jwt-token',
      message: `Welcome ${username}`,
    })
  }
)

userRoute.get(
  '/:id',
  validate(
    'param',
    Schema.Object({
      id: Schema.String({ pattern: '^[0-9]+$' }),
    })
  ),
  (c) => {
    const { id } = (c as any).req.valid('param')
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
    const { q, page } = (c as any).req.valid('query')
    return c.json({
      success: true,
      query: q,
      page: page ?? 1,
      results: [],
    })
  }
)

export { userRoute }