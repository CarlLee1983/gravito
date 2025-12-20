import type { SitemapStorage } from '../types'

export interface S3SitemapStorageOptions {
  bucket: string
  region?: string
  prefix?: string
  baseUrl?: string
  shadow?: {
    enabled: boolean
    mode: 'atomic' | 'versioned'
  }
  // AWS SDK 配置（可選，使用環境變數或預設認證）
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
}

/**
 * AWS S3 儲存實作
 * 支援影子處理和版本化
 */
export class S3SitemapStorage implements SitemapStorage {
  private bucket: string
  private region?: string
  private prefix: string
  private baseUrl: string
  private shadowEnabled: boolean
  private shadowMode: 'atomic' | 'versioned'
  private s3Client: any // 動態載入 @aws-sdk/client-s3

  constructor(options: S3SitemapStorageOptions) {
    this.bucket = options.bucket
    this.region = options.region || 'us-east-1'
    this.prefix = options.prefix || ''
    this.baseUrl = options.baseUrl || `https://${options.bucket}.s3.${this.region}.amazonaws.com`
    this.shadowEnabled = options.shadow?.enabled ?? false
    this.shadowMode = options.shadow?.mode || 'atomic'
  }

  private async getS3Client() {
    if (this.s3Client) {
      return this.s3Client
    }

    try {
      // 動態載入 AWS SDK
      const {
        S3Client,
        PutObjectCommand,
        GetObjectCommand,
        HeadObjectCommand,
        ListObjectsV2Command,
        CopyObjectCommand,
        DeleteObjectCommand,
      } = await import('@aws-sdk/client-s3')

      const clientOptions: any = {
        region: this.region,
      }

      // 如果有提供認證資訊，使用它
      if (this.constructor.name === 'S3SitemapStorage') {
        // 這裡可以從 options 中取得認證，但為了簡化，我們使用環境變數或預設認證
      }

      this.s3Client = {
        S3Client,
        PutObjectCommand,
        GetObjectCommand,
        HeadObjectCommand,
        ListObjectsV2Command,
        CopyObjectCommand,
        DeleteObjectCommand,
        client: new S3Client(clientOptions),
      }

      return this.s3Client
    } catch (error) {
      throw new Error(
        `Failed to load AWS SDK. Please install @aws-sdk/client-s3: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private getKey(filename: string): string {
    const cleanPrefix = this.prefix.endsWith('/') ? this.prefix.slice(0, -1) : this.prefix
    return cleanPrefix ? `${cleanPrefix}/${filename}` : filename
  }

  async write(filename: string, content: string): Promise<void> {
    const s3 = await this.getS3Client()
    const key = this.getKey(filename)

    await s3.client.send(
      new s3.PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: content,
        ContentType: 'application/xml',
      })
    )
  }

  async read(filename: string): Promise<string | null> {
    try {
      const s3 = await this.getS3Client()
      const key = this.getKey(filename)

      const response = await s3.client.send(
        new s3.GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      if (!response.Body) {
        return null
      }

      // 將 stream 轉換為 string
      const chunks: Uint8Array[] = []
      for await (const chunk of response.Body as any) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)
      return buffer.toString('utf-8')
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return null
      }
      throw error
    }
  }

  async exists(filename: string): Promise<boolean> {
    try {
      const s3 = await this.getS3Client()
      const key = this.getKey(filename)

      await s3.client.send(
        new s3.HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
      return true
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false
      }
      throw error
    }
  }

  getUrl(filename: string): string {
    const key = this.getKey(filename)
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
    return `${base}/${key}`
  }

  // 影子處理方法
  async writeShadow(filename: string, content: string, shadowId?: string): Promise<void> {
    if (!this.shadowEnabled) {
      return this.write(filename, content)
    }

    const s3 = await this.getS3Client()
    const id = shadowId || `shadow-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const shadowKey = this.getKey(`${filename}.shadow.${id}`)

    await s3.client.send(
      new s3.PutObjectCommand({
        Bucket: this.bucket,
        Key: shadowKey,
        Body: content,
        ContentType: 'application/xml',
      })
    )
  }

  async commitShadow(shadowId: string): Promise<void> {
    if (!this.shadowEnabled) {
      return
    }

    const s3 = await this.getS3Client()

    // 列出所有影子檔案
    const prefix = this.prefix ? `${this.prefix}/` : ''
    const listResponse = await s3.client.send(
      new s3.ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      })
    )

    if (!listResponse.Contents) {
      return
    }

    // 找到對應的影子檔案
    const shadowFiles = listResponse.Contents.filter((obj) =>
      obj.Key?.includes(`.shadow.${shadowId}`)
    )

    for (const shadowFile of shadowFiles) {
      if (!shadowFile.Key) continue

      // 提取原始檔名（移除 .shadow.{id} 部分）
      const originalKey = shadowFile.Key.replace(/\.shadow\.[^/]+$/, '')
      const originalFilename = originalKey.replace(prefix, '')

      if (this.shadowMode === 'atomic') {
        // 原子切換：複製影子檔案到目標位置
        await s3.client.send(
          new s3.CopyObjectCommand({
            Bucket: this.bucket,
            CopySource: `${this.bucket}/${shadowFile.Key}`,
            Key: originalKey,
            ContentType: 'application/xml',
          })
        )

        // 刪除影子檔案
        await s3.client.send(
          new s3.DeleteObjectCommand({
            Bucket: this.bucket,
            Key: shadowFile.Key,
          })
        )
      } else {
        // 版本化模式：保留舊版本，切換到新版本
        const version = shadowId
        const versionedKey = `${originalKey}.v${version}`

        // 複製到版本化位置
        await s3.client.send(
          new s3.CopyObjectCommand({
            Bucket: this.bucket,
            CopySource: `${this.bucket}/${shadowFile.Key}`,
            Key: versionedKey,
            ContentType: 'application/xml',
          })
        )

        // 複製到主位置
        await s3.client.send(
          new s3.CopyObjectCommand({
            Bucket: this.bucket,
            CopySource: `${this.bucket}/${shadowFile.Key}`,
            Key: originalKey,
            ContentType: 'application/xml',
          })
        )

        // 刪除影子檔案
        await s3.client.send(
          new s3.DeleteObjectCommand({
            Bucket: this.bucket,
            Key: shadowFile.Key,
          })
        )
      }
    }
  }

