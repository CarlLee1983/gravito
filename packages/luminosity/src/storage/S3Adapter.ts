import type { StorageAdapter } from './adapter'

export interface S3ClientLike {
  send(command: any): Promise<any>
}

export interface S3AdapterConfig {
  bucket: string
  region?: string
  client: S3ClientLike
  // Minimal set of AWS SDK commands needed
  commands: {
    PutObjectCommand: new (args: any) => any
    GetObjectCommand: new (args: any) => any
    HeadObjectCommand: new (args: any) => any
    DeleteObjectCommand: new (
      args: any
    ) => any
    // For append, we might need to read -> concat -> write, or use multipart upload (complex)
    // S3 doesn't support native append.
    // Simulating append by reading + writing is slow for WAL.
    // Alternative: Each log entry is a separate object? No, too many objects.
    // Alternative: Use Kinesis/Firehose? Too complex.
    // Alternative: Append to a buffer in memory and flush periodically?
  }
}

/**
 * S3 Storage Adapter
 *
 * Note: S3 does not support atomic append.
 * This adapter implements 'append' by reading the full object and re-uploading it.
 * THIS IS NOT RECOMMENDED FOR HIGH WRITE VOLUME.
 * For high volume, use a database or a service that supports append (like Redis streams).
 */
export class S3Adapter implements StorageAdapter {
  constructor(private config: S3AdapterConfig) {}

  async append(path: string, content: string): Promise<void> {
    const current = await this.read(path).catch(() => '')
    await this.write(path, current + content)
  }

  async write(path: string, content: string): Promise<void> {
    const { PutObjectCommand } = this.config.commands
    await this.config.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: path,
        Body: content,
        ContentType: 'application/json',
      })
    )
  }

  async read(path: string): Promise<string> {
    const { GetObjectCommand } = this.config.commands
    try {
      const response = await this.config.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: path,
        })
      )

      // Assuming response.Body is a string or stream convertible to string
      // In Node environment with AWS SDK v3:
      return await response.Body.transformToString()
    } catch (e) {
      throw new Error(`Failed to read ${path}: ${e}`)
    }
  }

  async exists(path: string): Promise<boolean> {
    const { HeadObjectCommand } = this.config.commands
    try {
      await this.config.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: path,
        })
      )
      return true
    } catch {
      return false
    }
  }

  async delete(path: string): Promise<void> {
    const { DeleteObjectCommand } = this.config.commands
    await this.config.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: path,
      })
    )
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    // S3 Rename = Copy + Delete
    const content = await this.read(oldPath)
    await this.write(newPath, content)
    await this.delete(oldPath)
  }

  async size(path: string): Promise<number> {
    const { HeadObjectCommand } = this.config.commands
    try {
      const response = await this.config.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: path,
        })
      )
      return response.ContentLength || 0
    } catch {
      return 0
    }
  }

  async ensureDir(path: string): Promise<void> {
    // S3 is flat, no directories needed
  }
}
