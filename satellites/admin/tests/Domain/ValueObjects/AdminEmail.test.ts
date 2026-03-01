import { describe, expect, it } from 'bun:test'
import { AdminEmail } from '../../../src/Domain/ValueObjects/AdminEmail'

describe('AdminEmail ValueObject', () => {
  it('should create email with valid format', () => {
    const email = AdminEmail.create('admin@example.com')
    expect(email.value).toBe('admin@example.com')
  })

  it('should reject invalid email format', () => {
    expect(() => AdminEmail.create('not-an-email')).toThrow('Invalid email format')
    expect(() => AdminEmail.create('missing@')).toThrow('Invalid email format')
    expect(() => AdminEmail.create('@no-local.com')).toThrow('Invalid email format')
    expect(() => AdminEmail.create('')).toThrow('Invalid email format')
    expect(() => AdminEmail.create('spaces in@email.com')).toThrow('Invalid email format')
  })

  it('should normalize email to lowercase', () => {
    const email = AdminEmail.create('Admin@EXAMPLE.COM')
    expect(email.value).toBe('admin@example.com')

    const email2 = AdminEmail.create('  User@Test.COM  ')
    expect(email2.value).toBe('user@test.com')
  })

  it('should reject email exceeding 254 characters', () => {
    const longLocal = 'a'.repeat(245)
    const longEmail = `${longLocal}@example.com`
    expect(() => AdminEmail.create(longEmail)).toThrow('too long')
  })

  it('should reconstitute from existing value without validation', () => {
    const email = AdminEmail.reconstitute('stored@db.com')
    expect(email.value).toBe('stored@db.com')
  })

  it('should compare equality correctly', () => {
    const email1 = AdminEmail.create('admin@example.com')
    const email2 = AdminEmail.create('ADMIN@Example.COM')
    const email3 = AdminEmail.create('other@example.com')

    expect(email1.equals(email2)).toBe(true)
    expect(email1.equals(email3)).toBe(false)
  })
})
