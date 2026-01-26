import { describe, expect, mock, test } from 'bun:test'
import {
  bearerTokenAuth,
  getAuthToken,
  getAuthUser,
  tokenCan,
} from '../../src/middleware/BearerTokenAuth'
import { createMockContext, createMockNext } from '../helpers/mock-context'

describe('BearerTokenAuth Middleware', () => {
  const mockUser = { id: 1, name: 'Test User' }
  const mockToken = {
    id: 1,
    name: 'Test Token',
    abilities: ['*'],
    tokenable_type: 'User',
    tokenable_id: 1,
  }

  const mockTokenService = {
    validateToken: mock(),
  } as any

  test('authenticates valid token', async () => {
    mockTokenService.validateToken.mockResolvedValue({
      user: mockUser,
      token: mockToken,
    })

    const context = createMockContext({
      headers: {
        Authorization: 'Bearer valid_token',
      },
    })
    const next = createMockNext()

    const middleware = bearerTokenAuth(mockTokenService)
    await middleware(context, next)

    expect((next as any).wasCalled()).toBe(true)
    expect((context as any).get('auth:user')).toEqual(mockUser)
    expect((context as any).get('auth:token')).toEqual({
      id: 1,
      name: 'Test Token',
      abilities: ['*'],
    })
  })

  test('rejects missing header', async () => {
    const context = createMockContext()
    const next = createMockNext()

    const middleware = bearerTokenAuth(mockTokenService)
    await middleware(context, next)

    expect((next as any).wasCalled()).toBe(false)
    expect((context as any)._getResponseStatus()).toBe(401)
    expect((context as any)._getResponseBody()).toEqual({
      error: 'Unauthenticated',
      message: 'Missing or invalid authorization header',
    })
  })

  test('rejects invalid header format', async () => {
    const context = createMockContext({
      headers: {
        Authorization: 'Token valid_token',
      },
    })
    const next = createMockNext()

    const middleware = bearerTokenAuth(mockTokenService)
    await middleware(context, next)

    expect((next as any).wasCalled()).toBe(false)
    expect((context as any)._getResponseStatus()).toBe(401)
  })

  test('rejects invalid token', async () => {
    mockTokenService.validateToken.mockResolvedValue(null)

    const context = createMockContext({
      headers: {
        Authorization: 'Bearer invalid_token',
      },
    })
    const next = createMockNext()

    const middleware = bearerTokenAuth(mockTokenService)
    await middleware(context, next)

    expect((next as any).wasCalled()).toBe(false)
    expect((context as any)._getResponseStatus()).toBe(401)
    expect((context as any)._getResponseBody()).toEqual({
      error: 'Unauthenticated',
      message: 'Invalid or expired token',
    })
  })

  test('getAuthUser helper returns user', () => {
    const context = createMockContext()
    const ctxAny = context as any
    ctxAny.set('auth:user', mockUser)
    expect(getAuthUser(context)).toEqual(mockUser)
  })

  test('getAuthToken helper returns token', () => {
    const context = createMockContext()
    const ctxAny = context as any
    ctxAny.set('auth:token', mockToken)
    expect(getAuthToken(context)).toEqual(mockToken)
  })

  test('tokenCan helper checks abilities', () => {
    const context = createMockContext()
    const ctxAny = context as any

    ctxAny.set('auth:token', { abilities: ['*'] })
    expect(tokenCan(context, 'read')).toBe(true)

    ctxAny.set('auth:token', { abilities: ['read'] })
    expect(tokenCan(context, 'read')).toBe(true)
    expect(tokenCan(context, 'write')).toBe(false)

    const emptyContext = createMockContext()
    expect(tokenCan(emptyContext, 'read')).toBe(false)
  })
})
