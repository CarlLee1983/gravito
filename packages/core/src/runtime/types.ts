/**
 * Runtime abstraction type definitions.
 *
 * @module runtime/types
 * @since 3.2.0
 */

/**
 * Detected Javascript Runtime Environment
 * @public
 */
export type RuntimeKind = 'bun' | 'node' | 'deno' | 'unknown'

/**
 * Options for spawning subprocesses
 * @public
 */
export interface RuntimeSpawnOptions {
  cwd?: string
  env?: Record<string, string | undefined>
  stdin?: 'pipe' | 'inherit' | 'ignore'
  stdout?: 'pipe' | 'inherit' | 'ignore'
  stderr?: 'pipe' | 'inherit' | 'ignore'
  timeout?: number
  signal?: AbortSignal
}

/**
 * Resource usage statistics from subprocess
 * @public
 */
export interface RuntimeResourceUsage {
  cpuTime?: { user: number; system: number }
  maxRSS?: number
}

/**
 * Optional resource usage statistics
 * @internal
 */
export type OptionalRuntimeResourceUsage = RuntimeResourceUsage | undefined

/**
 * Output from spawned subprocess
 * @public
 */
export interface RuntimeProcessOutput {
  exitCode: number
  stdout: string
  stderr: string
  success: boolean
  timedOut: boolean
}

/**
 * Synchronous subprocess result
 * @public
 */
export interface RuntimeSpawnSyncResult {
  exitCode: number
  stdout: string
  stderr: string
  success: boolean
  timedOut: boolean
}

/**
 * Abstract subprocess interface
 * @public
 */
export interface RuntimeProcess {
  exited: Promise<number>
  stdout?: ReadableStream<Uint8Array> | null
  stderr?: ReadableStream<Uint8Array> | null
  kill?: (signal?: string | number) => void
  unref?: () => void
  resourceUsage?: () => Promise<OptionalRuntimeResourceUsage>
}

/**
 * File statistics abstraction
 * @public
 */
export interface RuntimeFileStat {
  size: number
}

/**
 * HTTP Server configuration
 * @public
 */
export interface RuntimeServeConfig {
  port?: number
  fetch: (req: Request, server?: unknown) => Response | Promise<Response>
  websocket?: unknown
}

/**
 * HTTP Server interface
 * @public
 */
export interface RuntimeServer {
  stop?: () => void
}

/**
 * Incremental file writing interface (FileSink abstraction)
 * @public
 */
export interface RuntimeFileSink {
  /** Write data to the file sink */
  write(data: string | Uint8Array | ArrayBuffer): void
  /** Flush buffered data to disk */
  flush(): Promise<void>
  /** Close the sink and flush remaining data */
  end(): Promise<void>
}

/**
 * Abstraction layer for filesystem and process operations across runtimes.
 * @public
 */
export interface RuntimeAdapter {
  kind: RuntimeKind
  spawn(command: string[], options?: RuntimeSpawnOptions): RuntimeProcess
  spawnAndCollect(command: string[], options?: RuntimeSpawnOptions): Promise<RuntimeProcessOutput>
  spawnSync(
    command: string[],
    options?: Omit<RuntimeSpawnOptions, 'signal'>
  ): RuntimeSpawnSyncResult
  writeFile(path: string, data: Blob | Buffer | string | ArrayBuffer | Uint8Array): Promise<void>
  readFile(path: string): Promise<Uint8Array>
  readFileAsBlob(path: string): Promise<Blob>
  exists(path: string): Promise<boolean>
  stat(path: string): Promise<RuntimeFileStat>
  deleteFile(path: string): Promise<void>
  serve(config: RuntimeServeConfig): RuntimeServer

  /** Append data to a file (optional) */
  appendFile?(path: string, data: string | Uint8Array): Promise<void>
  /** Read file as UTF-8 text (optional) */
  readFileAsText?(path: string): Promise<string>
  /** Read and parse JSON file (optional) */
  readFileAsJSON?<T = unknown>(path: string): Promise<T>
  /** Create directory (optional) */
  mkdir?(path: string, options?: { recursive?: boolean }): Promise<void>
  /** Read directory contents (optional) */
  readDir?(path: string): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>>
  /** Get full file statistics including modification time (optional) */
  statFull?(
    path: string
  ): Promise<{ size: number; mtimeMs: number; isFile: boolean; isDirectory: boolean }>
  /** Rename/move a file (optional) */
  rename?(oldPath: string, newPath: string): Promise<void>
  /** Create an incremental file writer (FileSink) (optional) */
  createFileSink?(path: string): RuntimeFileSink
  /** Recursively remove a directory (optional) */
  removeRecursive?(path: string): Promise<void>
  /** Create/write a file exclusively (atomic) (optional) */
  writeFileExclusive?(path: string, data: string | Uint8Array): Promise<void>
}

