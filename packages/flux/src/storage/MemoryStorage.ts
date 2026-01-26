/**
 * @fileoverview In-memory storage adapter
 *
 * Simple storage for development and testing.
 *
 * @module @gravito/flux/storage
 */

import type { WorkflowFilter, WorkflowState, WorkflowStorage } from '../types'

/**
 * MemoryStorage provides a volatile, in-memory storage backend for Flux workflows.
 *
 * It is primarily intended for development, testing, and ephemeral workloads where persistence
 * across process restarts is not required.
 *
 * @example
 * ```typescript
 * const storage = new MemoryStorage();
 * await storage.save(workflowState);
 * const state = await storage.load('workflow-id');
 * ```
 */
export class MemoryStorage implements WorkflowStorage {
  private store = new Map<string, WorkflowState>()

  /**
   * Stores a workflow state in the internal Map.
   *
   * Automatically updates the `updatedAt` timestamp to reflect the current time.
   *
   * @param state - The workflow state to persist.
   * @throws {Error} If the state object is invalid or cannot be stored.
   */
  async save(state: WorkflowState): Promise<void> {
    this.store.set(state.id, {
      ...state,
      updatedAt: new Date(),
    })
  }

  /**
   * Retrieves a workflow state by its ID from the internal Map.
   *
   * @param id - The unique identifier of the workflow.
   * @returns The workflow state if found, otherwise null.
   */
  async load(id: string): Promise<WorkflowState | null> {
    return this.store.get(id) ?? null
  }

  /**
   * Filters and returns workflow states stored in memory.
   *
   * Supports filtering by name and status, and provides basic pagination.
   * Results are sorted by creation date in descending order.
   *
   * @param filter - Criteria for filtering and paginating results.
   * @returns An array of matching workflow states.
   */
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

  /**
   * Removes a workflow state from the internal Map.
   *
   * @param id - The unique identifier of the workflow to delete.
   */
  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }

  /**
   * Initializes the memory storage.
   *
   * This is a no-op for MemoryStorage but satisfies the WorkflowStorage interface.
   */
  async init(): Promise<void> {
    // No-op for memory storage
  }

  /**
   * Clears all stored workflow states and resets the storage.
   */
  async close(): Promise<void> {
    this.store.clear()
  }

  /**
   * Returns the total number of workflow states currently stored in memory.
   *
   * Useful for assertions in test environments.
   *
   * @returns The number of entries in the store.
   */
  size(): number {
    return this.store.size
  }
}
