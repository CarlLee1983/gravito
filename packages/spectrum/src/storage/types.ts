/**
 * @gravito/spectrum - Storage Contract
 */

import type { CapturedLog, CapturedQuery, CapturedRequest } from '../types'

/**
 * Interface for Spectrum storage backends.
 *
 * Implement this interface to provide custom storage for captured telemetry
 * data (requests, logs, queries).
 *
 * @public
 * @since 3.0.0
 */
export interface SpectrumStorage {
  /**
   * Initialize storage driver
   */
  init(): Promise<void>

  /**
   * Store a captured request
   */
  storeRequest(req: CapturedRequest): Promise<void>

  /**
   * Store a captured log
   */
  storeLog(log: CapturedLog): Promise<void>

  /**
   * Store a captured database query
   */
  storeQuery(query: CapturedQuery): Promise<void>

  /**
   * Retrieve recent requests
   */
  getRequests(limit?: number, offset?: number): Promise<CapturedRequest[]>

  /**
   * Retrieve specific request by ID
   */
  getRequest(id: string): Promise<CapturedRequest | null>

  /**
   * Retrieve recent logs
   */
  getLogs(limit?: number, offset?: number): Promise<CapturedLog[]>

  /**
   * Retrieve recent queries
   */
  getQueries(limit?: number, offset?: number): Promise<CapturedQuery[]>

  /**
   * Clear all data
   */
  clear(): Promise<void>

  /**
   * Prune old data (maintenance)
   */
  prune(maxItems: number): Promise<void>
}
