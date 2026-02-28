import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { MembershipError } from '../../../../src/Application/Errors/MembershipError'
import type { IMemberRepository } from '../../../../src/Domain/Contracts/IMemberRepository'
import { injectRegistrantRole } from '../../../../src/Domain/DCI/Roles/RegistrantRole'
import { Member } from '../../../../src/Domain/Entities/Member'

describe('RegistrantRole', () => {
  let mockRepository: IMemberRepository
  let member: Member

  beforeEach(() => {
    mockRepository = {
      findByEmail: mock(),
    } as any

    member = Member.create('user1', 'John Doe', 'john@example.com', 'hashed_password')
  })

  describe('validateUniqueness', () => {
    it('should pass validation for unique email', async () => {
      ;(mockRepository.findByEmail as any).mockResolvedValue(null)

      const role = injectRegistrantRole(member, mockRepository)

      await expect(role.validateUniqueness()).resolves.toBeUndefined()
    })

    it('should throw error if email already exists', async () => {
      const existingMember = Member.create('other-user', 'Other User', 'john@example.com', 'hash')
      ;(mockRepository.findByEmail as any).mockResolvedValue(existingMember)

      const role = injectRegistrantRole(member, mockRepository)

      try {
        await role.validateUniqueness()
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('MEMBER_EXISTS')
      }
    })

    it('should check repository with member email', async () => {
      ;(mockRepository.findByEmail as any).mockResolvedValue(null)

      const role = injectRegistrantRole(member, mockRepository)

      await role.validateUniqueness()

      expect(mockRepository.findByEmail).toHaveBeenCalledWith('john@example.com')
    })
  })

  describe('getVerificationToken', () => {
    it('should return verification token', () => {
      const role = injectRegistrantRole(member, mockRepository)

      const token = role.getVerificationToken()

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token).toBe(member.verificationToken)
    })

    it('should return undefined if token cleared', () => {
      member.verifyEmail() // Clears verification token

      const role = injectRegistrantRole(member, mockRepository)

      const token = role.getVerificationToken()

      expect(token).toBeUndefined()
    })
  })
})
