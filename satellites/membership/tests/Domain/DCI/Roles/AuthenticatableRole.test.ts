import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { MembershipError } from '../../../../src/Application/Errors/MembershipError'
import type { IMemberRepository } from '../../../../src/Domain/Contracts/IMemberRepository'
import { injectAuthenticatableRole } from '../../../../src/Domain/DCI/Roles/AuthenticatableRole'
import { Member, MemberStatus } from '../../../../src/Domain/Entities/Member'

describe('AuthenticatableRole', () => {
  let mockRepository: IMemberRepository
  let mockCore: Partial<PlanetCore>
  let member: Member

  beforeEach(() => {
    mockRepository = {
      save: mock(),
    } as any

    mockCore = {
      hasher: {
        check: mock(async (plain: string, hash: string) => plain === 'correct_password'),
      },
      container: {
        make: mock(),
      },
    }

    member = Member.create('user1', 'John Doe', 'john@example.com', 'hashed_password')
  })

  describe('verifyCredentials', () => {
    it('should verify correct password', async () => {
      const role = injectAuthenticatableRole(member, mockRepository, mockCore as PlanetCore)

      const result = await role.verifyCredentials('correct_password')

      expect(result).toBe(true)
      expect(mockCore.hasher?.check).toHaveBeenCalledWith('correct_password', member.passwordHash)
    })

    it('should throw error on incorrect password', async () => {
      const role = injectAuthenticatableRole(member, mockRepository, mockCore as PlanetCore)

      try {
        await role.verifyCredentials('wrong_password')
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('INVALID_CREDENTIALS')
      }
    })
  })

  describe('isActive', () => {
    it('should return true for active member', () => {
      member.verifyEmail() // Make it active

      const role = injectAuthenticatableRole(member, mockRepository, mockCore as PlanetCore)

      const result = role.isActive()

      expect(result).toBe(true)
    })

    it('should throw error for pending member', () => {
      // Member starts in PENDING status
      const role = injectAuthenticatableRole(member, mockRepository, mockCore as PlanetCore)

      try {
        role.isActive()
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('MEMBER_INACTIVE')
      }
    })

    it('should throw error for suspended member', () => {
      member.verifyEmail()
      member.updateMetadata({ status: MemberStatus.SUSPENDED })

      const role = injectAuthenticatableRole(member, mockRepository, mockCore as PlanetCore)

      try {
        role.isActive()
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('MEMBER_INACTIVE')
      }
    })
  })

  describe('recordLogin', () => {
    it('should save member without sessionId', async () => {
      member.verifyEmail()

      const role = injectAuthenticatableRole(member, mockRepository, mockCore as PlanetCore)

      await role.recordLogin(mockRepository)

      expect(mockRepository.save).toHaveBeenCalledWith(member)
    })

    it('should bind sessionId if provided', async () => {
      member.verifyEmail()

      const role = injectAuthenticatableRole(member, mockRepository, mockCore as PlanetCore)

      await role.recordLogin(mockRepository, 'session-123')

      expect(member.currentSessionId).toBe('session-123')
      expect(mockRepository.save).toHaveBeenCalledWith(member)
    })
  })
})
