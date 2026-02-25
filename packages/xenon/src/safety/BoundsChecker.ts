/**
 * Memory Bounds Checking
 * Validates pointer arithmetic and buffer access safety
 */

import { XenonMemoryError } from '../errors'
import type { BoundsCheckResult } from '../types'

/**
 * Check if a pointer value is valid (not null/invalid)
 * @param ptr Pointer value
 * @returns true if pointer appears valid
 */
export function isValidPointer(ptr: number | bigint): boolean {
  const ptrNum = typeof ptr === 'bigint' ? Number(ptr) : ptr
  return ptrNum !== 0 && ptrNum !== -1 && !Number.isNaN(ptrNum)
}

/**
 * Check buffer access bounds
 * @param bufLen Buffer length in bytes
 * @param offset Offset to access
 * @param size Size of access
 * @returns Bounds check result
 */
export function checkBounds(bufLen: number, offset: number, size: number): BoundsCheckResult {
  // Validate inputs
  if (offset < 0) {
    return {
      valid: false,
      reason: `Negative offset: ${offset}`,
    }
  }

  if (size < 0) {
    return {
      valid: false,
      reason: `Negative size: ${size}`,
    }
  }

  // Check for potential overflow before arithmetic
  if (offset > Number.MAX_SAFE_INTEGER - size) {
    return {
      valid: false,
      reason: `Integer overflow: ${offset} + ${size}`,
    }
  }

  const end = offset + size

  // Check out of bounds
  if (end > bufLen) {
    return {
      valid: false,
      reason: `Out of bounds: [${offset}, ${end}) exceeds buffer length ${bufLen}`,
    }
  }

  return { valid: true }
}

/**
 * Check if memory range is aligned
 * Used for SIMD and aligned access patterns
 * @param ptr Pointer value
 * @param alignment Required alignment (2, 4, 8, 16, etc.)
 * @returns true if aligned
 */
export function checkAlignment(ptr: number | bigint, alignment: number): boolean {
  const ptrNum = typeof ptr === 'bigint' ? Number(ptr) : ptr
  return ptrNum % alignment === 0
}

/**
 * Validate buffer is safe for access
 * Throws XenonMemoryError on invalid conditions
 * @param bufLen Buffer length
 * @param offset Offset
 * @param size Size
 * @throws XenonMemoryError if bounds check fails
 */
export function validateBounds(bufLen: number, offset: number, size: number): void {
  const result = checkBounds(bufLen, offset, size)
  if (!result.valid) {
    throw new XenonMemoryError(result.reason || 'Bounds check failed')
  }
}

/**
 * Calculate aligned size (round up to nearest alignment boundary)
 * @param size Original size
 * @param alignment Alignment requirement
 * @returns Aligned size
 */
export function alignSize(size: number, alignment: number): number {
  if (alignment <= 0) {
    throw new Error('Alignment must be positive')
  }
  return Math.ceil(size / alignment) * alignment
}
