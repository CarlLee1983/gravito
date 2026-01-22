/**
 * 底層儲存介面
 *
 * 所有儲存後端 (Local, S3, GCS 等) 必須實作此介面
 *
 * @public
 * @since 4.0.0
 */
export interface StorageStore {
  // ==================== 基本操作 ====================

  /**
   * 儲存檔案
   * @param key - 檔案路徑 (例如: 'avatars/user1.jpg')
   * @param data - 檔案內容
   */
  put(key: string, data: Blob | Buffer | string): Promise<void>

  /**
   * 讀取檔案
   * @param key - 檔案路徑
   * @returns 檔案內容，若不存在則回傳 null
   */
  get(key: string): Promise<Blob | null>

  /**
   * 刪除檔案
   * @param key - 檔案路徑
   * @returns 是否成功刪除 (若檔案不存在則回傳 false)
   */
  delete(key: string): Promise<boolean>

  /**
   * 檢查檔案是否存在
   * @param key - 檔案路徑
   */
  exists(key: string): Promise<boolean>

  // ==================== 進階操作 ====================

  /**
   * 複製檔案
   * @param from - 來源路徑
   * @param to - 目標路徑
   */
  copy(from: string, to: string): Promise<void>

  /**
   * 移動/重命名檔案
   * @param from - 來源路徑
   * @param to - 目標路徑
   */
  move(from: string, to: string): Promise<void>

  /**
   * 列出檔案 (可選實作，需要 RuntimeAdapter 支援)
   * @param prefix - 路徑前綴 (例如: 'uploads/')
   */
  list?(prefix?: string): AsyncIterable<StorageItem>

  // ==================== 元資料 ====================

  /**
   * 取得檔案元資料
   * @param key - 檔案路徑
   */
  getMetadata(key: string): Promise<StorageMetadata | null>

  // ==================== URL ====================

  /**
   * 取得公開 URL
   * @param key - 檔案路徑
   */
  getUrl(key: string): string

  /**
   * 取得有時效的簽名 URL (可選實作)
   * @param key - 檔案路徑
   * @param expiresIn - 過期時間 (秒)
   */
  getSignedUrl?(key: string, expiresIn: number): Promise<string>
}

/**
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
