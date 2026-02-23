/**
 * @gravito/spectrum - FileStorage
 *
 * Persistent storage using JSONL files.
 */

import { join } from 'node:path'
import type { RuntimeFileSink } from '@gravito/core'
import { getRuntimeAdapter, runtimeMkdir, runtimeReadText } from '@gravito/core'
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
 * Uses Bun-native FileSink for high-throughput buffered writes when available,
 * falling back to appendFile on other runtimes.
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

  /** RuntimeAdapter 實例，用於跨執行環境的 I/O 操作 */
  private runtime = getRuntimeAdapter()

  /** FileSink 快取，每個檔案路徑對應一個 FileSink 實例（批次寫入） */
  private sinks: Map<string, RuntimeFileSink> = new Map()

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
    // 使用 RuntimeAdapter 異步建立目錄，避免同步阻塞
    const dirExists = await this.runtime.exists(this.config.directory)
    if (!dirExists) {
      await runtimeMkdir(this.runtime, this.config.directory, { recursive: true })
    }

    await Promise.all([
      this.loadCache(this.requestsPath, this.cache.requests),
      this.loadCache(this.logsPath, this.cache.logs),
      this.loadCache(this.queriesPath, this.cache.queries),
    ])
  }

  /**
   * Loads newline-delimited JSON data from a file into a target array.
   *
   * @param path - The absolute path to the JSONL file
   * @param target - The array to populate with parsed objects
   */
  private async loadCache(path: string, target: any[]): Promise<void> {
    const fileExists = await this.runtime.exists(path)
    if (!fileExists) {
      return
    }

    try {
      const content = await runtimeReadText(this.runtime, path)
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
   * 取得或建立指定路徑的 FileSink 實例（懶初始化）。
   *
   * 優先使用 RuntimeAdapter.createFileSink（Bun 原生批次寫入），
   * 不支援時回傳 null，由 append() 改用 appendFile fallback。
   *
   * @param path - 目標檔案路徑
   */
  private getOrCreateSink(path: string): RuntimeFileSink | null {
    if (!this.runtime.createFileSink) {
      return null
    }

    let sink = this.sinks.get(path)
    if (!sink) {
      sink = this.runtime.createFileSink(path)
      this.sinks.set(path, sink)
    }
    return sink
  }

  /**
   * Internal helper to append data to both the in-memory cache and the JSONL file.
   *
   * 當 FileSink 可用時（Bun 原生），使用批次緩衝寫入（~10µs/op）；
   * 否則 fallback 到 appendFile（~100µs/op）。
   *
   * @param path - File path to append to
   * @param data - The telemetry object
   * @param list - The cache array
   */
  private async append(path: string, data: any, list: any[]): Promise<void> {
    // 加入記憶體快取
    list.unshift(data)

    const line = `${JSON.stringify(data)}\n`

    try {
      const sink = this.getOrCreateSink(path)
      if (sink) {
        // FileSink 自動緩衝，無需 await（Bun 原生批次寫入）
        sink.write(line)
      } else {
        // Fallback：使用 RuntimeAdapter.appendFile
        await this.runtime.appendFile?.(path, line)
      }
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
   * 三個檔案並行寫入以提升效能。
   */
  async clear(): Promise<void> {
    this.cache.requests = []
    this.cache.logs = []
    this.cache.queries = []

    // 先關閉現有 FileSink，避免寫入衝突
    await this.closeSinks()

    // 並行清空所有檔案
    await Promise.all([
      this.runtime.writeFile(this.requestsPath, ''),
      this.runtime.writeFile(this.logsPath, ''),
      this.runtime.writeFile(this.queriesPath, ''),
    ])
  }

  /**
   * Truncates the storage to stay within the specified limit.
   *
   * @param maxItems - The maximum allowed records per category
   */
  async prune(maxItems: number): Promise<void> {
    const tasks: Promise<void>[] = []

    if (this.cache.requests.length > maxItems) {
      this.cache.requests = this.cache.requests.slice(0, maxItems)
      tasks.push(this.rewrite(this.requestsPath, this.cache.requests))
    }

    if (this.cache.logs.length > maxItems) {
      this.cache.logs = this.cache.logs.slice(0, maxItems)
      tasks.push(this.rewrite(this.logsPath, this.cache.logs))
    }

    if (this.cache.queries.length > maxItems) {
      this.cache.queries = this.cache.queries.slice(0, maxItems)
      tasks.push(this.rewrite(this.queriesPath, this.cache.queries))
    }

    await Promise.all(tasks)
  }

  /**
   * Overwrites the file content with the current in-memory data.
   *
   * rewrite 後需重建 FileSink（因為 FileSink 是 append 模式，重寫後內容改變）。
   *
   * @param path - File path to overwrite
   * @param data - The array of data objects
   */
  private async rewrite(path: string, data: any[]): Promise<void> {
    // 先關閉該路徑的 FileSink，避免後續 append 混入過期資料
    const existingSink = this.sinks.get(path)
    if (existingSink) {
      await existingSink.end()
      this.sinks.delete(path)
    }

    const content = `${data
      .slice()
      .reverse()
      .map((d) => JSON.stringify(d))
      .join('\n')}\n`

    await this.runtime.writeFile(path, content)
  }

  /**
   * 關閉並清除所有 FileSink 實例。
   * 用於 clear() 與 destroy() 前確保緩衝資料已 flush。
   */
  private async closeSinks(): Promise<void> {
    const closePromises = Array.from(this.sinks.values()).map((sink) => sink.end())
    await Promise.all(closePromises)
    this.sinks.clear()
  }

  /**
   * Flushes all buffered FileSink data and closes file handles.
   *
   * 應在應用程式關閉前呼叫，確保所有緩衝的 telemetry 資料都寫入磁碟。
   *
   * @returns Resolves when all sinks are closed
   */
  async destroy(): Promise<void> {
    await this.closeSinks()
  }
}
