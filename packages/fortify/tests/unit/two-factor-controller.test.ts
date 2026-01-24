import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { definefortifyConfig } from '../../src/config'
import { TwoFactorController } from '../../src/controllers/TwoFactorController'
import { ErrorCodes } from '../../src/errors/codes'
import { createMockContext } from '../helpers/mock-context'

class MockBuilder {
  where = mock(() => this)
  update = mock().mockResolvedValue(1)
  insert = mock().mockResolvedValue([1])
  first = mock().mockResolvedValue(null)
}

describe('TwoFactorController', () => {
  let controller: TwoFactorController
  let mockTwoFactorService: any
  let mockDb: any
  let mockQueryBuilder: MockBuilder
  let config: any

  beforeEach(() => {
    config = definefortifyConfig({
      userModel: () => ({}) as any,
      features: { twoFactorAuthentication: true },
      jsonMode: true,
      redirects: { login: '/dashboard' },
    })

    mockTwoFactorService = {
      generateSecret: mock().mockReturnValue('secret'),
      generateQrCodeUrl: mock().mockResolvedValue('data:image/png;base64,...'),
      verify: mock().mockReturnValue(true),
      generateRecoveryCodes: mock().mockReturnValue(['CODE1', 'CODE2']),
    }

    mockQueryBuilder = new MockBuilder()
    mockDb = mock(() => mockQueryBuilder)

    controller = new TwoFactorController(config, mockTwoFactorService, () => mockDb)
  })

  test('setup generates secret and qr code', async () => {
    const user = { id: 1, email: 'test@example.com' }
    const context = createMockContext({
      session: {},
    })
    const ctxAny = context as any
    ctxAny.get = (key: string) =>
      key === 'auth' ? { user: async () => user } : key === 'session' ? { set: mock() } : undefined

    const response = await controller.setup(context)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.secret).toBe('secret')
    expect(mockTwoFactorService.generateSecret).toHaveBeenCalled()
  })

  test('confirm verifies code and enables 2fa', async () => {
    const user = { id: 1 }
    const context = createMockContext({
      body: { code: '123456' },
      session: { two_factor_secret: 'secret' },
    })
    const ctxAny = context as any

    ctxAny.get = (key: string) => {
      if (key === 'auth') return { user: async () => user }
      if (key === 'session')
        return {
          get: async () => 'secret',
          forget: mock(),
        }
      return undefined
    }

    const response = await controller.confirm(context)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.recovery_codes).toEqual(['CODE1', 'CODE2'])
    expect(mockQueryBuilder.update).toHaveBeenCalled()
  })

  test('challenge validates code', async () => {
    const userId = 1
    const user = { id: 1, two_factor_secret: 'secret' }
    mockQueryBuilder.first.mockResolvedValue(user)

    const context = createMockContext({
      body: { code: '123456' },
      session: { two_factor_user_id: userId },
    })
    const ctxAny = context as any
    const mockAuth = { loginById: mock() }

    ctxAny.get = (key: string) => {
      if (key === 'session')
        return {
          get: async (k: string) => (k === 'two_factor_user_id' ? userId : undefined),
          forget: mock(),
        }
      if (key === 'auth') return mockAuth
      return undefined
    }

    const response = await controller.challenge(context)

    expect(response.status).toBe(200)
    expect(mockAuth.loginById).toHaveBeenCalledWith(userId, undefined)
  })
})
