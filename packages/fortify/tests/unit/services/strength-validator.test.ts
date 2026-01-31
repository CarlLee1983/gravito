import { beforeEach, describe, expect, it } from 'bun:test'
import type { PasswordRulesConfig } from '../../../src/config'
import { StrengthValidator } from '../../../src/services/StrengthValidator'

describe('StrengthValidator', () => {
  let validator: StrengthValidator
  const defaultConfig: PasswordRulesConfig = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: false,
    preventCommon: true,
    preventReuse: 5,
  }

  beforeEach(() => {
    validator = new StrengthValidator(defaultConfig)
  })

  describe('minLength validation', () => {
    it('rejects input shorter than minimum length', () => {
      const config: PasswordRulesConfig = { minLength: 8 }
      validator = new StrengthValidator(config)

      const result = validator.check('short')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Must be at least 8 characters long')
    })

    it('accepts input meeting minimum length', () => {
      const config: PasswordRulesConfig = { minLength: 8 }
      validator = new StrengthValidator(config)

      const result = validator.check('12345678')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('maxLength validation', () => {
    it('rejects input exceeding maximum length', () => {
      const config: PasswordRulesConfig = { maxLength: 10 }
      validator = new StrengthValidator(config)

      const result = validator.check('12345678901')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Cannot exceed 10 characters')
    })

    it('accepts input within maximum length', () => {
      const config: PasswordRulesConfig = { maxLength: 10 }
      validator = new StrengthValidator(config)

      const result = validator.check('1234567890')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('uppercase requirement', () => {
    it('rejects input without uppercase letters', () => {
      const config: PasswordRulesConfig = { requireUppercase: true }
      validator = new StrengthValidator(config)

      const result = validator.check('alllowercase123')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Must contain at least one uppercase letter')
    })

    it('accepts input with uppercase letters', () => {
      const config: PasswordRulesConfig = { requireUppercase: true }
      validator = new StrengthValidator(config)

      const result = validator.check('HasUpperCase')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('lowercase requirement', () => {
    it('rejects input without lowercase letters', () => {
      const config: PasswordRulesConfig = { requireLowercase: true }
      validator = new StrengthValidator(config)

      const result = validator.check('ALLUPPERCASE123')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Must contain at least one lowercase letter')
    })

    it('accepts input with lowercase letters', () => {
      const config: PasswordRulesConfig = { requireLowercase: true }
      validator = new StrengthValidator(config)

      const result = validator.check('HasLowerCase')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('number requirement', () => {
    it('rejects input without numbers', () => {
      const config: PasswordRulesConfig = { requireNumbers: true }
      validator = new StrengthValidator(config)

      const result = validator.check('NoNumbers')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Must contain at least one number')
    })

    it('accepts input with numbers', () => {
      const config: PasswordRulesConfig = { requireNumbers: true }
      validator = new StrengthValidator(config)

      const result = validator.check('Has123Numbers')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('symbol requirement', () => {
    it('rejects input without symbols', () => {
      const config: PasswordRulesConfig = { requireSymbols: true }
      validator = new StrengthValidator(config)

      const result = validator.check('NoSymbols123')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Must contain at least one special character')
    })

    it('accepts input with symbols', () => {
      const config: PasswordRulesConfig = { requireSymbols: true }
      validator = new StrengthValidator(config)

      const result = validator.check('Has@Symbol')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('recognizes various special characters', () => {
      const config: PasswordRulesConfig = { requireSymbols: true }
      validator = new StrengthValidator(config)

      const symbols = [
        '!',
        '@',
        '#',
        '$',
        '%',
        '^',
        '&',
        '*',
        '(',
        ')',
        ',',
        '.',
        '?',
        '"',
        ':',
        '{',
        '}',
        '|',
        '<',
        '>',
      ]

      symbols.forEach((symbol) => {
        const result = validator.check(`Test${symbol}123`)
        expect(result.valid).toBe(true)
      })
    })
  })

  describe('common input prevention', () => {
    it('rejects common weak values', () => {
      const config: PasswordRulesConfig = { preventCommon: true }
      const weakList = ['common123', 'weak456']
      validator = new StrengthValidator(config, weakList)

      const result = validator.check('common123')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('This value is too common. Please choose a more secure one')
    })

    it('accepts non-common values', () => {
      const config: PasswordRulesConfig = { preventCommon: true }
      const weakList = ['common123']
      validator = new StrengthValidator(config, weakList)

      const result = validator.check('UniqueValue456')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('performs case-insensitive common value check', () => {
      const config: PasswordRulesConfig = { preventCommon: true }
      const weakList = ['weakvalue']
      validator = new StrengthValidator(config, weakList)

      const resultLower = validator.check('weakvalue')
      const resultUpper = validator.check('WEAKVALUE')
      const resultMixed = validator.check('WeakValue')

      expect(resultLower.valid).toBe(false)
      expect(resultUpper.valid).toBe(false)
      expect(resultMixed.valid).toBe(false)
    })
  })

  describe('combined rules validation', () => {
    it('validates against all enabled rules', () => {
      const result = validator.check('Weak1')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Must be at least 8 characters long')
    })

    it('accepts input meeting all requirements', () => {
      const result = validator.check('StrongPass123')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('collects multiple validation errors', () => {
      const result = validator.check('weak')

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('Must be at least 8 characters long')
      expect(result.errors).toContain('Must contain at least one uppercase letter')
      expect(result.errors).toContain('Must contain at least one number')
    })
  })

  describe('dynamic weak list management', () => {
    it('allows adding weak values dynamically', () => {
      const config: PasswordRulesConfig = { preventCommon: true }
      validator = new StrengthValidator(config, [])

      let result = validator.check('newweak')
      expect(result.valid).toBe(true)

      validator.addWeak('newweak')

      result = validator.check('newweak')
      expect(result.valid).toBe(false)
    })

    it('allows removing weak values dynamically', () => {
      const config: PasswordRulesConfig = { preventCommon: true }
      validator = new StrengthValidator(config, ['removeme'])

      let result = validator.check('removeme')
      expect(result.valid).toBe(false)

      validator.removeWeak('removeme')

      result = validator.check('removeme')
      expect(result.valid).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = validator.check('')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Must be at least 8 characters long')
    })

    it('handles exact minimum length', () => {
      const config: PasswordRulesConfig = { minLength: 8 }
      validator = new StrengthValidator(config)

      const result = validator.check('12345678')

      expect(result.valid).toBe(true)
    })

    it('handles exact maximum length', () => {
      const config: PasswordRulesConfig = { maxLength: 10 }
      validator = new StrengthValidator(config)

      const result = validator.check('1234567890')

      expect(result.valid).toBe(true)
    })

    it('handles unicode characters', () => {
      const config: PasswordRulesConfig = { minLength: 5 }
      validator = new StrengthValidator(config)

      const result = validator.check('Test🔒Pass')

      expect(result.valid).toBe(true)
    })

    it('handles all rules disabled', () => {
      const config: PasswordRulesConfig = {}
      validator = new StrengthValidator(config)

      const result = validator.check('anything')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})
