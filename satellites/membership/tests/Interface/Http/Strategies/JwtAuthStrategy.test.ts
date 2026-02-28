import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { MembershipError } from '../../../../src/Application/Errors/MembershipError'
import type { IMemberRepository } from '../../../../src/Domain/Contracts/IMemberRepository'
import { Member } from '../../../../src/Domain/Entities/Member'
import { JwtAuthStrategy } from '../../../../src/Interface/Http/Strategies/JwtAuthStrategy'

describe('JwtAuthStrategy', () => {
  let mockRepository: IMemberRepository
  let strategy: JwtAuthStrategy
  const jwtSecret = 'test-secret-key-12345'

  beforeEach(() => {
    mockRepository = {
      findById: mock(),
    } as any

    strategy = new JwtAuthStrategy(mockRepository, jwtSecret)
  })

  describe('issueCredentials', () => {
    it('should issue access and refresh tokens', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      const mockContext = { req: {} } as any

      const tokens = await strategy.issueCredentials(member, mockContext)

      expect(tokens.accessToken).toBeDefined()
      expect(tokens.refreshToken).toBeDefined()
      expect(tokens.expiresIn).toBe(15 * 60) // 15 minutes
    })

    it('should create valid JWT tokens with correct payload', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      const mockContext = { req: {} } as any

      const tokens = await strategy.issueCredentials(member, mockContext)

      // Tokens should be strings
      expect(typeof tokens.accessToken).toBe('string')
      expect(typeof tokens.refreshToken).toBe('string')

      // Should have expected JWT structure (header.payload.signature)
      expect(tokens.accessToken?.split('.').length).toBe(3)
      expect(tokens.refreshToken?.split('.').length).toBe(3)
    })
  })

  describe('revokeCredentials', () => {
    it('should not throw error on revoke', async () => {
      const mockContext = { req: {} } as any

      // JWT is stateless, revoke is no-op
      await expect(strategy.revokeCredentials(mockContext)).resolves.toBeUndefined()
    })
  })

  describe('getAuthenticatedMember', () => {
    it('should extract member from valid JWT token', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      ;(mockRepository.findById as any).mockResolvedValue(member)

      // First issue a token
      const mockContextForIssue = { req: {} } as any
      const tokens = await strategy.issueCredentials(member, mockContextForIssue)

      // Then use it to get the member
      const mockContextForAuth = {
        req: {
          header: (name: string) => {
            if (name === 'Authorization') {
              return `Bearer ${tokens.accessToken}`
            }
            return undefined
          },
        },
      } as any

      const authenticatedMember = await strategy.getAuthenticatedMember(mockContextForAuth)

      expect(authenticatedMember).toBeDefined()
      expect(authenticatedMember?.id).toBe('user1')
    })

    it('should return null if no Authorization header', async () => {
      const mockContext = {
        req: {
          header: () => undefined,
        },
      } as any

      const member = await strategy.getAuthenticatedMember(mockContext)

      expect(member).toBeNull()
    })

    it('should return null if Authorization header has wrong format', async () => {
      const mockContext = {
        req: {
          header: (name: string) => {
            if (name === 'Authorization') {
              return 'InvalidFormat token'
            }
            return undefined
          },
        },
      } as any

      const member = await strategy.getAuthenticatedMember(mockContext)

      expect(member).toBeNull()
    })

    it('should return null if token is invalid', async () => {
      const mockContext = {
        req: {
          header: (name: string) => {
            if (name === 'Authorization') {
              return 'Bearer invalid.token.here'
            }
            return undefined
          },
        },
      } as any

      const member = await strategy.getAuthenticatedMember(mockContext)

      expect(member).toBeNull()
    })

    it('should return null if member not found', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      ;(mockRepository.findById as any).mockResolvedValue(null)

      const mockContextForIssue = { req: {} } as any
      const tokens = await strategy.issueCredentials(member, mockContextForIssue)

      const mockContextForAuth = {
        req: {
          header: (name: string) => {
            if (name === 'Authorization') {
              return `Bearer ${tokens.accessToken}`
            }
            return undefined
          },
        },
      } as any

      const authenticatedMember = await strategy.getAuthenticatedMember(mockContextForAuth)

      expect(authenticatedMember).toBeNull()
    })
  })

  describe('refreshAccessToken', () => {
    it('should issue new access token from refresh token', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      ;(mockRepository.findById as any).mockResolvedValue(member)

      const mockContextForIssue = { req: {} } as any
      const tokens = await strategy.issueCredentials(member, mockContextForIssue)

      const newAccessToken = await strategy.refreshAccessToken(tokens.refreshToken!)

      expect(newAccessToken).toBeDefined()
      expect(typeof newAccessToken).toBe('string')
      expect(newAccessToken).not.toBe(tokens.accessToken)
    })

    it('should throw error if refresh token is invalid', async () => {
      try {
        await strategy.refreshAccessToken('invalid.token.here')
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('TOKEN_EXPIRED')
      }
    })

    it('should throw error if member not found', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      ;(mockRepository.findById as any).mockResolvedValue(null)

      const mockContextForIssue = { req: {} } as any
      const tokens = await strategy.issueCredentials(member, mockContextForIssue)

      try {
        await strategy.refreshAccessToken(tokens.refreshToken!)
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('MEMBER_NOT_FOUND')
      }
    })
  })
})
