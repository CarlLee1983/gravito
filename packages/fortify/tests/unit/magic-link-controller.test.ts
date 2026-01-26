import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { definefortifyConfig } from '../../src/config'
import { MagicLinkController } from '../../src/controllers/MagicLinkController'
import { ErrorCodes } from '../../src/errors/codes'
import { createMockContext } from '../helpers/mock-context'

describe('MagicLinkController', () => {
  let controller: MagicLinkController
  let mockMagicLinkService: any
  let mockUserModel: any
  let config: any

  beforeEach(() => {
    mockUserModel = {
      query: mock().mockReturnValue({
        where: mock().mockReturnValue({
          first: mock().mockResolvedValue({ id: 1 }),
        }),
      }),
    }

    config = definefortifyConfig({
      userModel: () => mockUserModel,
      features: { magicLink: true },
      jsonMode: true,
      redirects: { login: '/dashboard' },
    })

    mockMagicLinkService = {
      createToken: mock().mockResolvedValue('token'),
      verify: mock().mockResolvedValue({ id: 1 }),
    }

    controller = new MagicLinkController(config, mockMagicLinkService)
  })

  test('send creates token and returns success', async () => {
    const context = createMockContext({
      body: { email: 'test@example.com' },
    })

    const response = await controller.send(context)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockMagicLinkService.createToken).toHaveBeenCalled()
  })

  test('send returns success even if user not found (security)', async () => {
    mockUserModel.query().where().first.mockResolvedValue(null)

    const context = createMockContext({
      body: { email: 'unknown@example.com' },
    })

    const response = await controller.send(context)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockMagicLinkService.createToken).not.toHaveBeenCalled()
  })

  test('verify logs in user', async () => {
    const context = createMockContext({})
    const ctxAny = context as any
    ctxAny.req.param = (k: string) => (k === 'token' ? 'valid' : undefined)
    const mockAuth = { login: mock() }
    ctxAny.get = (k: string) => (k === 'auth' ? mockAuth : undefined)

    const response = await controller.verify(context)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockAuth.login).toHaveBeenCalled()
  })

  test('verify returns error for invalid token', async () => {
    mockMagicLinkService.verify.mockResolvedValue(null)

    const context = createMockContext({})
    const ctxAny = context as any
    ctxAny.req.param = (k: string) => (k === 'token' ? 'invalid' : undefined)

    const response = await controller.verify(context)
    const data = await response.json()

    expect(data.success).toBe(false)
    expect(data.error.code).toBe(ErrorCodes.MAGIC_LINK_INVALID)
  })
})
