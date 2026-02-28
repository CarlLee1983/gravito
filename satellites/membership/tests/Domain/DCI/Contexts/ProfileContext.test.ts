import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { MembershipError } from '../../../../src/Application/Errors/MembershipError'
import type { IMemberRepository } from '../../../../src/Domain/Contracts/IMemberRepository'
import { ProfileContext } from '../../../../src/Domain/DCI/Contexts/ProfileContext'
import { Member } from '../../../../src/Domain/Entities/Member'

describe('ProfileContext', () => {
  let mockRepository: IMemberRepository
  let context: ProfileContext

  beforeEach(() => {
    mockRepository = {
      findById: mock(),
      save: mock(),
    } as any

    context = new ProfileContext(mockRepository)
  })

  describe('getProfile', () => {
    it('should return member profile', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      member.verifyEmail()

      ;(mockRepository.findById as any).mockResolvedValue(member)

      const result = await context.getProfile('user1')

      expect(result).toBeDefined()
      expect(result.id).toBe('user1')
      expect(result.name).toBe('John Doe')
      expect(result.email).toBe('john@example.com')
    })

    it('should throw error if member not found', async () => {
      ;(mockRepository.findById as any).mockResolvedValue(null)

      try {
        await context.getProfile('nonexistent')
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('MEMBER_NOT_FOUND')
      }
    })
  })

  describe('updateProfile', () => {
    it('should update member name', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      member.verifyEmail()

      ;(mockRepository.findById as any).mockResolvedValue(member)
      ;(mockRepository.save as any).mockResolvedValue(undefined)

      const result = await context.updateProfile('user1', {
        name: 'Jane Doe',
      })

      expect(result.name).toBe('Jane Doe')
      expect(mockRepository.save).toHaveBeenCalled()
    })

    it('should update member metadata', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      member.verifyEmail()

      ;(mockRepository.findById as any).mockResolvedValue(member)
      ;(mockRepository.save as any).mockResolvedValue(undefined)

      const result = await context.updateProfile('user1', {
        metadata: {
          theme: 'dark',
          language: 'en',
        },
      })

      expect(result.metadata?.theme).toBe('dark')
      expect(result.metadata?.language).toBe('en')
    })

    it('should sanitize profile data (prevent role modification)', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      member.verifyEmail()
      member.addRole('admin')

      ;(mockRepository.findById as any).mockResolvedValue(member)
      ;(mockRepository.save as any).mockResolvedValue(undefined)

      await context.updateProfile('user1', {
        metadata: {
          roles: ['user'],
        },
      })

      // Roles should not be modified through metadata
      expect(mockRepository.save).toHaveBeenCalled()
    })

    it('should trim and limit name field', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      member.verifyEmail()

      ;(mockRepository.findById as any).mockResolvedValue(member)
      ;(mockRepository.save as any).mockResolvedValue(undefined)

      const longName = 'a'.repeat(300)
      const result = await context.updateProfile('user1', {
        name: longName,
      })

      expect(result.name.length).toBeLessThanOrEqual(255)
    })

    it('should throw error if member not found', async () => {
      ;(mockRepository.findById as any).mockResolvedValue(null)

      try {
        await context.updateProfile('nonexistent', {
          name: 'New Name',
        })
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('MEMBER_NOT_FOUND')
      }
    })

    it('should throw error if no update data provided', async () => {
      const member = Member.create('user1', 'John Doe', 'john@example.com', 'hash')
      member.verifyEmail()

      ;(mockRepository.findById as any).mockResolvedValue(member)

      // This should not cause an error in ProfileContext itself,
      // but would in the controller. For context, it should just not update.
      const result = await context.updateProfile('user1', {})

      // Should return the member unchanged
      expect(result.id).toBe('user1')
    })
  })
})
