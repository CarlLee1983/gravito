/**
 * Test Helpers and Mock Factories
 * Utilities for creating mock FFI loaders and handles
 */

import { createMockHandle, LibraryHandleImpl } from '../src/library/LibraryHandle'
import type { FFILoader } from '../src/library/LibraryLoader'
import { FFISymbolDef, type FFISymbols } from '../src/types'

/**
 * Create a mock FFI loader for testing
 * @param implementations Map of symbol name to implementation
 * @returns FFILoader function
 */
export function createMockFfiLoader(
  implementations: Record<string, (...args: any[]) => any> = {} // eslint-disable-line @typescript-eslint/no-explicit-any
): FFILoader {
  return (path: string, symbols: FFISymbols) => {
    const result: any = {} // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const [name] of Object.entries(symbols)) {
      result[name] = implementations[name] || (() => null)
    }
    return result
  }
}

/**
 * Create a test library handle
 * @param name Library name
 * @param symbols Symbol definitions
 * @param implementations Symbol implementations
 * @returns LibraryHandle
 */
export function createTestHandle(
  name: string,
  symbols: FFISymbols,
  implementations: Record<string, (...args: any[]) => any> = {} // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  return createMockHandle(name, `/mock/${name}.so`, symbols, implementations)
}

/**
 * Create test symbol definitions
 */
export const TEST_SYMBOLS = {
  simple: {
    add: { args: ['i32', 'i32'], returns: 'i32' },
    subtract: { args: ['i32', 'i32'], returns: 'i32' },
    version: { args: [], returns: 'cstring' },
  },
  complex: {
    malloc: { args: ['u64'], returns: 'ptr' },
    free: { args: ['ptr'], returns: 'void' },
    memcpy: { args: ['ptr', 'ptr', 'u64'], returns: 'ptr' },
  },
  floats: {
    sqrt: { args: ['f64'], returns: 'f64' },
    pow: { args: ['f64', 'f64'], returns: 'f64' },
  },
} as const

/**
 * Create test implementations
 */
export const TEST_IMPLEMENTATIONS = {
  add: (a: number, b: number) => a + b,
  subtract: (a: number, b: number) => a - b,
  version: () => '1.0.0',
  sqrt: (x: number) => Math.sqrt(x),
  pow: (x: number, y: number) => x ** y,
  malloc: (size: number) => Math.random() * 0xffffffff,
  free: () => null,
  memcpy: (dst: number, src: number, n: number) => dst,
}

/**
 * Assert that a TypedArray has expected properties
 * @param buffer Buffer to check
 * @param expectedSize Expected size
 */
export function assertBuffer(buffer: Uint8Array, expectedSize: number): void {
  if (buffer.length !== expectedSize) {
    throw new Error(`Expected buffer size ${expectedSize}, got ${buffer.length}`)
  }
  if (!(buffer instanceof Uint8Array)) {
    throw new Error('Expected Uint8Array')
  }
}
