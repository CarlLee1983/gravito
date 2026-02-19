import {
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type {
  ListOptions,
  ListResult,
  PutOptions,
  StorageItem,
  StorageMetadata,
  StorageStore,
} from '@gravito/nebula'

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
  private client: S3Client

  constructor(private options: S3StoreOptions) {
    const config: S3ClientConfig = {
      region: options.region ?? 'auto',
      forcePathStyle: options.forcePathStyle ?? false,
    }

    if (options.endpoint) {
      config.endpoint = options.endpoint
    }

    if (options.credentials) {
      config.credentials = options.credentials
    }

    this.client = new S3Client(config)
  }

  /**
   * 上傳檔案到 S3
   *
   * @param key - S3 object key
   * @param data - 檔案內容
   * @param options - 上傳選項 (metadata, content-type, etc.)
   */
  async put(key: string, data: Blob | Buffer | string, options?: PutOptions): Promise<void> {
    let body: Buffer | Uint8Array

    if (data instanceof Blob) {
      body = Buffer.from(await data.arrayBuffer())
    } else if (typeof data === 'string') {
      body = Buffer.from(data)
    } else {
      body = data
    }

    // Sanitize metadata to ensure only ASCII characters (S3 requirement)
    const sanitizedMetadata = options?.metadata
      ? Object.fromEntries(
          Object.entries(options.metadata).map(([k, v]: [string, string]) => [
            k,
            // Replace non-ASCII characters with URL encoding
            // biome-ignore lint/suspicious/noControlCharactersInRegex: Need to detect non-ASCII for S3 compatibility
            v.replace(/[^\x00-\x7F]/g, (char: string) => encodeURIComponent(char)),
          ])
        )
      : undefined

    const command = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
      Body: body,
      ContentType: options?.contentType,
      Metadata: sanitizedMetadata,
      CacheControl: options?.cacheControl,
      ContentDisposition: options?.contentDisposition,
    })

    await this.client.send(command)
  }

  /**
   * 從 S3 下載檔案
   *
   * @param key - S3 object key
   * @returns 檔案內容 Blob，或 null 如果不存在
   */
  async get(key: string): Promise<Blob | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      })

      const response: GetObjectCommandOutput = await this.client.send(command)

      if (!response.Body) {
        return null
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = []
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk)
      }

      const buffer = Buffer.concat(chunks)
      return new Blob([buffer], { type: response.ContentType })
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
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
    // S3 Delete is idempotent - it always succeeds even if key doesn't exist
    // We need to check existence first to match StorageStore semantics
    const exists = await this.exists(key)
    if (!exists) {
      return false
    }

    const command = new DeleteObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
    })

    await this.client.send(command)
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
      const command = new HeadObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      })

      await this.client.send(command)
      return true
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
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
      throw new Error(`[S3Store] Source file not found: ${from}`)
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
      const command = new HeadObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      })

      const response: HeadObjectCommandOutput = await this.client.send(command)

      // Decode URL-encoded metadata values
      const decodedMetadata = response.Metadata
        ? Object.fromEntries(
            Object.entries(response.Metadata).map(([k, v]) => {
              try {
                return [k, decodeURIComponent(v as string)]
              } catch {
                // If decode fails, return original value
                return [k, v as string]
              }
            })
          )
        : undefined

      return {
        key,
        size: response.ContentLength ?? 0,
        mimeType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag?.replace(/"/g, ''),
        customMetadata: decodedMetadata as Record<string, string> | undefined,
      }
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
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
      throw new Error(`[S3Store] File not found: ${key}`)
    }

    // Get the object content
    const data = await this.get(key)
    if (!data) {
      throw new Error(`[S3Store] File not found: ${key}`)
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
    const command = new GetObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
    })

    // Type assertion needed due to AWS SDK type mismatch
    // biome-ignore lint/suspicious/noExplicitAny: AWS SDK type compatibility
    return getSignedUrl(this.client as any, command, { expiresIn })
  }

  /**
   * 串流寫入檔案
   *
   * @param key - S3 object key
   * @param stream - 資料串流
   */
  async putStream(key: string, stream: ReadableStream<Uint8Array>): Promise<void> {
    // Read entire stream into buffer
    // Note: For very large files, consider using multipart upload
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        chunks.push(value)
      }

      const buffer = Buffer.concat(chunks)
      await this.put(key, buffer)
    } catch (error) {
      reader.releaseLock()
      throw new Error(`[S3Store] Failed to write stream: ${error}`)
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
      const command = new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      })

      const response: GetObjectCommandOutput = await this.client.send(command)

      if (!response.Body) {
        return null
      }

      // Convert AWS SDK stream to Web ReadableStream
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
              controller.enqueue(chunk)
            }
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
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

    const command = new ListObjectsV2Command({
      Bucket: this.options.bucket,
      Prefix: prefix,
      MaxKeys: maxResults,
      ContinuationToken: options?.cursor,
    })

    const response: ListObjectsV2CommandOutput = await this.client.send(command)

    const items: StorageItem[] = (response.Contents ?? []).map((obj) => ({
      key: obj.Key!,
      isDirectory: obj.Key?.endsWith('/') === true,
      size: obj.Size,
      lastModified: obj.LastModified,
    }))

    return {
      items,
      nextCursor: response.NextContinuationToken ?? null,
      hasMore: response.IsTruncated ?? false,
      count: items.length,
    }
  }
}
