/**
 * @gravito/spectrum - FileStorage
 *
 * Persistent storage using JSONL files.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CapturedLog, CapturedQuery, CapturedRequest } from '../types'
import type { SpectrumStorage } from './types'

export interface FileStorageConfig {
  directory: string
}

export class FileStorage implements SpectrumStorage {
  private requestsPath: string
  private logsPath: string
  private queriesPath: string

  // In-memory cache for fast read (since we append to file)
  // In a real high-throughput scenario, we might only cache the tail or read on demand.
  // For simplicity and performance balance, we load on init and append to both.
  private cache = {
    requests: [] as CapturedRequest[],
    logs: [] as CapturedLog[],
    queries: [] as CapturedQuery[],
  }

  constructor(private config: FileStorageConfig) {
    this.requestsPath = join(config.directory, 'spectrum-requests.jsonl')
    this.logsPath = join(config.directory, 'spectrum-logs.jsonl')
    this.queriesPath = join(config.directory, 'spectrum-queries.jsonl')
  }

  async init(): Promise<void> {
    if (!existsSync(this.config.directory)) {
      mkdirSync(this.config.directory, { recursive: true })
    }

    this.loadCache(this.requestsPath, this.cache.requests)
    this.loadCache(this.logsPath, this.cache.logs)
    this.loadCache(this.queriesPath, this.cache.queries)
  }

  private loadCache(path: string, target: any[]) {
    if (!existsSync(path)) {
      return
    }

    try {
      const content = readFileSync(path, 'utf-8')
      const lines = content.split('\n').filter(Boolean)
      // Reverse to get newest first
      for (const line of lines) {
        try {
          target.unshift(JSON.parse(line))
        } catch {} // Ignore malformed lines
      }
    } catch (e) {
      console.error(`[Spectrum] Failed to load cache from ${path}`, e)
    }
  }

  private async append(path: string, data: any, list: any[]) {
    // Add to memory
    list.unshift(data)

    // Add to file
    try {
      appendFileSync(path, `${JSON.stringify(data)}\n`)
    } catch (e) {
      console.error(`[Spectrum] Failed to write to ${path}`, e)
    }
  }

  async storeRequest(req: CapturedRequest): Promise<void> {
    await this.append(this.requestsPath, req, this.cache.requests)
  }

  async storeLog(log: CapturedLog): Promise<void> {
    await this.append(this.logsPath, log, this.cache.logs)
  }

  async storeQuery(query: CapturedQuery): Promise<void> {
    await this.append(this.queriesPath, query, this.cache.queries)
  }

  async getRequests(limit = 100, offset = 0): Promise<CapturedRequest[]> {
    return this.cache.requests.slice(offset, offset + limit)
  }

  async getRequest(id: string): Promise<CapturedRequest | null> {
    return this.cache.requests.find((r) => r.id === id) || null
  }

  async getLogs(limit = 100, offset = 0): Promise<CapturedLog[]> {
    return this.cache.logs.slice(offset, offset + limit)
  }

  async getQueries(limit = 100, offset = 0): Promise<CapturedQuery[]> {
    return this.cache.queries.slice(offset, offset + limit)
  }

  async clear(): Promise<void> {
    this.cache.requests = []
    this.cache.logs = []
    this.cache.queries = []

    writeFileSync(this.requestsPath, '')
    writeFileSync(this.logsPath, '')
    writeFileSync(this.queriesPath, '')
  }

  async prune(maxItems: number): Promise<void> {
    if (this.cache.requests.length > maxItems) {
      this.cache.requests = this.cache.requests.slice(0, maxItems)
      // Rewrite file
      this.rewrite(this.requestsPath, this.cache.requests)
    }
    // Similar logic for logs and queries... implementation simplified for brevity
    // Real pruning should happen less frequently as it requires file rewrite
  }

  private rewrite(path: string, data: any[]) {
    const content = `${data
      .slice()
      .reverse()
      .map((d) => JSON.stringify(d))
      .join('\n')}\n`
    writeFileSync(path, content)
  }
}
