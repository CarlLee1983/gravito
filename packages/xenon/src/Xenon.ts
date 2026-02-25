/**
 * Xenon Static Facade
 * Global singleton API for FFI operations
 * Similar to Redis facade in plasma package
 */

import type { FFISymbols, LibraryHandle, XenonConfig } from './types'
import { XenonManager } from './XenonManager'

let instance: XenonManager | null = null
let config: XenonConfig = {}

/**
 * Xenon singleton facade
 * Provides static methods for FFI operations
 */
export class Xenon {
  /**
   * Configure Xenon with security policies
   * Must be called before any load operations
   * @param cfg Configuration object
   */
  static configure(cfg: XenonConfig): void {
    config = cfg
    // Reset instance to apply new config
    instance = null
  }

  /**
   * Load a native library
   * @param name Library name (e.g., 'sqlite3')
   * @param config Load configuration with path and symbols
   * @returns LibraryHandle for FFI operations
   */
  static load(
    name: string,
    cfg: {
      path: string
      symbols: FFISymbols
    }
  ): LibraryHandle {
    const manager = Xenon.getInstance()
    return manager.load(name, cfg.path, cfg.symbols)
  }

  /**
   * Allocate managed memory buffer
   * @param size Size in bytes
   * @param label Debug label
   * @returns Uint8Array buffer
   */
  static allocBuffer(size: number, label?: string): Uint8Array {
    const manager = Xenon.getInstance()
    return manager.allocBuffer(size, label)
  }

  /**
   * Free managed memory buffer
   * @param buffer Uint8Array or pointer
   */
  static freeBuffer(buffer: Uint8Array | number): void {
    const manager = Xenon.getInstance()
    manager.freeBuffer(buffer)
  }

  /**
   * Get memory statistics
   * @returns Memory stats
   */
  static getMemoryStats() {
    const manager = Xenon.getInstance()
    return manager.getMemoryStats()
  }

  /**
   * List all loaded libraries
   * @returns Array of [name, path] tuples
   */
  static listLibraries(): [string, string][] {
    const manager = Xenon.getInstance()
    return manager.listLibraries()
  }

  /**
   * Get current configuration
   * @returns Current config
   */
  static getConfig(): XenonConfig {
    return { ...config }
  }

  /**
   * Close all resources
   * Resets singleton instance
   */
  static close(): void {
    if (instance) {
      instance.close()
      instance = null
    }
  }

  /**
   * Reset to default state
   * Clears configuration and instance
   */
  static reset(): void {
    Xenon.close()
    config = {}
  }

  /**
   * Get or create singleton manager instance
   * @returns XenonManager instance
   */
  private static getInstance(): XenonManager {
    if (!instance) {
      instance = new XenonManager(config)
    }
    return instance
  }
}
