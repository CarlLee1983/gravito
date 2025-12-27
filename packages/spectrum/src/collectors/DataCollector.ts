/**
 * @gravito/spectrum - DataCollector
 */

import type { CapturedLog, CapturedQuery, CapturedRequest } from '../types'

export class DataCollector {
  private requests: CapturedRequest[] = []
  private logs: CapturedLog[] = []
  private queries: CapturedQuery[] = []

  private maxItems = 100

  constructor(options: { maxItems?: number } = {}) {
    if (options.maxItems) {
      this.maxItems = options.maxItems
    }
  }

  addRequest(request: CapturedRequest) {
    this.requests.unshift(request)
    if (this.requests.length > this.maxItems) {
      this.requests.pop()
    }
  }

  addLog(log: CapturedLog) {
    this.logs.unshift(log)
    if (this.logs.length > this.maxItems) {
      this.logs.pop()
    }
  }

  addQuery(query: CapturedQuery) {
    this.queries.unshift(query)
    if (this.queries.length > this.maxItems) {
      this.queries.pop()
    }
  }

  getRequests() {
    return this.requests
  }

  getLogs() {
    return this.logs
  }

  getQueries() {
    return this.queries
  }

  clear() {
    this.requests = []
    this.logs = []
    this.queries = []
  }
}

export const collector = new DataCollector()
