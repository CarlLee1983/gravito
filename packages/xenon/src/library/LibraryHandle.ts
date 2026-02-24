/**
 * Library Handle Interface and Implementation
 * Provides type-safe access to native library functions
 */

import { XenonLibraryError } from '../errors'
import type { FFISymbolDef, FFISymbols, LibraryHandle } from '../types'

/**
 * Default LibraryHandle implementation
 * Wraps Bun FFI operations with safety checks
 */
export class LibraryHandleImpl implements LibraryHandle {
  readonly name: string
  readonly path: string
  readonly symbols: FFISymbols
  private closed = false
  private dlHandle: any // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor(
    name: string,
    path: string,
    symbols: FFISymbols,
    dlHandle: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    this.name = name
    this.path = path
    this.symbols = symbols
    this.dlHandle = dlHandle
  }

  /**
   * Call a native function
   * @param symbol Function name
   * @param args Function arguments
   * @returns Function result
   * @throws XenonLibraryError if symbol not found or library closed
   */
  call(symbol: string, ...args: any[]): any {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    this.checkClosed()

    if (!this.symbols[symbol]) {
      throw new XenonLibraryError(`Symbol '${symbol}' not found in library '${this.name}'`)
    }

    try {
      const fn = this.dlHandle[symbol]
      if (typeof fn !== 'function') {
        throw new XenonLibraryError(`Symbol '${symbol}' in library '${this.name}' is not callable`)
      }
      return fn(...args)
    } catch (err) {
      if (err instanceof XenonLibraryError) {
        throw err
      }
      throw new XenonLibraryError(
        `Call to '${symbol}' in '${this.name}' failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  /**
   * Close the library
   * Prevents further function calls
   */
  close(): void {
    this.closed = true
    this.dlHandle = null
  }

  /**
   * Check if library is closed
   * @returns true if closed
   */
  isClosed(): boolean {
    return this.closed
  }

  /**
   * Verify library is open before operation
   * @throws XenonLibraryError if closed
   */
  private checkClosed(): void {
    if (this.closed) {
      throw new XenonLibraryError(`Library '${this.name}' is closed`)
    }
  }

  /**
   * Get symbol definition
   * @param symbol Symbol name
   * @returns Symbol definition or undefined
   */
  getSymbolDef(symbol: string): FFISymbolDef | undefined {
    return this.symbols[symbol]
  }

  /**
   * List all available symbols
   * @returns Array of symbol names
   */
  listSymbols(): string[] {
    return Object.keys(this.symbols)
  }
}

/**
 * Create a mock library handle for testing
 * @param name Library name
 * @param path Library path
 * @param symbols Symbol definitions
 * @param implementations Symbol implementations (name → function)
 * @returns LibraryHandle instance
 */
export function createMockHandle(
  name: string,
  path: string,
  symbols: FFISymbols,
  implementations: Record<string, (...args: any[]) => any> = {} // eslint-disable-line @typescript-eslint/no-explicit-any
): LibraryHandle {
  const dlHandle: any = {} // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const [key, impl] of Object.entries(implementations)) {
    dlHandle[key] = impl
  }
  return new LibraryHandleImpl(name, path, symbols, dlHandle)
}
