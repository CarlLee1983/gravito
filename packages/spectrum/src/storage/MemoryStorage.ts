/**
 * @gravito/spectrum - MemoryStorage
 *
 * Non-persistent storage for development.
 */

import type { CapturedLog, CapturedQuery, CapturedRequest } from '../types'
import type { SpectrumStorage } from './types'

/**
 * MemoryStorage provides a fast, non-persistent storage backend for Spectrum telemetry.
 *
 * This implementation is ideal for local development environments where data persistence
 * across server restarts is not required. It maintains all captured data in memory
 * and automatically prunes old records based on the configured limits.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const storage = new MemoryStorage();
 * ```
 */
export class MemoryStorage implements SpectrumStorage {
  private requests: CapturedRequest[] = []
  private logs: CapturedLog[] = []
  private queries: CapturedQuery[] = []
  private maxItems = 1000

  /**
   * Initializes the memory storage.
   *
   * As memory storage does not require external resources, this is a no-op.
   *
   * @returns Resolves immediately
   */
  async init(): Promise<void> {
    // No-op
  }

  /**
   * Temporarily stores a captured HTTP request in memory.
   *
   * @param req - The request snapshot to store
   */
  async storeRequest(req: CapturedRequest): Promise<void> {
    this.requests.unshift(req)
    this.trim(this.requests)
  }

  /**
   * Temporarily stores a captured log entry in memory.
   *
   * @param log - The log entry to store
   */
  async storeLog(log: CapturedLog): Promise<void> {
    this.logs.unshift(log)
    this.trim(this.logs)
  }

  /**
   * Temporarily stores a captured database query in memory.
   *
   * @param query - The query information to store
   */
  async storeQuery(query: CapturedQuery): Promise<void> {
    this.queries.unshift(query)
    this.trim(this.queries)
  }

  /**
   * Retrieves a list of recent HTTP requests from memory.
   *
   * @param limit - Maximum number of requests to return
   * @param offset - Number of requests to skip for pagination
   * @returns A promise resolving to an array of captured requests
   */
  async getRequests(limit = 100, offset = 0): Promise<CapturedRequest[]> {
    return this.requests.slice(offset, offset + limit)
  }

  /**
   * Finds a specific HTTP request by its unique identifier.
   *
   * @param id - The unique ID of the request to find
   * @returns The found request or null if not present
   */
  async getRequest(id: string): Promise<CapturedRequest | null> {
    return this.requests.find((r) => r.id === id) || null
  }

  /**
   * Retrieves a list of recent application logs from memory.
   *
   * @param limit - Maximum number of logs to return
   * @param offset - Number of logs to skip for pagination
   * @returns A promise resolving to an array of captured logs
   */
  async getLogs(limit = 100, offset = 0): Promise<CapturedLog[]> {
    return this.logs.slice(offset, offset + limit)
  }

  /**
   * Retrieves a list of recent database queries from memory.
   *
   * @param limit - Maximum number of queries to return
   * @param offset - Number of queries to skip for pagination
   * @returns A promise resolving to an array of captured queries
   */
  async getQueries(limit = 100, offset = 0): Promise<CapturedQuery[]> {
    return this.queries.slice(offset, offset + limit)
  }

  /**
   * Wipes all captured telemetry data from memory.
   *
   * @returns Resolves when all collections are emptied
   */
  async clear(): Promise<void> {
    this.requests = []
    this.logs = []
    this.queries = []
  }

  /**
   * Sets a new capacity limit and prunes existing data to fit.
   *
   * @param maxItems - The new maximum number of items to retain per category
   */
  async prune(maxItems: number): Promise<void> {
    this.maxItems = maxItems
    this.trim(this.requests)
    this.trim(this.logs)
    this.trim(this.queries)
  }

  /**
   * Truncates an array to ensure it does not exceed the maximum allowed capacity.
   *
   * @param arr - The target array to truncate
   */
  private trim(arr: any[]) {
    if (arr.length > this.maxItems) {
      arr.splice(this.maxItems)
    }
  }
}
