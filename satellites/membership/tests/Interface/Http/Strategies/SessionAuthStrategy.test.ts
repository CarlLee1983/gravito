import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { MembershipError } from '../../../../src/Application/Errors/MembershipError'
import { Member } from '../../../../src/Domain/Entities/Member'
import { SessionAuthStrategy } from '../../../../src/Interface/Http/Strategies/SessionAuthStrategy'

describe('SessionAuthStrategy', () => {
  let mockCore: Partial<PlanetCore>
  let strategy: SessionAuthStrategy

  beforeEach(() => {
    mockCore = {
      container: {
        make: mock((key: string) => {
          if (key === 'auth') {
            return {
              guard: () => ({
                loginUsingId: mock(async () => true),
                logout: mock(async () => {}),
                user: mock(async () => null),
              }),
            }
          }
          return null
        }),
      },
    }

    strategy = new SessionAuthStrategy(mockCore as PlanetCore)
  })

  describe('issueCredentials', () => {
    it('should create session for member', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      const mockContext = { req: {} } as any

      const tokens = await strategy.issueCredentials(member, mockContext)

      expect(tokens).toBeDefined()
      expect(mockCore.container?.make).toHaveBeenCalledWith('auth')
    })

    it('should throw error if session creation fails', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      const mockContext = { req: {} } as any

      ;(mockCore.container?.make as any).mockImplementation((key: string) => {
        if (key === 'auth') {
          return {
            guard: () => ({
              loginUsingId: mock(async () => false), // Simulate failure
            }),
          }
        }
        return null
      })

      try {
        await strategy.issueCredentials(member, mockContext)
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('INVALID_CREDENTIALS')
      }
    })
  })

  describe('revokeCredentials', () => {
    it('should logout member', async () => {
      const mockContext = { req: {} } as any

      await strategy.revokeCredentials(mockContext)

      expect(mockCore.container?.make).toHaveBeenCalledWith('auth')
    })

    it('should throw error if logout fails', async () => {
      const mockContext = { req: {} } as any

      ;(mockCore.container?.make as any).mockImplementation(() => {
        throw new Error('Session service not available')
      })

      try {
        await strategy.revokeCredentials(mockContext)
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('UNAUTHORIZED')
      }
    })
  })

  describe('getAuthenticatedMember', () => {
    it('should retrieve authenticated member from session', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      member.verifyEmail()

      ;(mockCore.container?.make as any).mockImplementation((key: string) => {
        if (key === 'auth') {
          return {
            guard: () => ({
              user: mock(async () => member),
            }),
          }
        }
        return null
      })

      const mockContext = { req: {} } as any
      const authenticatedMember = await strategy.getAuthenticatedMember(mockContext)

      expect(authenticatedMember).toBeDefined()
      expect(authenticatedMember?.id).toBe('user1')
    })

    it('should return null if no member in session', async () => {
      ;(mockCore.container?.make as any).mockImplementation((key: string) => {
        if (key === 'auth') {
          return {
            guard: () => ({
              user: mock(async () => null),
            }),
          }
        }
        return null
      })

      const mockContext = { req: {} } as any
      const authenticatedMember = await strategy.getAuthenticatedMember(mockContext)

      expect(authenticatedMember).toBeNull()
    })

    it('should return null if auth service fails', async () => {
      ;(mockCore.container?.make as any).mockImplementation(() => {
        throw new Error('Auth service unavailable')
      })

      const mockContext = { req: {} } as any
      const authenticatedMember = await strategy.getAuthenticatedMember(mockContext)

      expect(authenticatedMember).toBeNull()
    })
  })
})
