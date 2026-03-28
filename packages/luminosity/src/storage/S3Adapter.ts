import { LuminosityError } from '../errors/LuminosityError'
import { LuminosityErrorCodes } from '../errors/codes'
import type { StorageAdapter } from './adapter'

/**
 * Minimal interface for an S3-compatible client.
 *
 * @public
 * @since 3.0.0
 */
export interface S3ClientLike {
  /** Send a command to the S3 service. */
  send(command: any): Promise<any>
}

/**
 * Configuration for the `S3Adapter`.
 *
 * @public
 * @since 3.0.0
 */
export interface S3AdapterConfig {
  /** The S3 bucket name. */
  bucket: string
  /** Optional AWS region. */
  region?: string
  /** The S3 client instance. */
  client: S3ClientLike
  /** Constructors for the required AWS SDK commands. */
  commands: {
    PutObjectCommand: new (args: any) => any
    GetObjectCommand: new (args: any) => any
    HeadObjectCommand: new (args: any) => any
    DeleteObjectCommand: new (args: any) => any
  }
}

/**
 * S3Adapter implements the `StorageAdapter` interface for AWS S3.
 *
 * Note: Since S3 does not support atomic appends, this adapter simulates
 * 'append' by reading the entire object, concatenating the new content,
 * and re-uploading the whole file. This is inefficient for large files
 * or high write volumes.
 *
 * @public
 * @since 3.0.0
 */
export class S3Adapter implements StorageAdapter {
  constructor(private config: S3AdapterConfig) {}

  /**
   * Appends content to a file in S3.
   *
   * @param path - The S3 object key.
   * @param content - The content to append.
   */
  async append(path: string, content: string): Promise<void> {
    const current = await this.read(path).catch(() => '')
    await this.write(path, current + content)
  }

  /**
   * Writes content to an S3 object.
   *
   * @param path - The S3 object key.
   * @param content - The content to write.
   */
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

  /**
   * Reads content from an S3 object.
   *
   * @param path - The S3 object key.
   * @returns The content as a string.
   * @throws {Error} If the object cannot be read.
   */
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
      throw new LuminosityError(503, LuminosityErrorCodes.STORAGE_READ_FAILED, {
        message: `Failed to read ${path}: ${e}`,
        retryable: true,
      })
    }
  }

  /**
   * Checks if an S3 object exists.
   *
   * @param path - The S3 object key.
   * @returns True if the object exists.
   */
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

  /**
   * Deletes an S3 object.
   *
   * @param path - The S3 object key.
   */
  async delete(path: string): Promise<void> {
    const { DeleteObjectCommand } = this.config.commands
    await this.config.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: path,
      })
    )
  }

  /**
   * Renames (moves) an S3 object.
   *
   * Implemented as a copy operation followed by a delete operation.
   *
   * @param oldPath - The source key.
   * @param newPath - The destination key.
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    // S3 Rename = Copy + Delete
    const content = await this.read(oldPath)
    await this.write(newPath, content)
    await this.delete(oldPath)
  }

  /**
   * Gets the size of an S3 object.
   *
   * @param path - The S3 object key.
   * @returns The size in bytes.
   */
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

  /**
   * No-op for S3 as directories are virtual.
   *
   * @param _path - The path.
   */
  async ensureDir(_path: string): Promise<void> {
    // S3 is flat, no directories needed
  }
}
