/**
 * Memory Tracker with FinalizationRegistry
 * Tracks allocated buffers and detects double-free + memory leaks
 */

import { XenonMemoryError } from '../errors'
import type { ManagedBuffer, MemoryStats } from '../types'
import { isFreed, isOwned, markFreed } from './BufferOwnership'

/**
 * Memory tracker using FinalizationRegistry
 * Provides GC-aware buffer lifecycle management
 */
export class MemoryTracker {
  private buffers: Map<number, ManagedBuffer> = new Map()
  private registry: FinalizationRegistry<number>
  private maxMemory: number
  private totalAllocated = 0
  private totalFreed = 0
  private peakBuffers = 0

  constructor(maxMemory: number = 1024 * 1024 * 1024) {
    this.maxMemory = maxMemory
    this.registry = new FinalizationRegistry((ptr) => {
      this.onFinalize(ptr)
    })
  }

  /**
   * Register a managed buffer
   * For owned buffers, also registers with FinalizationRegistry
   * @param buf Buffer metadata
   * @param holdRef Optional reference to hold (for FinalizationRegistry)
   */
  register(buf: ManagedBuffer, holdRef?: any): void {
    // Check memory limit
    if (this.maxMemory > 0 && this.totalAllocated + buf.len > this.maxMemory) {
      throw new XenonMemoryError(
        `Memory limit exceeded: ${this.totalAllocated + buf.len} > ${this.maxMemory}`
      )
    }

    this.buffers.set(buf.ptr, buf)
    this.totalAllocated += buf.len

    // Update statistics
    const activeCount = this.buffers.size
    if (activeCount > this.peakBuffers) {
      this.peakBuffers = activeCount
    }

    // Register with FinalizationRegistry for leak detection (owned only)
    if (isOwned(buf) && holdRef !== undefined) {
      this.registry.register(holdRef, buf.ptr)
    }
  }

  /**
   * Mark a buffer as freed (for owned buffers)
   * Throws XenonMemoryError if already freed (double-free detection)
   * @param ptr Pointer value
   * @throws XenonMemoryError on double-free
   */
  free(ptr: number): void {
    const buf = this.buffers.get(ptr)
    if (!buf) {
      throw new XenonMemoryError(`Buffer not tracked: 0x${ptr.toString(16)}`)
    }

    if (isFreed(buf)) {
      throw new XenonMemoryError(`Double-free detected: 0x${ptr.toString(16)}`)
    }

    markFreed(buf)
    this.totalFreed += buf.len
    // Keep buffer in map but mark as freed for historical tracking
  }

  /**
   * Get buffer metadata
   * @param ptr Pointer value
   * @returns Buffer metadata or undefined
   */
  get(ptr: number): ManagedBuffer | undefined {
    return this.buffers.get(ptr)
  }

  /**
   * Check if buffer is tracked and not freed
   * @param ptr Pointer value
   * @returns true if buffer is active
   */
  isActive(ptr: number): boolean {
    const buf = this.buffers.get(ptr)
    return buf !== undefined && !isFreed(buf)
  }

  /**
   * Get memory statistics
   * @returns Memory stats object
   */
  getStats(): MemoryStats {
    // Count only non-freed buffers as active
    let activeCount = 0
    for (const buf of this.buffers.values()) {
      if (!isFreed(buf)) {
        activeCount++
      }
    }

    return {
      totalAllocated: this.totalAllocated,
      totalFreed: this.totalFreed,
      activeBuffers: activeCount,
      peakBuffers: this.peakBuffers,
    }
  }

  /**
   * List all tracked buffers (for debugging)
   * @param includeFreed Include freed buffers
   * @returns Array of buffer metadata
   */
  listBuffers(includeFreed = false): ManagedBuffer[] {
    const all = Array.from(this.buffers.values())
    return includeFreed ? all : all.filter((b) => !isFreed(b))
  }

  /**
   * Clear all tracked buffers
   * Warning: Only call when you're sure no buffer is still in use
   */
  clear(): void {
    this.buffers.clear()
    this.totalAllocated = 0
    this.totalFreed = 0
    this.peakBuffers = 0
  }

  /**
   * Handle finalization callback
   * Called by FinalizationRegistry when a buffer is garbage collected
   * @param ptr Pointer value
   */
  private onFinalize(ptr: number): void {
    const buf = this.buffers.get(ptr)
    if (buf && !isFreed(buf)) {
      console.warn(`[Xenon] Memory leak detected: owned buffer not freed before GC: ${buf.label}`)
      console.warn(`  Allocated at: ${buf.stackTrace}`)
    }
  }
}
