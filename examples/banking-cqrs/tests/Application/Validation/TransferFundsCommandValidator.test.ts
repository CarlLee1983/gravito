import { describe, expect, it } from 'bun:test'
import { TransferFundsCommand } from '../../../src/Application/Commands/TransferFunds/TransferFundsCommand'
import { TransferFundsCommandValidator } from '../../../src/Application/Validation/Validators/TransferFundsCommandValidator'

describe('TransferFundsCommandValidator', () => {
  const validator = new TransferFundsCommandValidator()

  describe('valid commands', () => {
    it('should pass valid transfer command', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-002', 100000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should pass with minimum amount', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-002', 1, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
    })

    it('should pass with maximum amount (10,000,000 cents)', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-002', 10000000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
    })

    it('should pass with different currencies', () => {
      const currencies = ['TWD', 'USD', 'EUR', 'JPY', 'GBP']

      for (const currency of currencies) {
        const command = new TransferFundsCommand('acc-001', 'acc-002', 50000, currency)
        const result = validator.validate(command)

        expect(result.isValid).toBe(true)
      }
    })

    it('should pass with various valid account IDs', () => {
      const accountIds = [
        ['a', 'b'],
        ['acc-001', 'acc-002'],
        ['from_acc', 'to_acc'],
        ['A1B2C3', 'X9Y8Z7'],
      ]

      for (const [from, to] of accountIds) {
        const command = new TransferFundsCommand(from, to, 50000, 'TWD')
        const result = validator.validate(command)

        expect(result.isValid).toBe(true)
      }
    })
  })

  describe('invalid commands - fromAccountId', () => {
    it('should reject empty fromAccountId', () => {
      const command = new TransferFundsCommand('', 'acc-002', 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'fromAccountId' }))
    })

    it('should reject fromAccountId with invalid characters', () => {
      const command = new TransferFundsCommand('acc@001', 'acc-002', 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations.some((v) => v.field === 'fromAccountId')).toBe(true)
    })

    it('should reject fromAccountId exceeding max length', () => {
      const longId = 'a'.repeat(51)
      const command = new TransferFundsCommand(longId, 'acc-002', 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations.some((v) => v.field === 'fromAccountId')).toBe(true)
    })
  })

  describe('invalid commands - toAccountId', () => {
    it('should reject empty toAccountId', () => {
      const command = new TransferFundsCommand('acc-001', '', 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'toAccountId' }))
    })

    it('should reject toAccountId with invalid characters', () => {
      const command = new TransferFundsCommand('acc-001', 'acc@002', 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations.some((v) => v.field === 'toAccountId')).toBe(true)
    })

    it('should reject self-transfer (same account IDs)', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-001', 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'toAccountId' }))
      expect(result.violations[0].message).toContain('自轉帳')
    })

    it('should reject toAccountId exceeding max length', () => {
      const longId = 'a'.repeat(51)
      const command = new TransferFundsCommand('acc-001', longId, 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations.some((v) => v.field === 'toAccountId')).toBe(true)
    })
  })

  describe('invalid commands - amountCents', () => {
    it('should reject zero amount', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-002', 0, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'amountCents' }))
    })

    it('should reject negative amount', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-002', -50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'amountCents' }))
    })

    it('should reject non-integer amount', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-002', 50000.5, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'amountCents' }))
    })

    it('should reject amount exceeding max limit', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-002', 10000001, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'amountCents' }))
      expect(result.violations[0].message).toContain('不得超過')
    })
  })

  describe('invalid commands - currency', () => {
    it('should reject lowercase currency', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-002', 50000, 'twd')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'currency' }))
    })

    it('should reject currency with invalid length', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-002', 50000, 'TWDA')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'currency' }))
    })

    it('should reject currency with special characters', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-002', 50000, 'TW$')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'currency' }))
    })

    it('should reject empty currency', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-002', 50000, '')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'currency' }))
    })
  })

  describe('multiple violations', () => {
    it('should collect multiple violations at once', () => {
      const command = new TransferFundsCommand('acc@001', 'acc@002', -50000, 'invalid')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations.length).toBeGreaterThan(1)
    })

    it('should report self-transfer with invalid accounts', () => {
      const command = new TransferFundsCommand('acc-001', 'acc-001', 0, 'twD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      // Should have violations for amount, currency, and self-transfer
      expect(result.violations.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('edge cases', () => {
    it('should handle boundary transfer amounts', () => {
      // Min amount
      let command = new TransferFundsCommand('acc-001', 'acc-002', 1, 'TWD')
      let result = validator.validate(command)
      expect(result.isValid).toBe(true)

      // Max amount exactly
      command = new TransferFundsCommand('acc-001', 'acc-002', 10000000, 'TWD')
      result = validator.validate(command)
      expect(result.isValid).toBe(true)

      // Just over max
      command = new TransferFundsCommand('acc-001', 'acc-002', 10000001, 'TWD')
      result = validator.validate(command)
      expect(result.isValid).toBe(false)
    })

    it('should handle max length account IDs', () => {
      const maxId = 'a'.repeat(50)
      const command = new TransferFundsCommand(maxId, 'b'.repeat(50), 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
    })
  })
})
