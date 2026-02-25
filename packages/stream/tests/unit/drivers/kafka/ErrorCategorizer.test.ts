import { describe, expect, it } from 'bun:test'
import { ErrorCategorizer } from '../../../../src/drivers/kafka/ErrorCategorizer'

describe('ErrorCategorizer', () => {
  const categorizer = new ErrorCategorizer()

  describe('categorize() - transient errors', () => {
    it('should classify ECONNREFUSED as transient', () => {
      const error = new Error('Connection refused')
      ;(error as any).code = 'ECONNREFUSED'
      expect(categorizer.categorize(error)).toBe('transient')
    })

    it('should classify ETIMEDOUT as transient', () => {
      const error = new Error('Connection timeout')
      ;(error as any).code = 'ETIMEDOUT'
      expect(categorizer.categorize(error)).toBe('transient')
    })

    it('should classify ECONNRESET as transient', () => {
      const error = new Error('Connection reset by peer')
      ;(error as any).code = 'ECONNRESET'
      expect(categorizer.categorize(error)).toBe('transient')
    })

    it('should classify connection failure messages as transient', () => {
      const error = new Error('Failed to connect to broker')
      expect(categorizer.categorize(error)).toBe('transient')
    })

    it('should classify timeout messages as transient', () => {
      const error = new Error('Request timeout after 5s')
      expect(categorizer.categorize(error)).toBe('transient')
    })

    it('should classify network error messages as transient', () => {
      const error = new Error('Network unreachable')
      expect(categorizer.categorize(error)).toBe('transient')
    })
  })

  describe('categorize() - serialization errors', () => {
    it('should classify SyntaxError as serialization', () => {
      const error = new SyntaxError('Unexpected token in JSON')
      expect(categorizer.categorize(error)).toBe('serialization')
    })

    it('should classify JSON parse errors as serialization', () => {
      const error = new Error('Failed to parse JSON')
      expect(categorizer.categorize(error)).toBe('serialization')
    })

    it('should classify JSON errors as serialization', () => {
      const error = new Error('Invalid JSON format')
      expect(categorizer.categorize(error)).toBe('serialization')
    })
  })

  describe('categorize() - business_logic errors', () => {
    it('should classify as business_logic when flag is true', () => {
      const error = new Error('Custom application error')
      expect(categorizer.categorize(error, true)).toBe('business_logic')
    })

    it('should prioritize transient detection over business_logic flag', () => {
      const transientError = new Error('Timeout')
      // Transient keywords take priority even with business_logic flag
      expect(categorizer.categorize(transientError, false)).toBe('transient')
      expect(categorizer.categorize(transientError, true)).toBe('transient')

      // Non-transient, non-serialization errors become business_logic with flag
      const appError = new Error('Validation failed')
      expect(categorizer.categorize(appError, false)).toBe('permanent')
      expect(categorizer.categorize(appError, true)).toBe('business_logic')
    })
  })

  describe('categorize() - permanent errors', () => {
    it('should classify unknown errors as permanent', () => {
      const error = new Error('Something went wrong')
      expect(categorizer.categorize(error)).toBe('permanent')
    })

    it('should classify permission errors as permanent', () => {
      const error = new Error('Permission denied')
      expect(categorizer.categorize(error)).toBe('permanent')
    })
  })

  describe('shouldAffectCircuit()', () => {
    it('should return true only for transient errors', () => {
      expect(categorizer.shouldAffectCircuit('transient')).toBe(true)
      expect(categorizer.shouldAffectCircuit('serialization')).toBe(false)
      expect(categorizer.shouldAffectCircuit('business_logic')).toBe(false)
      expect(categorizer.shouldAffectCircuit('permanent')).toBe(false)
    })
  })

  describe('shouldRecordInCircuit() - convenience method', () => {
    it('should return true for transient errors', () => {
      const error = new Error('Connection refused')
      ;(error as any).code = 'ECONNREFUSED'
      expect(categorizer.shouldRecordInCircuit(error)).toBe(true)
    })

    it('should return false for serialization errors', () => {
      const error = new SyntaxError('Invalid JSON')
      expect(categorizer.shouldRecordInCircuit(error)).toBe(false)
    })

    it('should return false when isBusinessLogic flag is set', () => {
      const error = new Error('Any error')
      expect(categorizer.shouldRecordInCircuit(error, true)).toBe(false)
    })

    it('should return false for permanent errors', () => {
      const error = new Error('Unknown error')
      expect(categorizer.shouldRecordInCircuit(error)).toBe(false)
    })
  })
})
