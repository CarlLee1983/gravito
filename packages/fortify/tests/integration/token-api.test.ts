import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { definefortifyConfig } from '../../src/config'
import { TokenController } from '../../src/controllers/TokenController'
import { createMockContext } from '../helpers/mock-context'

describe('TokenController Integration', () => {
  let controller: TokenController
  let mockTokenService: any
  let config: any

  beforeEach(() => {
    config = definefortifyConfig({
      userModel: () => ({}) as any,
      features: {
        apiTokens: true,
        registration: true,
        resetPasswords: true,
      },
      jsonMode: true,
      redirects: {
        login: '/dashboard',
        logout: '/',
        register: '/dashboard',
        passwordReset: '/login',
        emailVerification: '/dashboard',
      },
    })

    mockTokenService = {
      listTokens: mock(),
      createToken: mock(),
      revokeToken: mock(),
      revokeAllTokens: mock(),
      findById: mock(),
    }

    controller = new TokenController(config, mockTokenService)
  })

  test('index lists user tokens', async () => {
    const user = { id: 1, name: 'Test User' }
    const tokens = [
      { id: 1, name: 'Token 1', created_at: new Date() },
      { id: 2, name: 'Token 2', created_at: new Date() },
    ]

    mockTokenService.listTokens.mockResolvedValue(tokens)

    const context = createMockContext()
    const ctxAny = context as any
    ctxAny.set('auth:user', user)

    const response = await controller.index(context)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.tokens).toHaveLength(2)
    expect(mockTokenService.listTokens).toHaveBeenCalledWith(user.id)
  })

  test('store creates new token', async () => {
    const user = { id: 1 }
    const newToken = { id: 3, name: 'New Token', abilities: ['*'] }
    const plainTextToken = '3|plaintext'

    mockTokenService.createToken.mockResolvedValue({
      plainTextToken,
      accessToken: newToken,
    })

    const context = createMockContext({
      body: { name: 'New Token' },
    })
    const ctxAny = context as any
    ctxAny.set('auth:user', user)

    const response = await controller.store(context)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.plain_text_token).toBe(plainTextToken)
    expect(mockTokenService.createToken).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        name: 'New Token',
      })
    )
  })

  test('store validates input', async () => {
    const user = { id: 1 }
    const context = createMockContext({
      body: { name: '' },
    })
    const ctxAny = context as any
    ctxAny.set('auth:user', user)

    const response = await controller.store(context)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.error.details.errors).toHaveProperty('name')
  })

  test('destroy revokes token', async () => {
    const user = { id: 1 }
    const token = { id: 1, tokenable_id: 1, name: 'Token 1' }

    mockTokenService.findById.mockResolvedValue(token)
    mockTokenService.revokeToken.mockResolvedValue(true)

    const context = createMockContext({
      path: '/tokens/1',
    })

    const ctxAny = context as any
    ctxAny.req.param = (key: string) => (key === 'id' ? '1' : undefined)
    ctxAny.set('auth:user', user)

    const response = await controller.destroy(context)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockTokenService.revokeToken).toHaveBeenCalledWith(1)
  })

  test('destroy forbids revoking others tokens', async () => {
    const user = { id: 1 }
    const token = { id: 2, tokenable_id: 2, name: 'Other Token' }

    mockTokenService.findById.mockResolvedValue(token)

    const context = createMockContext()
    const ctxAny = context as any
    ctxAny.req.param = (key: string) => (key === 'id' ? '2' : undefined)
    ctxAny.set('auth:user', user)

    const response = await controller.destroy(context)

    expect(response.status).toBe(403)
  })

  test('destroyAll revokes all tokens', async () => {
    const user = { id: 1 }
    mockTokenService.revokeAllTokens.mockResolvedValue(5)

    const context = createMockContext()
    const ctxAny = context as any
    ctxAny.set('auth:user', user)

    const response = await controller.destroyAll(context)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.count).toBe(5)
    expect(mockTokenService.revokeAllTokens).toHaveBeenCalledWith(user.id)
  })
})
