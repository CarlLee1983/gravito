/**
 * Safe Library Loader
 * Validates paths and symbols before dlopen
 */

import { XenonConfigError, XenonLibraryError, XenonSecurityError } from '../errors'
import { validateSymbols } from '../safety/TypeGuard'
import type { FFISymbols, LibraryHandle, LibraryLoaderConfig } from '../types'
import { LibraryHandleImpl } from './LibraryHandle'

/**
 * FFI loader interface for dependency injection
 */
export type FFILoader = (path: string, symbols: FFISymbols) => any // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Default FFI loader using bun:ffi
 */
function defaultFFILoader(path: string, symbols: FFISymbols): any {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  const bun = require('bun')
  if (!bun.FFIType) {
    throw new XenonLibraryError('bun:ffi not available')
  }
  return bun.dlopen(path, symbols)
}

/**
 * Safe library loader with path validation and type checking
 */
export class LibraryLoader {
  private config: LibraryLoaderConfig
  private ffiLoader: FFILoader
  private openLibraries: Map<string, LibraryHandle> = new Map()

  constructor(config: LibraryLoaderConfig = {}, ffiLoader?: FFILoader) {
    this.config = {
      maxLibraries: config.maxLibraries ?? 100,
      enableMemoryTracking: config.enableMemoryTracking ?? true,
      maxTotalMemory: config.maxTotalMemory ?? 1024 * 1024 * 1024,
      ...config,
    }
    this.ffiLoader = ffiLoader || defaultFFILoader
  }

  /**
   * Load a native library safely
   * Validates path and symbols before loading
   * @param name Library name (for identification)
   * @param path Full path to library file
   * @param symbols FFI symbol definitions
   * @returns LibraryHandle
   * @throws XenonSecurityError if path validation fails
   * @throws XenonTypeError if symbols invalid
   */
  load(name: string, path: string, symbols: FFISymbols): LibraryHandle {
    // Check if already loaded
    if (this.openLibraries.has(path)) {
      return this.openLibraries.get(path)!
    }

    // Validate path
    this.validatePath(path)

    // Validate symbols
    validateSymbols(symbols)

    // Check library count
    if (this.openLibraries.size >= this.config.maxLibraries!) {
      throw new XenonConfigError(`Maximum libraries (${this.config.maxLibraries}) exceeded`)
    }

    // Load library using FFI loader
    let dlHandle: any // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      dlHandle = this.ffiLoader(path, symbols)
    } catch (err) {
      throw new XenonLibraryError(
        `Failed to load library '${name}' from '${path}': ${err instanceof Error ? err.message : String(err)}`
      )
    }

    // Create handle
    const handle = new LibraryHandleImpl(name, path, symbols, dlHandle)
    this.openLibraries.set(path, handle)

    return handle
  }

  /**
   * Close a loaded library
   * @param path Library path
   */
  unload(path: string): void {
    const handle = this.openLibraries.get(path)
    if (handle) {
      handle.close()
      this.openLibraries.delete(path)
    }
  }

  /**
   * Close all loaded libraries
   */
  closeAll(): void {
    for (const handle of this.openLibraries.values()) {
      handle.close()
    }
    this.openLibraries.clear()
  }

  /**
   * Get loaded library handle
   * @param path Library path
   * @returns LibraryHandle or undefined
   */
  getHandle(path: string): LibraryHandle | undefined {
    return this.openLibraries.get(path)
  }

  /**
   * List all loaded libraries
   * @returns Array of (name, path, symbols) tuples
   */
  listLibraries(): [string, string][] {
    return Array.from(this.openLibraries.entries()).map(([path, handle]) => [handle.name, path])
  }

  /**
   * Validate library path against whitelist/blacklist
   * Throws XenonSecurityError if validation fails
   * @param path Path to validate
   * @throws XenonSecurityError if path is blocked
   */
  private validatePath(path: string): void {
    // Check blacklist first (highest priority)
    const blocked = this.config.blockedPaths || []
    if (blocked.some((p) => this.pathMatches(path, p))) {
      throw new XenonSecurityError(`Library path blocked by policy: ${path}`)
    }

    // Check whitelist if configured (not empty)
    const allowed = this.config.allowedPaths || []
    if (allowed.length > 0 && !allowed.some((p) => this.pathMatches(path, p))) {
      throw new XenonSecurityError(`Library path not allowed by policy: ${path}`)
    }
  }

  /**
   * Simple path matching (exact match or glob-like patterns)
   * @param path Path to match
   * @param pattern Pattern to match against
   * @returns true if matches
   */
  private pathMatches(path: string, pattern: string): boolean {
    // Exact match
    if (path === pattern) {
      return true
    }

    // Handle simple wildcards (e.g., /usr/lib/lib*.so)
    if (pattern.includes('*')) {
      const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`^${escapedPattern.replace(/\*/g, '.*')}$`)
      return regex.test(path)
    }

    return false
  }
}
