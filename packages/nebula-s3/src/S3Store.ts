import type {
  ListOptions,
  ListResult,
  PutOptions,
  StorageItem,
  StorageMetadata,
  StorageStore,
} from '@gravito/nebula'
import { NebulaS3Error } from './errors/NebulaS3Error'
import { NebulaS3ErrorCodes } from './errors/codes'

/**
 * S3StoreOptions 定義 S3 儲存驅動的配置選項
 *
 * @public
 */
export interface S3StoreOptions {
  /** S3 Bucket 名稱 */
  bucket: string
  /** AWS Region (預設: 'auto') */
  region?: string
  /** 自定義 Endpoint (用於 MinIO, Cloudflare R2 等) */
  endpoint?: string
  /** AWS 憑證 */
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
  /** 公開 URL 前綴 (用於 CDN) */
  publicUrl?: string
  /** 是否強制使用 path-style URL (MinIO 需要) */
  forcePathStyle?: boolean
}

/**
 * S3Store 實作 S3 相容儲存的驅動
 *
 * 支援 AWS S3、Cloudflare R2、MinIO 等 S3 相容服務
 *
 * @example
 * ```typescript
 * const store = new S3Store({
 *   bucket: 'my-bucket',
 *   region: 'us-east-1',
 *   credentials: {
 *     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *   },
 * })
 * ```
 *
 * @public
 */
export class S3Store implements StorageStore {
  // biome-ignore lint/suspicious/noExplicitAny: Bun S3Client type not exposed in types
  private s3: any

  constructor(private options: S3StoreOptions) {
    const config: Record<string, any> = {
      accessKeyId: options.credentials?.accessKeyId,
      secretAccessKey: options.credentials?.secretAccessKey,
      region: options.region ?? 'auto',
      bucket: options.bucket,
    }

    if (options.endpoint) {
      config.endpoint = options.endpoint
    }

    if (options.forcePathStyle !== undefined) {
      config.forcePathStyle = options.forcePathStyle
    }

    // biome-ignore lint/suspicious/noExplicitAny: Bun S3Client type
    this.s3 = new (Bun as any).S3Client(config)
  }

  /**
   * 上傳檔案到 S3
   *
   * @param key - S3 object key
   * @param data - 檔案內容
   * @param options - 上傳選項 (metadata, content-type, etc.)
   */
  async put(key: string, data: Blob | Buffer | string, options?: PutOptions): Promise<void> {
    let body: Blob | Buffer | string

    if (data instanceof Blob) {
      body = data
    } else if (typeof data === 'string') {
      body = new Blob([data])
    } else {
      body = new Blob([data])
    }

    // Sanitize metadata to ensure only ASCII characters (S3 requirement)
    const headers: Record<string, string> = {
      'Content-Type': options?.contentType ?? 'application/octet-stream',
    }

    if (options?.cacheControl) {
      headers['Cache-Control'] = options.cacheControl
    }

    if (options?.contentDisposition) {
      headers['Content-Disposition'] = options.contentDisposition
    }

    if (options?.metadata) {
      Object.entries(options.metadata).forEach(([k, v]) => {
        // biome-ignore lint/suspicious/noControlCharactersInRegex: Need to detect non-ASCII for S3 compatibility
        const sanitized = v.replace(/[^\x00-\x7F]/g, (char: string) => encodeURIComponent(char))
        headers[`x-amz-meta-${k}`] = sanitized
      })
    }

    // biome-ignore lint/suspicious/noExplicitAny: Bun S3 API
    await (this.s3 as any).file(key).write(body, { headers })
  }

