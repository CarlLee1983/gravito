/**
 * Buffer Ownership Management
 * Helpers for owned/borrowed buffer lifecycle
 */

import type { ManagedBuffer } from '../types'

/**
 * Create owned buffer metadata
 * @param ptr Pointer value
 * @param len Buffer length in bytes
 * @param label Debug label
 * @returns Buffer metadata
 */
export function createOwnedBuffer(ptr: number, len: number, label: string): ManagedBuffer {
  return {
    ptr,
    len,
    ownership: 'owned',
    label,
    freed: false,
    allocTime: Date.now(),
    stackTrace: captureStackTrace(),
  }
}

/**
 * Create borrowed buffer metadata
 * @param ptr Pointer value
 * @param len Buffer length in bytes
 * @param label Debug label
 * @returns Buffer metadata
 */
export function createBorrowedBuffer(ptr: number, len: number, label: string): ManagedBuffer {
  return {
    ptr,
    len,
    ownership: 'borrowed',
    label,
    freed: false,
    allocTime: Date.now(),
    stackTrace: captureStackTrace(),
  }
}

/**
 * Mark buffer as freed (for owned buffers)
 * @param buf Buffer metadata
 */
export function markFreed(buf: ManagedBuffer): void {
  buf.freed = true
}

/**
 * Check if buffer is freed
 * @param buf Buffer metadata
 * @returns true if freed
 */
export function isFreed(buf: ManagedBuffer): boolean {
  return buf.freed
}

/**
 * Check if buffer is owned by Xenon
 * @param buf Buffer metadata
 * @returns true if ownership is 'owned'
 */
export function isOwned(buf: ManagedBuffer): boolean {
  return buf.ownership === 'owned'
}

/**
 * Check if buffer is borrowed from external source
 * @param buf Buffer metadata
 * @returns true if ownership is 'borrowed'
 */
export function isBorrowed(buf: ManagedBuffer): boolean {
  return buf.ownership === 'borrowed'
}

/**
 * Get human-readable buffer info for debugging
 * @param buf Buffer metadata
 * @returns Info string
 */
export function getBufferInfo(buf: ManagedBuffer): string {
  const age = Date.now() - buf.allocTime
  return `${buf.label} [${buf.ownership}] ptr=0x${buf.ptr.toString(16)} len=${buf.len} age=${age}ms freed=${buf.freed}`
}

/**
 * Capture stack trace for debugging memory leaks
 * @returns Stack trace string (simplified)
 */
function captureStackTrace(): string {
  try {
    const err = new Error()
    const stack = err.stack || ''
    const lines = stack.split('\n')
    // Return first 3 meaningful lines (skip Error and this function)
    return lines.slice(2, 5).join('\n')
  } catch {
    return 'stack trace unavailable'
  }
}
