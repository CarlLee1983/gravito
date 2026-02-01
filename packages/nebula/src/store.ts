/**
 * StorageStore defines the low-level contract for storage backends.
 *
 * All storage drivers (Local, S3, Memory, etc.) must implement this interface.
 * It focuses on raw I/O operations without higher-level logic like hooks.
 *
 * @public
 */
export interface StorageStore {
  // ==================== 基本操作 ====================

  /**
   * Persists data to the storage backend.
   *
   * 儲存檔案
   * @param key - Unique identifier or path for the file
   * @param data - Content to be stored
   * @throws {Error} If the backend fails to write the data
   */
  put(key: string, data: Blob | Buffer | string): Promise<void>

  /**
   * Retrieves data from the storage backend.
   *
   * 讀取檔案
   * @param key - Unique identifier or path for the file
   * @returns The file content as a Blob, or null if the key does not exist
   */
  get(key: string): Promise<Blob | null>

  /**
   * Removes data from the storage backend.
   *
   * 刪除檔案
   * @param key - Unique identifier or path for the file
   * @returns True if the file was successfully deleted, false if it didn't exist
   */
  delete(key: string): Promise<boolean>

  /**
   * Verifies the existence of a file.
   *
   * 檢查檔案是否存在
   * @param key - Unique identifier or path for the file
   * @returns True if the file exists, false otherwise
   */
  exists(key: string): Promise<boolean>

  // ==================== 進階操作 ====================

  /**
   * Duplicates a file within the same storage backend.
   *
   * 複製檔案
   * @param from - Source identifier
   * @param to - Destination identifier
   * @throws {Error} If the source file is missing or copy fails
   */
  copy(from: string, to: string): Promise<void>

  /**
   * Relocates or renames a file within the same storage backend.
   *
   * 移動/重命名檔案
   * @param from - Current identifier
   * @param to - New identifier
   * @throws {Error} If the source file is missing or move fails
   */
  move(from: string, to: string): Promise<void>

  /**
   * Enumerates files and directories.
   *
   * 列出檔案 (可選實作，需要 RuntimeAdapter 支援)
   * @param prefix - Optional path prefix to filter results
   * @returns An async iterable of storage items
   */
  list?(prefix?: string): AsyncIterable<StorageItem>

  /**
   * Lists files with pagination support.
   *
   * 分頁列舉檔案（適合大型儲存空間）
   * Recommended for large storage backends (S3, GCS) to prevent OOM.
   * Provides cursor-based pagination for efficient large-scale file enumeration.
   *
   * @param prefix - Optional path prefix to filter results
   * @param options - Pagination and filtering options
   * @returns Paginated list result with cursor for next page
   */
  listPaginated?(prefix: string, options?: ListOptions): Promise<ListResult>

  // ==================== 元資料 ====================

  /**
   * Retrieves technical information about a file.
   *
   * 取得檔案元資料
   * @param key - Unique identifier or path for the file
   * @returns Metadata object or null if file not found
   */
  getMetadata(key: string): Promise<StorageMetadata | null>

  // ==================== URL ====================

  /**
   * Generates a publicly accessible URL for the file.
   *
   * 取得公開 URL
   * @param key - Unique identifier or path for the file
   * @returns The URL string
   */
  getUrl(key: string): string

  /**
   * Generates a time-limited, authorized URL.
   *
   * 取得有時效的簽名 URL (可選實作)
   * @param key - Unique identifier or path for the file
   * @param expiresIn - Duration in seconds until the URL expires
   * @returns A promise resolving to the signed URL string
   */
  getSignedUrl?(key: string, expiresIn: number): Promise<string>

  // ==================== 串流操作 ====================

  /**
   * Writes data from a readable stream.
   *
   * 串流寫入檔案（可選實作）
   * Useful for handling large files without loading entire content into memory.
   *
   * @param key - Unique identifier or path for the file
   * @param stream - Readable stream containing the data
   * @throws {Error} If the backend fails to write the stream
   */
  putStream?(key: string, stream: ReadableStream<Uint8Array>): Promise<void>

  /**
   * Reads data as a readable stream.
   *
   * 串流讀取檔案（可選實作）
   * Useful for handling large files without loading entire content into memory.
   *
   * @param key - Unique identifier or path for the file
   * @returns A readable stream of the file content, or null if the key does not exist
   */
  getStream?(key: string): Promise<ReadableStream<Uint8Array> | null>
}

/**
 * StorageMetadata represents technical details of a stored file.
 *
 * 檔案元資料
 * @public
 */
export interface StorageMetadata {
  /** 檔案路徑 */
  key: string
  /** 檔案大小 (bytes) */
  size: number
  /** MIME 類型 */
  mimeType?: string
  /** 最後修改時間 */
  lastModified?: Date
  /** ETag (用於快取驗證) */
  etag?: string
}

/**
 * StorageItem represents an entry in a file listing.
 *
 * 檔案清單項目
 * @public
 */
export interface StorageItem {
  /** 檔案路徑 */
  key: string
  /** 是否為目錄 */
  isDirectory: boolean
  /** 檔案大小 (目錄為 undefined) */
  size?: number
  /** 最後修改時間 */
  lastModified?: Date
}

/**
 * ListOptions provides pagination and filtering options for file listing.
 *
 * 列舉選項（分頁與過濾）
 * @public
 */
export interface ListOptions {
  /** 最大回傳數量（預設: 1000） */
  maxResults?: number
  /** 分頁游標（繼續上次的列舉） */
  cursor?: string
  /** 是否包含子目錄（預設: true） */
  recursive?: boolean
}

/**
 * ListResult contains paginated file listing results.
 *
 * 分頁列舉結果
 * @public
 */
export interface ListResult {
  /** 檔案清單項目 */
  items: StorageItem[]
  /** 下一頁游標（null 表示沒有更多結果） */
  nextCursor: string | null
  /** 是否還有更多結果 */
  hasMore: boolean
  /** 本次回傳的項目數量 */
  count: number
}
