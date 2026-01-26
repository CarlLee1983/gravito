/**
 * @gravito/spectrum - FileStorage
 *
 * Persistent storage using JSONL files.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CapturedLog, CapturedQuery, CapturedRequest } from '../types'
import type { SpectrumStorage } from './types'

/**
 * Configuration for the `FileStorage` backend.
 *
 * @public
 * @since 3.0.0
 */
export interface FileStorageConfig {
  /** The directory where captured telemetry data will be stored as JSONL files. */
  directory: string
}

/**
 * FileStorage persists Spectrum telemetry data to the local file system.
 *
 * It uses newline-delimited JSON (JSONL) files for efficient appends and
 * maintains an in-memory cache for fast dashboard retrieval.
 *
 * @public
 * @since 3.0.0
 */
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

  /**
   * Initializes a new instance of FileStorage.
   *
   * @param config - Configuration including the target directory for JSONL files
   *
   * @example
   * ```typescript
   * const storage = new FileStorage({ directory: './storage' });
   * ```
   */
  constructor(private config: FileStorageConfig) {
    this.requestsPath = join(config.directory, 'spectrum-requests.jsonl')
    this.logsPath = join(config.directory, 'spectrum-logs.jsonl')
    this.queriesPath = join(config.directory, 'spectrum-queries.jsonl')
  }

  /**
   * Initializes the storage by creating the directory and loading existing files into memory.
   *
   * @returns Resolves when initialization is complete
   * @throws {Error} If directory creation fails
   */
  async init(): Promise<void> {
    if (!existsSync(this.config.directory)) {
      mkdirSync(this.config.directory, { recursive: true })
    }

    this.loadCache(this.requestsPath, this.cache.requests)
    this.loadCache(this.logsPath, this.cache.logs)
    this.loadCache(this.queriesPath, this.cache.queries)
  }

  /**
   * Loads newline-delimited JSON data from a file into a target array.
   *
   * @param path - The absolute path to the JSONL file
   * @param target - The array to populate with parsed objects
   */
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

  /**
   * Internal helper to append data to both the in-memory cache and the JSONL file.
   *
   * @param path - File path to append to
   * @param data - The telemetry object
   * @param list - The cache array
   */
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

  /**
   * Persists a captured HTTP request.
   *
   * @param req - The request snapshot
   */
  async storeRequest(req: CapturedRequest): Promise<void> {
    await this.append(this.requestsPath, req, this.cache.requests)
  }

  /**
   * Persists a captured log entry.
   *
   * @param log - The log snapshot
   */
  async storeLog(log: CapturedLog): Promise<void> {
    await this.append(this.logsPath, log, this.cache.logs)
  }

  /**
   * Persists a captured database query.
   *
   * @param query - The query snapshot
   */
  async storeQuery(query: CapturedQuery): Promise<void> {
    await this.append(this.queriesPath, query, this.cache.queries)
  }

  /**
   * Retrieves recent HTTP requests from storage.
   *
   * @param limit - Maximum number of items to return
   * @param offset - Pagination offset
   * @returns Array of requests
   */
  async getRequests(limit = 100, offset = 0): Promise<CapturedRequest[]> {
    return this.cache.requests.slice(offset, offset + limit)
  }

  /**
   * Retrieves a specific HTTP request by its unique ID.
   *
   * @param id - The snapshot ID
   * @returns The request or null if not found
   */
  async getRequest(id: string): Promise<CapturedRequest | null> {
    return this.cache.requests.find((r) => r.id === id) || null
  }

  /**
   * Retrieves recent logs from storage.
   *
   * @param limit - Maximum number of items to return
   * @param offset - Pagination offset
   * @returns Array of logs
   */
  async getLogs(limit = 100, offset = 0): Promise<CapturedLog[]> {
    return this.cache.logs.slice(offset, offset + limit)
  }

  /**
   * Retrieves recent database queries from storage.
   *
   * @param limit - Maximum number of items to return
   * @param offset - Pagination offset
   * @returns Array of queries
   */
  async getQueries(limit = 100, offset = 0): Promise<CapturedQuery[]> {
    return this.cache.queries.slice(offset, offset + limit)
  }

  /**
   * Wipes all data from both cache and files.
   */
  async clear(): Promise<void> {
    this.cache.requests = []
    this.cache.logs = []
    this.cache.queries = []

    writeFileSync(this.requestsPath, '')
    writeFileSync(this.logsPath, '')
    writeFileSync(this.queriesPath, '')
  }

  /**
   * Truncates the storage to stay within the specified limit.
   *
   * @param maxItems - The maximum allowed records per category
   */
  async prune(maxItems: number): Promise<void> {
    if (this.cache.requests.length > maxItems) {
      this.cache.requests = this.cache.requests.slice(0, maxItems)
      this.rewrite(this.requestsPath, this.cache.requests)
    }

    if (this.cache.logs.length > maxItems) {
      this.cache.logs = this.cache.logs.slice(0, maxItems)
      this.rewrite(this.logsPath, this.cache.logs)
    }

    if (this.cache.queries.length > maxItems) {
      this.cache.queries = this.cache.queries.slice(0, maxItems)
      this.rewrite(this.queriesPath, this.cache.queries)
    }
  }

  /**
   * Overwrites the file content with the current in-memory data.
   *
   * @param path - File path to overwrite
   * @param data - The array of data objects
   */
  private rewrite(path: string, data: any[]) {
    const content = `${data
      .slice()
      .reverse()
      .map((d) => JSON.stringify(d))
      .join('\n')}\n`
    writeFileSync(path, content)
  }
}
