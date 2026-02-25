/**
 * Xenon FFI Type System
 * Comprehensive TypeScript types for safe native library bindings
 */

/**
 * Supported FFI argument and return types
 * Subset of bun:ffi types that are considered safe
 */
export type FFIType =
  | 'i8'
  | 'i16'
  | 'i32'
  | 'i64'
  | 'u8'
  | 'u16'
  | 'u32'
  | 'u64'
  | 'f32'
  | 'f64'
  | 'bool'
  | 'ptr'
  | 'void'
  | 'cstring'

/**
 * FFI function signature definition
 */
export interface FFISymbolDef {
  args: FFIType[]
  returns: FFIType
}

/**
 * FFI symbols dictionary (name → definition)
 */
export interface FFISymbols {
  [key: string]: FFISymbolDef
}

/**
 * Buffer ownership model
 */
export type BufferOwnership = 'owned' | 'borrowed'

/**
 * Memory buffer metadata for tracking
 */
export interface ManagedBuffer {
  ptr: number
  len: number
  ownership: BufferOwnership
  label: string
  freed: boolean
  allocTime: number
  stackTrace: string
}

/**
 * Library loader configuration
 */
export interface LibraryLoaderConfig {
  /**
   * Paths explicitly allowed (whitelist)
   * Empty means allow all (except blockedPaths)
   */
  allowedPaths?: string[]

  /**
   * Paths explicitly forbidden (blacklist)
   */
  blockedPaths?: string[]

  /**
   * Maximum number of open libraries (safety limit)
   * Default: 100
   */
  maxLibraries?: number

  /**
   * Enable memory leak detection (FinalizationRegistry)
   * Default: true
   */
  enableMemoryTracking?: boolean

  /**
   * Maximum memory allocated across all buffers (bytes)
   * 0 = unlimited. Default: 1GB
   */
  maxTotalMemory?: number
}

/**
 * XenonManager configuration
 */
export interface XenonManagerConfig extends LibraryLoaderConfig {}

/**
 * Xenon static facade configuration
 */
export interface XenonConfig extends LibraryLoaderConfig {}

/**
 * Loaded library handle interface
 * Provides type-safe access to native functions
 */
export interface LibraryHandle {
  /**
   * Library name (e.g., 'sqlite3')
   */
  name: string

  /**
   * Library path (e.g., '/usr/lib/libsqlite3.dylib')
   */
  path: string

  /**
   * Symbol definitions
   */
  symbols: FFISymbols

  /**
   * Call a native function
   * @param symbol Function name
   * @param args Function arguments
   * @returns Function result
   */
  call(symbol: string, ...args: any[]): any

  /**
   * Close the library and release resources
   */
  close(): void

  /**
   * Check if library is still open
   */
  isClosed(): boolean
}

/**
 * Bounds check result
 */
export interface BoundsCheckResult {
  valid: boolean
  reason?: string
}

/**
 * Type validation result
 */
export interface TypeValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Memory tracker statistics
 */
export interface MemoryStats {
  totalAllocated: number
  totalFreed: number
  activeBuffers: number
  peakBuffers: number
}
