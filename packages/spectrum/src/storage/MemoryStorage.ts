/**
 * @gravito/spectrum - MemoryStorage
 *
 * Non-persistent storage for development.
 */

import type { CapturedLog, CapturedQuery, CapturedRequest } from '../types'
import type { SpectrumStorage } from './types'

export class MemoryStorage implements SpectrumStorage {
  private requests: CapturedRequest[] = []
  private logs: CapturedLog[] = []
  private queries: CapturedQuery[] = []
  private maxItems = 1000

  async init(): Promise<void> {
    // No-op
  }

  async storeRequest(req: CapturedRequest): Promise<void> {
    this.requests.unshift(req)
    this.trim(this.requests)
  }

  async storeLog(log: CapturedLog): Promise<void> {
    this.logs.unshift(log)
    this.trim(this.logs)
  }

  async storeQuery(query: CapturedQuery): Promise<void> {
    this.queries.unshift(query)
    this.trim(this.queries)
  }

  async getRequests(limit = 100, offset = 0): Promise<CapturedRequest[]> {
    return this.requests.slice(offset, offset + limit)
  }

  async getRequest(id: string): Promise<CapturedRequest | null> {
    return this.requests.find((r) => r.id === id) || null
  }

  async getLogs(limit = 100, offset = 0): Promise<CapturedLog[]> {
    return this.logs.slice(offset, offset + limit)
  }

  async getQueries(limit = 100, offset = 0): Promise<CapturedQuery[]> {
    return this.queries.slice(offset, offset + limit)
  }

  async clear(): Promise<void> {
    this.requests = []
    this.logs = []
    this.queries = []
  }

  async prune(maxItems: number): Promise<void> {
    this.maxItems = maxItems
    this.trim(this.requests)
    this.trim(this.logs)
    this.trim(this.queries)
  }

  private trim(arr: any[]) {
    if (arr.length > this.maxItems) {
      arr.splice(this.maxItems)
    }
  }
}