/**
 * Abstraction layer for password hashing
 * @public
 */
export interface RuntimePasswordAdapter {
  hash(
    value: string,
    options:
      | { algorithm: 'bcrypt'; cost?: number }
      | {
          algorithm: 'argon2id'
          memoryCost?: number
          timeCost?: number
          parallelism?: number
        }
  ): Promise<string>
  verify(value: string, hashed: string): Promise<boolean>
}

/**
 * SQLite Statement abstraction
 * @public
 */
export interface RuntimeSqliteStatement {
  run(params?: Record<string, unknown>): void
  get(params?: Record<string, unknown>): unknown
  all(params?: Record<string, unknown>): unknown[]
}

/**
 * SQLite Database abstraction
 * @public
 */
export interface RuntimeSqliteDatabase {
  run(sql: string): void
  prepare(sql: string): RuntimeSqliteStatement
  query(sql: string): RuntimeSqliteStatement
  close(): void
}

// ============ Archive Support Types ============

/**
 * 歸檔項目 -- 支援多種資料來源
 * @public
 */
export interface ArchiveEntry {
  /** 歸檔中的路徑（自動正規化為正斜線） */
  readonly path: string
  /** 資料內容 */
  readonly data: string | Blob | ArrayBuffer | Uint8Array
}

/**
 * 歸檔建立選項
 * @public
 */
export interface ArchiveCreateOptions {
  /** 壓縮演算法（目前僅支援 gzip） */
  compress?: 'gzip'
  /** 壓縮等級（1-12，預設 6） */
  level?: number
}

/**
 * 歸檔提取選項
 * @public
 */
export interface ArchiveExtractOptions {
  /** Glob 模式過濾（僅提取匹配的檔案） */
  glob?: string | readonly string[]
}

/**
 * 歸檔中的檔案資訊
 * @public
 */
export interface ArchiveFileInfo {
  /** 檔案路徑 */
  readonly path: string
  /** 檔案大小（bytes） */
  readonly size: number
  /** 最後修改時間 */
  readonly lastModified: number
  /** 讀取文字內容 */
  text(): Promise<string>
  /** 讀取為 ArrayBuffer */
  arrayBuffer(): Promise<ArrayBuffer>
}

/**
 * 歸檔操作的運行時抽象
 * @public
 */
export interface RuntimeArchiveAdapter {
  /**
   * 從檔案/目錄映射建立歸檔
   * @param entries - 路徑到內容的映射
   * @param options - 壓縮選項
   * @returns 歸檔的二進位資料
   */
  create(
    entries: Record<string, string | Blob | ArrayBuffer | Uint8Array>,
    options?: ArchiveCreateOptions
  ): Promise<Uint8Array>

  /**
   * 提取歸檔到指定目錄
   * @param data - 歸檔二進位資料
   * @param targetDir - 目標目錄（自動建立）
   * @param options - 提取選項（glob 過濾）
   * @returns 提取的檔案數量
   */
  extract(
    data: Blob | ArrayBuffer | Uint8Array,
    targetDir: string,
    options?: ArchiveExtractOptions
  ): Promise<number>

  /**
   * 讀取歸檔中的檔案列表（不提取）
   * @param data - 歸檔二進位資料
   * @param glob - 可選的 glob 過濾
   * @returns 路徑到檔案資訊的映射
   */
  list(
    data: Blob | ArrayBuffer | Uint8Array,
    glob?: string | readonly string[]
  ): Promise<Map<string, ArchiveFileInfo>>

  /**
   * 從歸檔中讀取單一檔案
   * @param data - 歸檔二進位資料
   * @param filePath - 檔案路徑
   * @returns 檔案內容，若不存在則回傳 null
   */
  readFile(data: Blob | ArrayBuffer | Uint8Array, filePath: string): Promise<Uint8Array | null>
}

// ============ Compression Support Types ============

/**
 * 壓縮選項
 * @public
 */
export interface CompressionOptions {
  /** 壓縮等級（1-9，預設 6） */
  level?: number
}

/**
 * 壓縮操作的運行時抽象
 * @public
 */
export interface RuntimeCompressionAdapter {
  /**
   * Gzip 壓縮（同步）
   * @param data - 原始資料
   * @param options - 壓縮選項
   * @returns 壓縮後的資料
   */
  gzipSync(data: Uint8Array, options?: CompressionOptions): Uint8Array

