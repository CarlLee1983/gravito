import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { definefortifyConfig } from '../../src/config'
import { OAuthController } from '../../src/controllers/OAuthController'
import { ErrorCodes } from '../../src/errors/codes'
import { createMockContext } from '../helpers/mock-context'

class MockBuilder {
  where = mock(() => this)
  insert = mock().mockResolvedValue([1])
  update = mock().mockResolvedValue(1)
  first = mock().mockResolvedValue(null)
}

describe('OAuthController', () => {
  let controller: OAuthController
  let mockOAuthService: any
  let mockDb: any
  let mockQueryBuilder: MockBuilder
  let config: any

  beforeEach(() => {
    config = definefortifyConfig({
      userModel: () =>
        ({
          create: mock().mockResolvedValue({ id: 1 }),
          query: mock().mockReturnValue({
            where: mock().mockReturnValue({
              first: mock().mockResolvedValue(null),
            }),
          }),
          find: mock().mockResolvedValue({ id: 1 }),
        }) as any,
      features: { oauth: true },
      jsonMode: true,
      redirects: { login: '/dashboard' },
    })

    mockOAuthService = {
      hasProvider: mock().mockReturnValue(true),
      getProvider: mock().mockReturnValue({
        getAuthorizationUrl: mock().mockReturnValue('https://auth.url'),
        getUser: mock().mockResolvedValue({
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        }),
      }),
    }

    mockQueryBuilder = new MockBuilder()
    mockDb = {
      table: mock(() => mockQueryBuilder),
    }

    controller = new OAuthController(config, mockOAuthService, () => mockDb)
  })

  test('redirect generates authorization url', async () => {
    const context = createMockContext({
      session: {},
    })
    const ctxAny = context as any
    ctxAny.req.param = (k: string) => (k === 'provider' ? 'google' : undefined)

    const response = await controller.redirect(context)

    expect(response.headers.get('Location')).toBe('https://auth.url')
    expect(mockOAuthService.getProvider).toHaveBeenCalledWith('google')
  })

  test('redirect handles unknown provider', async () => {
    mockOAuthService.hasProvider.mockReturnValue(false)

    const context = createMockContext({})
    const ctxAny = context as any
    ctxAny.req.param = (k: string) => (k === 'provider' ? 'unknown' : undefined)

    const response = await controller.redirect(context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe(ErrorCodes.OAUTH_UNKNOWN_PROVIDER)
  })

  test('callback handles successful flow', async () => {
    const context = createMockContext({
      query: { code: 'code-123', state: 'state-123' },
      session: { oauth_state: 'state-123' },
    })
    const ctxAny = context as any
    ctxAny.req.param = (k: string) => (k === 'provider' ? 'google' : undefined)
    ctxAny.req.query = (k: string) =>
      k === 'code' ? 'code-123' : k === 'state' ? 'state-123' : undefined

    const response = await controller.callback(context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    expect(mockOAuthService.getProvider).toHaveBeenCalledWith('google')
    expect(mockQueryBuilder.insert).toHaveBeenCalled()
  })

  test('callback validates state', async () => {
    const context = createMockContext({
      query: { code: 'code-123', state: 'bad-state' },
      session: { oauth_state: 'good-state' },
    })
    const ctxAny = context as any
    ctxAny.req.param = (k: string) => (k === 'provider' ? 'google' : undefined)
    ctxAny.req.query = (k: string) =>
      k === 'code' ? 'code-123' : k === 'state' ? 'bad-state' : undefined

    const response = await controller.callback(context)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe(ErrorCodes.OAUTH_INVALID_STATE)
  })
})