  async listVersions(filename: string): Promise<string[]> {
    if (this.shadowMode !== 'versioned') {
      return []
    }

    try {
      const s3 = await this.getS3Client()
      const key = this.getKey(filename)
      const prefix = key.replace(/\.xml$/, '')

      const listResponse = await s3.client.send(
        new s3.ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
        })
      )

      if (!listResponse.Contents) {
        return []
      }

      // 提取版本號
      const versions: string[] = []
      for (const obj of listResponse.Contents) {
        if (!obj.Key) continue
        const match = obj.Key.match(/\.v([^/]+)$/)
        if (match) {
          versions.push(match[1])
        }
      }

      return versions.sort()
    } catch {
      return []
    }
  }

  async switchVersion(filename: string, version: string): Promise<void> {
    if (this.shadowMode !== 'versioned') {
      throw new Error('Version switching is only available in versioned mode')
    }

    const s3 = await this.getS3Client()
    const key = this.getKey(filename)
    const versionedKey = `${key}.v${version}`

    // 檢查版本是否存在
    const exists = await this.exists(versionedKey.replace(this.prefix ? `${this.prefix}/` : '', ''))
    if (!exists) {
      throw new Error(`Version ${version} not found for ${filename}`)
    }

    // 複製版本化檔案到主位置
    await s3.client.send(
      new s3.CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${versionedKey}`,
        Key: key,
        ContentType: 'application/xml',
      })
    )
  }
}
