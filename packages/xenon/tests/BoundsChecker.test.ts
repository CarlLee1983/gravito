import { describe, expect, it } from 'bun:test'
import { XenonMemoryError } from '../src/errors'
import {
  alignSize,
  checkAlignment,
  checkBounds,
  isValidPointer,
  validateBounds,
} from '../src/safety/BoundsChecker'

describe('BoundsChecker', () => {
  describe('isValidPointer', () => {
    it('should accept non-zero pointers', () => {
      expect(isValidPointer(12345)).toBe(true)
      expect(isValidPointer(1)).toBe(true)
      expect(isValidPointer(0xffffffff)).toBe(true)
    })

    it('should reject null pointers', () => {
      expect(isValidPointer(0)).toBe(false)
      expect(isValidPointer(-1)).toBe(false)
    })

    it('should handle bigint pointers', () => {
      expect(isValidPointer(BigInt(12345))).toBe(true)
      expect(isValidPointer(BigInt(0))).toBe(false)
    })

    it('should reject NaN', () => {
      expect(isValidPointer(NaN)).toBe(false)
    })
  })

  describe('checkBounds', () => {
    it('should pass valid bounds', () => {
      const result = checkBounds(1024, 0, 512)
      expect(result.valid).toBe(true)
    })

    it('should pass edge case: full buffer', () => {
      const result = checkBounds(1024, 0, 1024)
      expect(result.valid).toBe(true)
    })

    it('should pass edge case: single byte', () => {
      const result = checkBounds(1024, 1023, 1)
      expect(result.valid).toBe(true)
    })

    it('should reject negative offset', () => {
      const result = checkBounds(1024, -1, 10)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Negative offset')
    })

    it('should reject negative size', () => {
      const result = checkBounds(1024, 0, -1)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Negative size')
    })

    it('should reject out of bounds access', () => {
      const result = checkBounds(1024, 512, 600)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Out of bounds')
    })

    it('should reject overflow', () => {
      // Use values that would overflow MAX_SAFE_INTEGER
      const result = checkBounds(1024, Number.MAX_SAFE_INTEGER - 100, 200)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Integer overflow')
    })

    it('should reject access past end', () => {
      const result = checkBounds(1024, 1023, 2)
      expect(result.valid).toBe(false)
    })
  })

  describe('checkAlignment', () => {
    it('should pass aligned pointers', () => {
      expect(checkAlignment(16, 16)).toBe(true)
      expect(checkAlignment(1024, 16)).toBe(true)
      expect(checkAlignment(100, 4)).toBe(true)
    })

    it('should reject unaligned pointers', () => {
      expect(checkAlignment(15, 16)).toBe(false)
      expect(checkAlignment(1023, 16)).toBe(false)
    })

    it('should handle bigint pointers', () => {
      expect(checkAlignment(BigInt(16), 16)).toBe(true)
      expect(checkAlignment(BigInt(15), 16)).toBe(false)
    })
  })

  describe('validateBounds', () => {
    it('should not throw on valid bounds', () => {
      expect(() => validateBounds(1024, 0, 512)).not.toThrow()
    })

    it('should throw on invalid bounds', () => {
      expect(() => validateBounds(1024, 0, 2048)).toThrow(XenonMemoryError)
    })

    it('should throw on negative offset', () => {
      expect(() => validateBounds(1024, -1, 10)).toThrow(XenonMemoryError)
    })
  })

  describe('alignSize', () => {
    it('should round up to alignment boundary', () => {
      expect(alignSize(10, 16)).toBe(16)
      expect(alignSize(16, 16)).toBe(16)
      expect(alignSize(17, 16)).toBe(32)
    })

    it('should handle power-of-2 alignments', () => {
      expect(alignSize(5, 4)).toBe(8)
      expect(alignSize(100, 8)).toBe(104)
    })

    it('should return same size if already aligned', () => {
      expect(alignSize(64, 8)).toBe(64)
      expect(alignSize(256, 16)).toBe(256)
    })

    it('should reject zero alignment', () => {
      expect(() => alignSize(100, 0)).toThrow()
    })

    it('should reject negative alignment', () => {
      expect(() => alignSize(100, -1)).toThrow()
    })
  })
})
