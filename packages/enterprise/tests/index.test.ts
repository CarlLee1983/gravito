import { describe, expect, it } from 'bun:test'
import { Entity, UseCase, ValueObject } from '../src'

describe('@gravito/enterprise', () => {
  describe('Entity', () => {
    class User extends Entity<string> {}

    it('should have identity', () => {
      const user = new User('123')
      expect(user.id).toBe('123')
    })

    it('should be equal if ids match', () => {
      const user1 = new User('123')
      const user2 = new User('123')
      expect(user1.equals(user2)).toBe(true)
    })

    it('should not be equal if ids differ', () => {
      const user1 = new User('123')
      const user2 = new User('456')
      expect(user1.equals(user2)).toBe(false)
    })
  })

  describe('ValueObject', () => {
    class Email extends ValueObject<{ value: string }> {}

    it('should be equal if properties match', () => {
      const email1 = new Email({ value: 'test@example.com' })
      const email2 = new Email({ value: 'test@example.com' })
      expect(email1.equals(email2)).toBe(true)
    })

    it('should not be equal if properties differ', () => {
      const email1 = new Email({ value: 'test@example.com' })
      const email2 = new Email({ value: 'other@example.com' })
      expect(email1.equals(email2)).toBe(false)
    })
  })

  describe('UseCase', () => {
    class CreateUser extends UseCase<{ name: string }, { id: string }> {
      execute(_input: { name: string }): { id: string } {
        return { id: '123' }
      }
    }

    it('should execute', () => {
      const useCase = new CreateUser()
      const result = useCase.execute({ name: 'Test' })
      expect(result.id).toBe('123')
    })
  })
})
