import { describe, expect, mock, test } from 'bun:test'
import { MagicLinkService } from '../../src/services/MagicLinkService'

describe('MagicLinkService', () => {
  const mockTokenService = {
    createToken: mock(),
    validateToken: mock(),
    revokeToken: mock(),
  } as any
  const config = { magicLink: { expiresInMinutes: 15 } } as any
  const service = new MagicLinkService(config, mockTokenService)

  test('createToken creates token with correct params', async () => {
    mockTokenService.createToken.mockResolvedValue({ plainTextToken: 'token' })
    const token = await service.createToken({ id: 1 })

    expect(token).toBe('token')
    expect(mockTokenService.createToken).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        name: 'Magic Link',
        abilities: ['magic-link'],
        expiresInMinutes: 15,
      })
    )
  })

  test('verify returns user if valid', async () => {
    const user = { id: 1 }
    mockTokenService.validateToken.mockResolvedValue({
      token: { id: 10, abilities: ['magic-link'] },
      user,
    })

    const result = await service.verify('valid-token')
    expect(result).toEqual(user)
    expect(mockTokenService.revokeToken).toHaveBeenCalledWith(10)
  })

  test('verify returns null if invalid', async () => {
    mockTokenService.validateToken.mockResolvedValue(null)
    const result = await service.verify('invalid')
    expect(result).toBeNull()
  })

  test('verify returns null if incorrect ability', async () => {
    mockTokenService.validateToken.mockResolvedValue({
      token: { id: 10, abilities: ['other'] },
      user: { id: 1 },
    })
    const result = await service.verify('valid-token')
    expect(result).toBeNull()
  })
})
