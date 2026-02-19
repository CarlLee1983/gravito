import { describe, expect, it } from 'bun:test'
import { WithdrawFundsCommand } from '../../../src/Application/Commands/WithdrawFunds/WithdrawFundsCommand'
import { WithdrawFundsCommandValidator } from '../../../src/Application/Validation/Validators/WithdrawFundsCommandValidator'

describe('WithdrawFundsCommandValidator', () => {
  const validator = new WithdrawFundsCommandValidator()

  describe('valid commands', () => {
    it('should pass valid withdraw command', () => {
      const command = new WithdrawFundsCommand('acc-001', 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should pass with minimum amount', () => {
      const command = new WithdrawFundsCommand('acc-001', 1, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
    })

    it('should pass with various currencies', () => {
      const currencies = ['TWD', 'USD', 'EUR', 'JPY']

      for (const currency of currencies) {
        const command = new WithdrawFundsCommand('acc-001', 50000, currency)
        const result = validator.validate(command)

        expect(result.isValid).toBe(true)
      }
    })
  })

  describe('invalid commands - accountId', () => {
    it('should reject empty accountId', () => {
      const command = new WithdrawFundsCommand('', 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'accountId' }))
    })

    it('should reject accountId with invalid format', () => {
      const command = new WithdrawFundsCommand('acc@123', 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations.some((v) => v.field === 'accountId')).toBe(true)
    })
  })

  describe('invalid commands - amountCents', () => {
    it('should reject zero amount', () => {
      const command = new WithdrawFundsCommand('acc-001', 0, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'amountCents' }))
    })

    it('should reject negative amount', () => {
      const command = new WithdrawFundsCommand('acc-001', -50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'amountCents' }))
    })

    it('should reject non-integer amounts', () => {
      const command = new WithdrawFundsCommand('acc-001', 50000.75, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'amountCents' }))
    })
  })

  describe('invalid commands - currency', () => {
    it('should reject lowercase currency', () => {
      const command = new WithdrawFundsCommand('acc-001', 50000, 'twd')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'currency' }))
    })

    it('should reject invalid currency length', () => {
      const command = new WithdrawFundsCommand('acc-001', 50000, 'TWD$')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'currency' }))
    })
  })

  describe('edge cases', () => {
    it('should pass with large withdrawal amounts', () => {
      const command = new WithdrawFundsCommand('acc-001', 999999999, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
    })
  })
})