  /**
   * Gzip 解壓縮（同步）
   * @param data - 壓縮資料
   * @returns 原始資料
   */
  gunzipSync(data: Uint8Array): Uint8Array

  /**
   * Deflate 壓縮（同步）
   * @param data - 原始資料
   * @param options - 壓縮選項
   * @returns 壓縮後的資料
   */
  deflateSync(data: Uint8Array, options?: CompressionOptions): Uint8Array

  /**
   * Inflate 解壓縮（同步）
   * @param data - 壓縮資料
   * @returns 原始資料
   */
  inflateSync(data: Uint8Array): Uint8Array

  /**
   * Gzip 壓縮（非同步）
   * @param data - 原始資料
   * @param options - 壓縮選項
   * @returns 壓縮後的資料
   */
  gzip(data: Uint8Array, options?: CompressionOptions): Promise<Uint8Array>

  /**
   * Gzip 解壓縮（非同步）
   * @param data - 壓縮資料
   * @returns 原始資料
   */
  gunzip(data: Uint8Array): Promise<Uint8Array>
}

// ============ Archive Directory Helper Types ============

/**
 * archiveFromDirectory 的選項
 * @public
 */
export interface ArchiveFromDirectoryOptions {
  /** 壓縮選項 */
  compress?: 'gzip'
  /** 壓縮等級（1-12） */
  level?: number
  /** Glob 模式過濾 */
  glob?: string
}

// ============ Markdown Support Types ============

/**
 * Markdown 渲染選項
 * @public
 */
export interface MarkdownRenderOptions {
  /** 是否啟用 GFM 擴展（表格、刪除線、任務列表）。預設 true */
  gfm?: boolean
}

/**
 * Markdown render() 自訂渲染回調集合。
 *
 * 每個回調攔截對應的 Markdown 元素，回傳自訂 HTML 字串。
 * 僅在 Bun 原生環境（Bun.markdown.render）下完全支援；
 * Fallback 環境下透過 marked Renderer 模擬。
 *
 * @public
 */
export interface MarkdownRenderCallbacks {
  /** 標題回調：(content, { level }) => html */
  heading?: (content: string, opts: { level: number }) => string
  /** 連結回調：(content, { href, title? }) => html */
  link?: (content: string, opts: { href: string; title?: string }) => string
  /** 程式碼區塊回調：(code, { language? }) => html */
  code?: (code: string, opts: { language?: string }) => string
  /** 行內程式碼回調：(code) => html */
  codespan?: (code: string) => string
  /** 圖片回調：(alt, { src, title? }) => html */
  image?: (alt: string, opts: { src: string; title?: string }) => string
  /** 原始 HTML 回調：(rawHtml) => html（用於 XSS 過濾） */
  html?: (rawHtml: string) => string
  /** 段落回調：(content) => html */
  paragraph?: (content: string) => string
  /** 粗體回調：(content) => html */
  strong?: (content: string) => string
  /** 斜體回調：(content) => html */
  em?: (content: string) => string
  /** 刪除線回調：(content) => html */
  del?: (content: string) => string
  /** 列表回調：(content, { ordered, start? }) => html */
  list?: (content: string, opts: { ordered: boolean; start?: number }) => string
  /** 列表項回調：(content) => html */
  listItem?: (content: string) => string
  /** 引用區塊回調：(content) => html */
  blockquote?: (content: string) => string
  /** 表格回調：(content) => html */
  table?: (content: string) => string
  /** 水平線回調：() => html */
  hr?: () => string
}

/**
 * Markdown 操作的運行時抽象
 * @public
 */
export interface RuntimeMarkdownAdapter {
  /**
   * 將 Markdown 轉換為 HTML 字串。
   * 在 Bun 環境下使用原生 C++ 解析器（10-100x 更快）。
   *
   * @param markdown - Markdown 原始文字
   * @param options - 渲染選項
   * @returns HTML 字串
   */
  html(markdown: string, options?: MarkdownRenderOptions): string

  /**
   * 使用自訂回調渲染 Markdown。
   * 允許攔截個別元素的渲染過程。
   *
   * @param markdown - Markdown 原始文字
   * @param callbacks - 自訂渲染回調
   * @returns 渲染後的字串
   */
  render(markdown: string, callbacks?: MarkdownRenderCallbacks): string

  /**
   * 將 Markdown 轉換為 React 元素結構。
   * 僅在 Bun 原生環境下可用，其餘回傳 null。
   *
   * @param markdown - Markdown 原始文字
   * @returns React 元素物件或 null
   */
  react(markdown: string): unknown | null

  /**
   * 是否使用原生實作（Bun.markdown）
   */
  readonly isNative: boolean
}