  /**
   * 從 S3 下載檔案
   *
   * @param key - S3 object key
   * @returns 檔案內容 Blob，或 null 如果不存在
   */
  async get(key: string): Promise<Blob | null> {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: Bun S3 API
      const exists = await (this.s3 as any).file(key).exists()
      if (!exists) {
        return null
      }

      const buffer = await (this.s3 as any).file(key).arrayBuffer()
      return new Blob([buffer])
    } catch (error: any) {
      if (error?.name === 'NoSuchKey' || error?.code === 'NoSuchKey') {
        return null
      }
      throw error
    }
  }

  /**
   * 刪除 S3 物件
   *
   * @param key - S3 object key
   * @returns true 如果刪除成功，false 如果檔案不存在
   */
  async delete(key: string): Promise<boolean> {
    // biome-ignore lint/suspicious/noExplicitAny: Bun S3 API
    const exists = await (this.s3 as any).file(key).exists()
    if (!exists) {
      return false
    }

    await (this.s3 as any).file(key).delete()
    return true
  }

  /**
   * 檢查 S3 物件是否存在
   *
   * @param key - S3 object key
   * @returns true 如果存在，false 否則
   */
  async exists(key: string): Promise<boolean> {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: Bun S3 API
      return await (this.s3 as any).file(key).exists()
    } catch (error: any) {
      if (error?.name === 'NotFound' || error?.code === 'NoSuchKey') {
        return false
      }
      throw error
    }
  }

  /**
   * 複製 S3 物件
   *
   * @param from - 來源 key
   * @param to - 目標 key
   */
  async copy(from: string, to: string): Promise<void> {
    const data = await this.get(from)
    if (!data) {
      throw new NebulaS3Error(404, NebulaS3ErrorCodes.COPY_SOURCE_NOT_FOUND, {
        message: `[S3Store] Source file not found: ${from}`,
      })
    }

    await this.put(to, data)
  }

  /**
   * 移動 S3 物件
   *
   * @param from - 來源 key
   * @param to - 目標 key
   */
  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to)
    await this.delete(from)
  }

  /**
   * 取得檔案 metadata
   *
   * @param key - S3 object key
   * @returns Metadata 或 null 如果不存在
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: Bun S3 API
      const stat = await (this.s3 as any).file(key).stat()
      if (!stat) {
        return null
      }

      return {
        key,
        size: stat.size ?? 0,
        mimeType: stat.type,
        lastModified: new Date(stat.lastModified ?? 0),
        etag: stat.etag,
        // Note: Bun S3 API doesn't expose custom metadata from stat()
        customMetadata: undefined,
      }
    } catch (error: any) {
      if (error?.name === 'NotFound' || error?.code === 'NoSuchKey') {
        return null
      }
      throw error
    }
  }

  /**
   * 更新自定義 metadata
   *
   * 注意：S3 不支援直接更新 metadata，需要複製物件
   *
   * @param key - S3 object key
   * @param metadata - 要設定的 metadata
   */
  async setMetadata(key: string, metadata: Record<string, string>): Promise<void> {
    // S3 doesn't support direct metadata update
    // We need to copy the object with new metadata
    const existingMeta = await this.getMetadata(key)
    if (!existingMeta) {
      throw new NebulaS3Error(404, NebulaS3ErrorCodes.FILE_NOT_FOUND, {
        message: `[S3Store] File not found: ${key}`,
      })
    }

    // Get the object content
    const data = await this.get(key)
    if (!data) {
      throw new NebulaS3Error(404, NebulaS3ErrorCodes.FILE_NOT_FOUND, {
        message: `[S3Store] File not found: ${key}`,
      })
    }

    // Merge metadata
    const mergedMetadata = {
      ...existingMeta.customMetadata,
      ...metadata,
    }

    // Re-upload with new metadata
    await this.put(key, data, {
      contentType: existingMeta.mimeType,
      metadata: mergedMetadata,
    })
  }

  /**
   * 產生公開 URL
   *
   * @param key - S3 object key
   * @returns 公開 URL
   */
  getUrl(key: string): string {
    if (this.options.publicUrl) {
      return `${this.options.publicUrl}/${key}`
    }

    // Default S3 URL format
    const region = this.options.region ?? 'us-east-1'
    return `https://${this.options.bucket}.s3.${region}.amazonaws.com/${key}`
  }

  /**
   * 產生簽名 URL (Presigned URL)
   *
   * @param key - S3 object key
   * @param expiresIn - 過期時間（秒）
   * @returns 簽名 URL
   */
  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    // biome-ignore lint/suspicious/noExplicitAny: Bun S3 API
    const url = (this.s3 as any).file(key).presign({ expiresIn })
    return Promise.resolve(url)
  }

  /**
   * 串流寫入檔案
   *
   * @param key - S3 object key
   * @param stream - 資料串流
   */
  async putStream(key: string, stream: ReadableStream<Uint8Array>): Promise<void> {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: Bun S3 API
      await (this.s3 as any).file(key).write(stream)
    } catch (error) {
      throw new NebulaS3Error(503, NebulaS3ErrorCodes.WRITE_STREAM_FAILED, {
        message: `[S3Store] Failed to write stream: ${error}`,
        cause: error instanceof Error ? error : undefined,
        retryable: true,
      })
    }
  }

  /**
   * 串流讀取檔案
   *
   * @param key - S3 object key
   * @returns 資料串流，或 null 如果不存在
   */
  async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: Bun S3 API
      const exists = await (this.s3 as any).file(key).exists()
      if (!exists) {
        return null
      }

      const stream = await (this.s3 as any).file(key).stream()
      return stream as ReadableStream<Uint8Array>
    } catch (error: any) {
      if (error?.name === 'NoSuchKey' || error?.code === 'NoSuchKey') {
        return null
      }
      throw error
    }
  }

  /**
   * 分頁列舉物件
   *
   * @param prefix - 前綴過濾
   * @param options - 列舉選項
   * @returns 分頁結果
   */
  async listPaginated(prefix = '', options?: ListOptions): Promise<ListResult> {
    const maxResults = options?.maxResults ?? 1000

    try {
      // biome-ignore lint/suspicious/noExplicitAny: Bun S3 API
      const response = await (this.s3 as any).list({
        prefix,
        maxKeys: maxResults,
        cursor: options?.cursor,
      })

      const items: StorageItem[] = (response.files ?? []).map((obj: any) => ({
        key: obj.key ?? obj.name,
        isDirectory: obj.key?.endsWith('/') === true || obj.name?.endsWith('/') === true,
        size: obj.size,
        lastModified: obj.lastModified,
      }))

      return {
        items,
        nextCursor: response.nextCursor ?? null,
        hasMore: !!response.nextCursor,
        count: items.length,
      }
    } catch (error) {
      throw new NebulaS3Error(503, NebulaS3ErrorCodes.LIST_FAILED, {
        message: `[S3Store] Failed to list objects: ${error}`,
        cause: error instanceof Error ? error : undefined,
        retryable: true,
      })
    }
  }
}
