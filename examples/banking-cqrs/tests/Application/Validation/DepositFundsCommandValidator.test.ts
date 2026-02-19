import { describe, expect, it } from 'bun:test'
import { DepositFundsCommand } from '../../../src/Application/Commands/DepositFunds/DepositFundsCommand'
import { DepositFundsCommandValidator } from '../../../src/Application/Validation/Validators/DepositFundsCommandValidator'

describe('DepositFundsCommandValidator', () => {
  const validator = new DepositFundsCommandValidator()

  describe('valid commands', () => {
    it('should pass valid deposit command', () => {
      const command = new DepositFundsCommand('acc-001', 100000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should pass with minimum amount (1 cent)', () => {
      const command = new DepositFundsCommand('acc-001', 1, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
    })

    it('should pass with large amounts', () => {
      const command = new DepositFundsCommand('acc-001', 999999999, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(true)
    })

    it('should pass with different currencies', () => {
      const currencies = ['TWD', 'USD', 'EUR', 'JPY']

      for (const currency of currencies) {
        const command = new DepositFundsCommand('acc-001', 50000, currency)
        const result = validator.validate(command)

        expect(result.isValid).toBe(true)
      }
    })
  })

  describe('invalid commands - accountId', () => {
    it('should reject empty accountId', () => {
      const command = new DepositFundsCommand('', 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'accountId' }))
    })

    it('should reject accountId with invalid format', () => {
      const command = new DepositFundsCommand('acc@001', 50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations.some((v) => v.field === 'accountId')).toBe(true)
    })
  })

  describe('invalid commands - amountCents', () => {
    it('should reject zero amount', () => {
      const command = new DepositFundsCommand('acc-001', 0, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'amountCents' }))
    })

    it('should reject negative amount', () => {
      const command = new DepositFundsCommand('acc-001', -50000, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'amountCents' }))
    })

    it('should reject non-integer amounts', () => {
      const command = new DepositFundsCommand('acc-001', 50000.5, 'TWD')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'amountCents' }))
    })
  })

  describe('invalid commands - currency', () => {
    it('should reject invalid currency format', () => {
      const command = new DepositFundsCommand('acc-001', 50000, 'twd')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'currency' }))
    })

    it('should reject currency with invalid length', () => {
      const command = new DepositFundsCommand('acc-001', 50000, 'TW')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'currency' }))
    })

    it('should reject empty currency', () => {
      const command = new DepositFundsCommand('acc-001', 50000, '')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContainEqual(expect.objectContaining({ field: 'currency' }))
    })
  })

  describe('multiple violations', () => {
    it('should collect all violations', () => {
      const command = new DepositFundsCommand('', -100, 'invalid')
      const result = validator.validate(command)

      expect(result.isValid).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })
  })
})
