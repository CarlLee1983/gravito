import type { SitemapStorage } from '../types'

export interface GCPSitemapStorageOptions {
  bucket: string
  prefix?: string
  baseUrl?: string
  shadow?: {
    enabled: boolean
    mode: 'atomic' | 'versioned'
  }
  // GCP 認證配置（可選，使用環境變數或預設認證）
  keyFilename?: string
  projectId?: string
}

/**
 * Google Cloud Storage 儲存實作
 * 支援影子處理和版本化
 */
export class GCPSitemapStorage implements SitemapStorage {
  private bucket: string
  private prefix: string
  private baseUrl: string
  private shadowEnabled: boolean
  private shadowMode: 'atomic' | 'versioned'
  private storageClient: any // 動態載入 @google-cloud/storage
  private bucketInstance: any

  constructor(options: GCPSitemapStorageOptions) {
    this.bucket = options.bucket
    this.prefix = options.prefix || ''
    this.baseUrl = options.baseUrl || `https://storage.googleapis.com/${options.bucket}`
    this.shadowEnabled = options.shadow?.enabled ?? false
    this.shadowMode = options.shadow?.mode || 'atomic'
  }

  private async getStorageClient() {
    if (this.storageClient) {
      return { client: this.storageClient, bucket: this.bucketInstance }
    }

    try {
      // 動態載入 Google Cloud Storage
      const { Storage } = await import('@google-cloud/storage')

      const clientOptions: any = {}
      if (this.constructor.name === 'GCPSitemapStorage') {
        // 這裡可以從 options 中取得認證，但為了簡化，我們使用環境變數或預設認證
      }

      this.storageClient = new Storage(clientOptions)
      this.bucketInstance = this.storageClient.bucket(this.bucket)

      return { client: this.storageClient, bucket: this.bucketInstance }
    } catch (error) {
      throw new Error(
        `Failed to load Google Cloud Storage. Please install @google-cloud/storage: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private getKey(filename: string): string {
    const cleanPrefix = this.prefix.endsWith('/') ? this.prefix.slice(0, -1) : this.prefix
    return cleanPrefix ? `${cleanPrefix}/${filename}` : filename
  }

  async write(filename: string, content: string): Promise<void> {
    const { bucket } = await this.getStorageClient()
    const key = this.getKey(filename)
    const file = bucket.file(key)

    await file.save(content, {
      contentType: 'application/xml',
      metadata: {
        cacheControl: 'public, max-age=3600',
      },
    })
  }

  async read(filename: string): Promise<string | null> {
    try {
      const { bucket } = await this.getStorageClient()
      const key = this.getKey(filename)
      const file = bucket.file(key)

      const [exists] = await file.exists()
      if (!exists) {
        return null
      }

      const [content] = await file.download()
      return content.toString('utf-8')
    } catch (error: any) {
      if (error.code === 404) {
        return null
      }
      throw error
    }
  }

  async exists(filename: string): Promise<boolean> {
    try {
      const { bucket } = await this.getStorageClient()
      const key = this.getKey(filename)
      const file = bucket.file(key)

      const [exists] = await file.exists()
      return exists
    } catch {
      return false
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

    const { bucket } = await this.getStorageClient()
    const id = shadowId || `shadow-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const shadowKey = this.getKey(`${filename}.shadow.${id}`)
    const file = bucket.file(shadowKey)

    await file.save(content, {
      contentType: 'application/xml',
      metadata: {
        cacheControl: 'public, max-age=3600',
      },
    })
  }

  async commitShadow(shadowId: string): Promise<void> {
    if (!this.shadowEnabled) {
      return
    }

    const { bucket } = await this.getStorageClient()
    const prefix = this.prefix ? `${this.prefix}/` : ''

    // 列出所有檔案
    const [files] = await bucket.getFiles({ prefix })

    // 找到對應的影子檔案
    const shadowFiles = files.filter((file: any) => {
      const name = file.name
      return name.includes(`.shadow.${shadowId}`)
    })

    for (const shadowFile of shadowFiles) {
      // 提取原始檔名（移除 .shadow.{id} 部分）
      const originalKey = shadowFile.name.replace(/\.shadow\.[^/]+$/, '')
      const _originalFilename = originalKey.replace(prefix, '')

      if (this.shadowMode === 'atomic') {
        // 原子切換：複製影子檔案到目標位置
        await shadowFile.copy(bucket.file(originalKey))

        // 刪除影子檔案
        await shadowFile.delete()
      } else {
        // 版本化模式：保留舊版本，切換到新版本
        const version = shadowId
        const versionedKey = `${originalKey}.v${version}`

        // 複製到版本化位置
        await shadowFile.copy(bucket.file(versionedKey))

        // 複製到主位置
        await shadowFile.copy(bucket.file(originalKey))

        // 刪除影子檔案
        await shadowFile.delete()
      }
    }
  }

  async listVersions(filename: string): Promise<string[]> {
    if (this.shadowMode !== 'versioned') {
      return []
    }

    try {
      const { bucket } = await this.getStorageClient()
      const key = this.getKey(filename)
      const prefix = key.replace(/\.xml$/, '')

      const [files] = await bucket.getFiles({ prefix })

      // 提取版本號
      const versions: string[] = []
      for (const file of files) {
        const match = file.name.match(/\.v([^/]+)$/)
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

    const { bucket } = await this.getStorageClient()
    const key = this.getKey(filename)
    const versionedKey = `${key}.v${version}`
    const versionedFile = bucket.file(versionedKey)

    // 檢查版本是否存在
    const [exists] = await versionedFile.exists()
    if (!exists) {
      throw new Error(`Version ${version} not found for ${filename}`)
    }

    // 複製版本化檔案到主位置
    await versionedFile.copy(bucket.file(key))
  }
}
