/**
 * @fileoverview In-memory storage adapter
 *
 * Simple storage for development and testing.
 *
 * @module @gravito/flux/storage
 */

import type { WorkflowFilter, WorkflowState, WorkflowStorage } from '../types'

/**
 * Memory Storage
 *
 * In-memory storage adapter for development and testing.
 * Data is not persisted across restarts.
 */
export class MemoryStorage implements WorkflowStorage {
  private store = new Map<string, WorkflowState>()

  async save(state: WorkflowState): Promise<void> {
    this.store.set(state.id, {
      ...state,
      updatedAt: new Date(),
    })
  }

  async load(id: string): Promise<WorkflowState | null> {
    return this.store.get(id) ?? null
  }

  async list(filter?: WorkflowFilter): Promise<WorkflowState[]> {
    let results = Array.from(this.store.values())

    if (filter?.name) {
      results = results.filter((s) => s.name === filter.name)
    }

    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
      results = results.filter((s) => statuses.includes(s.status))
    }

    // Sort by createdAt desc
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Apply pagination
    if (filter?.offset) {
      results = results.slice(filter.offset)
    }
    if (filter?.limit) {
      results = results.slice(0, filter.limit)
    }

    return results
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }

  async init(): Promise<void> {
    // No-op for memory storage
  }

  async close(): Promise<void> {
    this.store.clear()
  }

  /**
   * Get store size (for testing)
   */
  size(): number {
    return this.store.size
  }
}
