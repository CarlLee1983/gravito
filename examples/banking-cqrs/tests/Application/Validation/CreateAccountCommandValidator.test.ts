import { describe, expect, it } from 'bun:test'
import { CreateAccountCommand } from '../../../src/Application/Commands/CreateAccount/CreateAccountCommand'
import { CreateAccountCommandValidator } from '../../../src/Application/Validation/Validators/CreateAccountCommandValidator'

describe('CreateAccountCommandValidator', () => {
  const validator = new CreateAccountCommandValidator()

  describe('valid commands', () => {
    it('should pass valid command with all fields', () => {
      const command = new CreateAccountCommand('acc-001', 'John Doe', 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should pass with different valid currencies', () => {
      const currencies = ['USD', 'EUR', 'JPY', 'GBP']

      for (const currency of currencies) {
        const command = new CreateAccountCommand('acc-test', 'Test User', currency)
        const result = validator.validate(command)

        expect(result.isValid).toBe(true)
        expect(result.violations).toHaveLength(0)
      }
    })

    it('should pass with various valid account IDs', () => {
      const accountIds = ['a', 'account-001', 'acc_test_123', 'A1B2C3-456_789']

      for (const accountId of accountIds) {
        const command = new CreateAccountCommand(accountId, 'Test User', 'TWD')
        const result = validator.validate(command)

        expect(result.isValid).toBe(true)
      }
    })

    it('should pass with max length owner name (100 chars)', () => {
      const longName = 'A'.repeat(100)
      const command = new CreateAccountCommand('acc-001', longName, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
    })
  })

  describe('invalid commands - accountId', () => {
    it('should reject empty accountId', () => {
      const command = new CreateAccountCommand('', 'John Doe', 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'accountId' }))
    })

    it('should reject accountId with invalid characters', () => {
      const invalidIds = ['acc@001', 'acc.test', 'acc#123', 'acc test']

      for (const accountId of invalidIds) {
        const command = new CreateAccountCommand(accountId, 'John Doe', 'TWD')
        const result = validator.validate(command)

        expect(result.isValid).toBe(false)
        expect(result.violations.some((v) => v.field === 'accountId')).toBe(true)
      }
    })

    it('should reject accountId exceeding max length', () => {
      const longId = 'a'.repeat(51)
      const command = new CreateAccountCommand(longId, 'John Doe', 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'accountId' }))
    })
  })

  describe('invalid commands - ownerName', () => {
    it('should reject empty ownerName', () => {
      const command = new CreateAccountCommand('acc-001', '', 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'ownerName' }))
    })

    it('should reject ownerName with only whitespace', () => {
      const command = new CreateAccountCommand('acc-001', '   ', 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'ownerName' }))
    })

    it('should reject ownerName exceeding max length', () => {
      const longName = 'A'.repeat(101)
      const command = new CreateAccountCommand('acc-001', longName, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'ownerName' }))
    })
  })

  describe('invalid commands - currency', () => {
    it('should reject invalid currency format', () => {
      const invalidCurrencies = ['US', 'USDA', 'usd', 'Usd', '123', 'TW $']

      for (const currency of invalidCurrencies) {
        const command = new CreateAccountCommand('acc-001', 'John Doe', currency)
        const result = validator.validate(command)

        expect(result.isValid).toBe(false)
        expect(result.violations.some((v) => v.field === 'currency')).toBe(true)
      }
    })

    it('should reject empty currency', () => {
      const command = new CreateAccountCommand('acc-001', 'John Doe', '')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'currency' }))
    })
  })

  describe('multiple violations', () => {
    it('should collect all violations at once', () => {
      const command = new CreateAccountCommand('', '', '')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toHaveLength(3)
      expect(result.violations.map((v) => v.field).sort()).toEqual([
        'accountId',
        'currency',
        'ownerName',
      ])
    })

    it('should report specific violations for partial invalidity', () => {
      const command = new CreateAccountCommand('acc@001', 'John', 'INVALID')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toHaveLength(2)
      expect(result.violations.map((v) => v.field).sort()).toEqual(['accountId', 'currency'])
    })
  })

  describe('edge cases', () => {
    it('should handle boundary length values', () => {
      // Min length account ID (1 char)
      let command = new CreateAccountCommand('a', 'Test', 'TWD')
      let result = validator.validate(command)
      expect(result.isValid).toBe(true)

      // Max length account ID (50 chars)
      command = new CreateAccountCommand('a'.repeat(50), 'Test', 'TWD')
      result = validator.validate(command)
      expect(result.isValid).toBe(true)

      // Min length owner name (1 char)
      command = new CreateAccountCommand('acc-001', 'A', 'TWD')
      result = validator.validate(command)
      expect(result.isValid).toBe(true)

      // Max length owner name (100 chars)
      command = new CreateAccountCommand('acc-001', 'A'.repeat(100), 'TWD')
      result = validator.validate(command)
      expect(result.isValid).toBe(true)
    })

    it('should trim whitespace from fields during validation', () => {
      const command = new CreateAccountCommand('  acc-001  ', '  John Doe  ', '  TWD  ')
      const result = validator.validate(command)

      // Should still be invalid due to trimmed empty check logic
      expect(result.isValid).toBe(true)
    })
  })
})
