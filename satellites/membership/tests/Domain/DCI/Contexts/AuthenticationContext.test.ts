import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { MembershipError } from '../../../../src/Application/Errors/MembershipError'
import type { IMemberRepository } from '../../../../src/Domain/Contracts/IMemberRepository'
import { AuthenticationContext } from '../../../../src/Domain/DCI/Contexts/AuthenticationContext'
import { Member, MemberStatus } from '../../../../src/Domain/Entities/Member'

describe('AuthenticationContext', () => {
  let mockRepository: IMemberRepository
  let mockCore: Partial<PlanetCore>
  let context: AuthenticationContext

  beforeEach(() => {
    mockRepository = {
      findByEmail: mock(),
      save: mock(),
    } as any

    mockCore = {
      config: {
        get: mock((key: string) => {
          if (key === 'membership.auth.single_device') return false
          return undefined
        }),
      },
      hasher: {
        check: mock(async (plain: string, hash: string) => plain === 'correct_password'),
      },
      hooks: {
        doAction: mock(async () => {}),
      },
    }

    context = new AuthenticationContext(mockRepository, mockCore as PlanetCore)
  })

  describe('execute', () => {
    it('should successfully authenticate an active member', async () => {
      const activeMember = Member.create('user1', 'John Doe', 'john@example.com', 'hashed_password')
      activeMember.verifyEmail() // Make it active

      const input = {
        email: 'john@example.com',
        passwordPlain: 'correct_password',
      }

      ;(mockRepository.findByEmail as any).mockResolvedValue(activeMember)

      const result = await context.execute(input)

      expect(result.member).toBeDefined()
      expect(result.member.id).toBe(activeMember.id)
      expect(mockCore.hasher?.check).toHaveBeenCalledWith(
        input.passwordPlain,
        activeMember.passwordHash
      )
    })

    it('should throw error if member not found', async () => {
      const input = {
        email: 'nonexistent@example.com',
        passwordPlain: 'password123',
      }

      ;(mockRepository.findByEmail as any).mockResolvedValue(null)

      try {
        await context.execute(input)
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('MEMBER_NOT_FOUND')
      }
    })

    it('should throw error if password is incorrect', async () => {
      const activeMember = Member.create('user1', 'John Doe', 'john@example.com', 'hashed_password')
      activeMember.verifyEmail()

      const input = {
        email: 'john@example.com',
        passwordPlain: 'wrong_password',
      }

      ;(mockRepository.findByEmail as any).mockResolvedValue(activeMember)
      ;(mockCore.hasher?.check as any).mockResolvedValue(false)

      try {
        await context.execute(input)
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('INVALID_CREDENTIALS')
      }
    })

    it('should throw error if member is not active', async () => {
      const inactiveMember = Member.create(
        'user1',
        'John Doe',
        'john@example.com',
        'hashed_password'
      )
      // Don't verify email, so status remains PENDING

      const input = {
        email: 'john@example.com',
        passwordPlain: 'correct_password',
      }

      ;(mockRepository.findByEmail as any).mockResolvedValue(inactiveMember)

      try {
        await context.execute(input)
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('MEMBER_INACTIVE')
      }
    })

    it('should record login in repository', async () => {
      const activeMember = Member.create('user1', 'John Doe', 'john@example.com', 'hashed_password')
      activeMember.verifyEmail()

      const input = {
        email: 'john@example.com',
        passwordPlain: 'correct_password',
      }

      ;(mockRepository.findByEmail as any).mockResolvedValue(activeMember)
      ;(mockRepository.save as any).mockResolvedValue(undefined)

      await context.execute(input)

      expect(mockRepository.save).toHaveBeenCalledWith(expect.any(Member))
    })

    it('should trigger membership:authenticated hook', async () => {
      const activeMember = Member.create('user1', 'John Doe', 'john@example.com', 'hashed_password')
      activeMember.verifyEmail()

      const input = {
        email: 'john@example.com',
        passwordPlain: 'correct_password',
      }

      ;(mockRepository.findByEmail as any).mockResolvedValue(activeMember)

      await context.execute(input)

      expect(mockCore.hooks?.doAction).toHaveBeenCalledWith(
        'membership:authenticated',
        expect.objectContaining({
          member: activeMember,
        })
      )
    })

    it('should handle single device mode', async () => {
      const activeMember = Member.create('user1', 'John Doe', 'john@example.com', 'hashed_password')
      activeMember.verifyEmail()

      const input = {
        email: 'john@example.com',
        passwordPlain: 'correct_password',
      }

      ;(mockCore.config?.get as any).mockImplementation((key: string) => {
        if (key === 'membership.auth.single_device') return true
        return undefined
      })

      ;(mockRepository.findByEmail as any).mockResolvedValue(activeMember)
      ;(mockRepository.save as any).mockResolvedValue(undefined)

      const result = await context.execute(input)

      // Should not throw error even in single device mode
      expect(result.member).toBeDefined()
    })
  })
})
