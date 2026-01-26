import type { SitemapStorage } from '../types'

/**
 * Options for configuring the `GCPSitemapStorage`.
 *
 * @public
 * @since 3.0.0
 */
export interface GCPSitemapStorageOptions {
  /** The Google Cloud Storage bucket name. */
  bucket: string
  /** Optional prefix (folder path) within the bucket. */
  prefix?: string
  /** Optional base URL for resolving sitemap locations. Defaults to the standard GCS public URL. */
  baseUrl?: string
  /** Configuration for staging files before atomic deployment. */
  shadow?: {
    /** Whether shadow processing is enabled. */
    enabled: boolean
    /** Deployment mode: 'atomic' or 'versioned'. */
    mode: 'atomic' | 'versioned'
  }
  /** Path to the service account key file. */
  keyFilename?: string
  /** The Google Cloud Project ID. */
  projectId?: string
}

/**
 * GCPSitemapStorage persists sitemap files to Google Cloud Storage.
 *
 * It supports atomic deployments via shadow processing and file versioning,
 * allowing for reliable updates in high-traffic cloud environments.
 *
 * @example
 * ```typescript
 * const storage = new GCPSitemapStorage({
 *   bucket: 'my-sitemaps',
 *   prefix: 'prod/',
 *   shadow: { enabled: true, mode: 'atomic' }
 * });
 * ```
 *
 * @public
 * @since 3.0.0
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

  /**
   * Writes sitemap content to a Google Cloud Storage object.
   *
   * @param filename - The name of the file to write.
   * @param content - The XML or JSON content.
   */
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

  /**
   * Reads sitemap content from a Google Cloud Storage object.
   *
   * @param filename - The name of the file to read.
   * @returns A promise resolving to the file content as a string, or null if not found.
   */
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

  /**
   * Returns a readable stream for a Google Cloud Storage object.
   *
   * @param filename - The name of the file to stream.
   * @returns A promise resolving to an async iterable of file chunks, or null if not found.
   */
  async readStream(filename: string): Promise<AsyncIterable<string> | null> {
    try {
      const { bucket } = await this.getStorageClient()
      const key = this.getKey(filename)
      const file = bucket.file(key)

      const [exists] = await file.exists()
      if (!exists) {
        return null
      }

      const stream = file.createReadStream()
      return (async function* () {
        const decoder = new TextDecoder()
        for await (const chunk of stream) {
          yield decoder.decode(chunk, { stream: true })
        }
        yield decoder.decode()
      })()
    } catch (error: any) {
      if (error.code === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Checks if a Google Cloud Storage object exists.
   *
   * @param filename - The name of the file to check.
   * @returns A promise resolving to true if the file exists, false otherwise.
   */
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

  /**
   * Returns the full public URL for a Google Cloud Storage object.
   *
   * @param filename - The name of the sitemap file.
   * @returns The public URL as a string.
   */
  getUrl(filename: string): string {
    const key = this.getKey(filename)
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
    return `${base}/${key}`
  }

  /**
   * Writes content to a shadow (staged) location in Google Cloud Storage.
   *
   * @param filename - The name of the file to write.
   * @param content - The XML or JSON content.
   * @param shadowId - Optional unique session identifier.
   */
  async writeShadow(filename: string, content: string, shadowId?: string): Promise<void> {
    if (!this.shadowEnabled) {
      return this.write(filename, content)
    }

    const { bucket } = await this.getStorageClient()
    const id = shadowId || `shadow-${Date.now()}-${crypto.randomUUID()}`
    const shadowKey = this.getKey(`${filename}.shadow.${id}`)
    const file = bucket.file(shadowKey)

    await file.save(content, {
      contentType: 'application/xml',
      metadata: {
        cacheControl: 'public, max-age=3600',
      },
    })
  }

  /**
   * Commits all staged shadow objects in a session to production in Google Cloud Storage.
   *
   * @param shadowId - The identifier of the session to commit.
   */
  async commitShadow(shadowId: string): Promise<void> {
    if (!this.shadowEnabled) {
      return
    }

    const { bucket } = await this.getStorageClient()
    const prefix = this.prefix ? `${this.prefix}/` : ''

    // List all files
    const [files] = await bucket.getFiles({ prefix })

    // Find matching shadow files
    const shadowFiles = files.filter((file: any) => {
      const name = file.name
      return name.includes(`.shadow.${shadowId}`)
    })

    for (const shadowFile of shadowFiles) {
      // Extract original key (remove .shadow.{id} part)
      const originalKey = shadowFile.name.replace(/\.shadow\.[^/]+$/, '')
      const _originalFilename = originalKey.replace(prefix, '')

      if (this.shadowMode === 'atomic') {
        // Atomic switch: copy shadow file to target
        await shadowFile.copy(bucket.file(originalKey))

        await shadowFile.delete()
      } else {
        // Versioned mode: keep old versions, switch to new
        const version = shadowId
        const versionedKey = `${originalKey}.v${version}`

        // Copy to versioned location
        await shadowFile.copy(bucket.file(versionedKey))

        // Copy to main location
        await shadowFile.copy(bucket.file(originalKey))

        await shadowFile.delete()
      }
    }
  }

  /**
   * Lists all archived versions of a specific sitemap in Google Cloud Storage.
   *
   * @param filename - The sitemap filename.
   * @returns A promise resolving to an array of version identifiers.
   */
  async listVersions(filename: string): Promise<string[]> {
    if (this.shadowMode !== 'versioned') {
      return []
    }

    try {
      const { bucket } = await this.getStorageClient()
      const key = this.getKey(filename)
      const prefix = key.replace(/\.xml$/, '')

      const [files] = await bucket.getFiles({ prefix })

      // Extract version IDs
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

  /**
   * Reverts a sitemap to a previously archived version in Google Cloud Storage.
   *
   * @param filename - The sitemap filename.
   * @param version - The version identifier to switch to.
   */
  async switchVersion(filename: string, version: string): Promise<void> {
    if (this.shadowMode !== 'versioned') {
      throw new Error('Version switching is only available in versioned mode')
    }

    const { bucket } = await this.getStorageClient()
    const key = this.getKey(filename)
    const versionedKey = `${key}.v${version}`
    const versionedFile = bucket.file(versionedKey)

    // Check if version exists
    const [exists] = await versionedFile.exists()
    if (!exists) {
      throw new Error(`Version ${version} not found for ${filename}`)
    }

    // Copy versioned file to main location
    await versionedFile.copy(bucket.file(key))
  }
}
