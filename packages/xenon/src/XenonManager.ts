/**
 * Xenon Manager
 * Core FFI management with memory tracking and safety
 */

import { XenonMemoryError } from './errors'
import { LibraryLoader } from './library/LibraryLoader'
import { createBorrowedBuffer, createOwnedBuffer } from './memory/BufferOwnership'
import { MemoryTracker } from './memory/MemoryTracker'
import type { FFISymbols, LibraryHandle, ManagedBuffer, XenonManagerConfig } from './types'

/**
 * High-level FFI manager
 * Combines library loading, memory tracking, and safety checks
 */
export class XenonManager {
  private loader: LibraryLoader
  private memoryTracker: MemoryTracker
  private bufferMap: Map<Uint8Array, number> = new Map()
  private nextPtr = 0x1000

  constructor(config: XenonManagerConfig = {}) {
    this.loader = new LibraryLoader(config)
    this.memoryTracker = new MemoryTracker(config.maxTotalMemory ?? 1024 * 1024 * 1024)
  }

  /**
   * Load a native library
   * @param name Library name (for identification)
   * @param path Full path to library file
   * @param symbols FFI symbol definitions
   * @returns LibraryHandle
   * @throws XenonSecurityError if path validation fails
   * @throws XenonTypeError if symbols invalid
   */
  load(name: string, path: string, symbols: FFISymbols): LibraryHandle {
    return this.loader.load(name, path, symbols)
  }

  /**
   * Unload a library
   * @param path Library path
   */
  unload(path: string): void {
    this.loader.unload(path)
  }

  /**
   * Allocate managed memory buffer
   * Memory is owned by Xenon and tracked for lifecycle
   * @param size Size in bytes
   * @param label Debug label
   * @returns TypedArray wrapper (use as ptr for FFI calls)
   */
  allocBuffer(size: number, label = 'buffer'): Uint8Array {
    if (size <= 0) {
      throw new XenonMemoryError(`Invalid buffer size: ${size}`)
    }

    const buffer = new Uint8Array(size)
    const ptr = this.nextPtr++

    this.bufferMap.set(buffer, ptr)

    const bufMeta = createOwnedBuffer(ptr, size, label)
    this.memoryTracker.register(bufMeta, buffer)

    return buffer
  }

  /**
   * Release owned memory buffer
   * Marks buffer as freed and prevents further use
   * @param bufferOrPtr TypedArray or pointer number
   * @throws XenonMemoryError on double-free
   */
  freeBuffer(bufferOrPtr: Uint8Array | number): void {
    let ptr: number

    if (typeof bufferOrPtr === 'number') {
      ptr = bufferOrPtr
    } else {
      const mappedPtr = this.bufferMap.get(bufferOrPtr)
      if (mappedPtr === undefined) {
        throw new XenonMemoryError('Buffer not allocated by this manager')
      }
      ptr = mappedPtr
      this.bufferMap.delete(bufferOrPtr)
    }

    this.memoryTracker.free(ptr)
  }

  /**
   * Create borrowed buffer wrapper
   * Caller is responsible for freeing
   * @param ptr Pointer value
   * @param len Buffer length in bytes
   * @param label Debug label
   * @returns Borrowed buffer metadata
   */
  borrowBuffer(ptr: number, len: number, label = 'borrowed'): ManagedBuffer {
    const bufMeta = createBorrowedBuffer(ptr, len, label)
    this.memoryTracker.register(bufMeta)
    return bufMeta
  }

  /**
   * Get memory statistics
   * @returns Memory stats (allocated, freed, active count, peak)
   */
  getMemoryStats() {
    return this.memoryTracker.getStats()
  }

  /**
   * List all tracked buffers
   * @param includeFreed Include freed buffers
   * @returns Array of buffer metadata
   */
  listBuffers(includeFreed = false) {
    return this.memoryTracker.listBuffers(includeFreed)
  }

  /**
   * List all loaded libraries
   * @returns Array of [name, path] tuples
   */
  listLibraries(): [string, string][] {
    return this.loader.listLibraries()
  }

  /**
   * Close all resources
   * Unloads all libraries and clears memory tracking
   */
  close(): void {
    this.loader.closeAll()
    this.memoryTracker.clear()
    this.bufferMap.clear()
  }
}
