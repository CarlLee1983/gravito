import { beforeEach, describe, expect, it } from 'bun:test'
import { injectProfileOwnerRole } from '../../../../src/Domain/DCI/Roles/ProfileOwnerRole'
import { Member } from '../../../../src/Domain/Entities/Member'

describe('ProfileOwnerRole', () => {
  let member: Member

  beforeEach(() => {
    member = Member.create('user1', 'John Doe', 'john@example.com', 'hashed_password')
    member.verifyEmail()
  })

  describe('canUpdateProfile', () => {
    it('should return true for existing member', () => {
      const role = injectProfileOwnerRole(member)

      const result = role.canUpdateProfile()

      expect(result).toBe(true)
    })

    it('should return true even for unverified member', () => {
      const newMember = Member.create('user2', 'Jane Doe', 'jane@example.com', 'hash')
      // Don't verify email

      const role = injectProfileOwnerRole(newMember)

      const result = role.canUpdateProfile()

      expect(result).toBe(true)
    })
  })

  describe('sanitizeProfileUpdate', () => {
    it('should allow name update', () => {
      const role = injectProfileOwnerRole(member)

      const sanitized = role.sanitizeProfileUpdate({
        name: 'New Name',
      })

      expect(sanitized.name).toBe('New Name')
    })

    it('should trim and limit name to 255 characters', () => {
      const role = injectProfileOwnerRole(member)

      const longName = 'a'.repeat(300)
      const sanitized = role.sanitizeProfileUpdate({
        name: longName,
      })

      expect(sanitized.name?.length).toBeLessThanOrEqual(255)
    })

    it('should trim name with whitespace', () => {
      const role = injectProfileOwnerRole(member)

      const sanitized = role.sanitizeProfileUpdate({
        name: '  Trimmed Name  ',
      })

      expect(sanitized.name).toBe('Trimmed Name')
    })

    it('should allow metadata update', () => {
      const role = injectProfileOwnerRole(member)

      const sanitized = role.sanitizeProfileUpdate({
        metadata: {
          theme: 'dark',
          language: 'fr',
        },
      })

      expect(sanitized.metadata?.theme).toBe('dark')
      expect(sanitized.metadata?.language).toBe('fr')
    })

    it('should prevent roles modification via metadata', () => {
      const role = injectProfileOwnerRole(member)

      const sanitized = role.sanitizeProfileUpdate({
        metadata: {
          roles: ['admin'],
        },
      })

      expect(sanitized.metadata?.roles).toBeUndefined()
    })

    it('should prevent status modification via metadata', () => {
      const role = injectProfileOwnerRole(member)

      const sanitized = role.sanitizeProfileUpdate({
        metadata: {
          status: 'suspended',
        },
      })

      expect(sanitized.metadata?.status).toBeUndefined()
    })

    it('should merge metadata with existing', () => {
      member.updateMetadata({
        theme: 'light',
        language: 'en',
      })

      const role = injectProfileOwnerRole(member)

      const sanitized = role.sanitizeProfileUpdate({
        metadata: {
          language: 'fr',
        },
      })

      expect(sanitized.metadata?.theme).toBe('light') // Existing
      expect(sanitized.metadata?.language).toBe('fr') // Updated
    })

    it('should return empty object if no valid fields', () => {
      const role = injectProfileOwnerRole(member)

      const sanitized = role.sanitizeProfileUpdate({})

      expect(Object.keys(sanitized).length).toBe(0)
    })

    it('should handle undefined metadata gracefully', () => {
      const role = injectProfileOwnerRole(member)

      const sanitized = role.sanitizeProfileUpdate({
        name: 'New Name',
        metadata: undefined,
      })

      expect(sanitized.name).toBe('New Name')
      expect(sanitized.metadata).toBeUndefined()
    })
  })
})
