import type { SitemapStorage } from '../types'
import { Mutex } from '../utils/Mutex'

/**
 * Options for configuring the `ShadowProcessor`.
 *
 * @public
 * @since 3.0.0
 */
export interface ShadowProcessorOptions {
  /** The storage backend used for writing files. */
  storage: SitemapStorage
  /**
   * Deployment mode:
   * - `atomic`: All files are swapped at once when committed.
   * - `versioned`: Each file is committed individually, potentially creating a new version.
   */
  mode: 'atomic' | 'versioned'
  /** Whether shadow processing is enabled. */
  enabled: boolean
}

/**
 * Represents a single file write operation within a shadow session.
 *
 * @public
 * @since 3.0.0
 */
export interface ShadowOperation {
  /** The destination filename. */
  filename: string
  /** The file content to be written. */
  content: string
  /** Optional unique identifier for the shadow session. */
  shadowId?: string
}

/**
 * ShadowProcessor manages the staging and atomic deployment of generated files.
 *
 * It allows files to be written to a "shadow" location before being "committed"
 * (swapped) to their final destination, ensuring zero-downtime and atomic updates
 * for sitemaps and indexes.
 *
 * @public
 * @since 3.0.0
 */
export class ShadowProcessor {
  private options: ShadowProcessorOptions
  private shadowId: string
  private operations: ShadowOperation[] = []
  private mutex = new Mutex()

  constructor(options: ShadowProcessorOptions) {
    this.options = options
    this.shadowId = `shadow-${Date.now()}-${crypto.randomUUID()}`
  }

  /**
   * Adds a single file write operation to the current shadow session.
   *
   * If shadow processing is disabled, the file is written directly to the
   * final destination in storage. Otherwise, it is written to the shadow staging area.
   *
   * @param operation - The shadow write operation details.
   */
  async addOperation(operation: ShadowOperation): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (!this.options.enabled) {
        // If shadow processing is disabled, write directly
        await this.options.storage.write(operation.filename, operation.content)
        return
      }

      this.operations.push({
        ...operation,
        shadowId: operation.shadowId || this.shadowId,
      })

      // Write to shadow location
      if (this.options.storage.writeShadow) {
        await this.options.storage.writeShadow(operation.filename, operation.content, this.shadowId)
      } else {
        // If storage does not support shadow processing, write directly
        await this.options.storage.write(operation.filename, operation.content)
      }
    })
  }

  /**
   * Commits all staged shadow operations to the final production location.
   *
   * Depending on the `mode`, this will either perform an atomic swap of all files
   * or commit each file individually (potentially creating new versions).
   */
  async commit(): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (!this.options.enabled) {
        return
      }

      if (this.options.mode === 'atomic') {
        // Atomic switch mode: commit all shadow files at once
        if (this.options.storage.commitShadow) {
          await this.options.storage.commitShadow(this.shadowId)
        }
      } else {
        // Versioned mode: create version for each file
        for (const operation of this.operations) {
          if (this.options.storage.commitShadow) {
            await this.options.storage.commitShadow(operation.shadowId || this.shadowId)
          }
        }
      }

      // Clear operation list
      this.operations = []
    })
  }

  /**
   * Cancels all staged shadow operations without committing them.
   */
  async rollback(): Promise<void> {
    if (!this.options.enabled) {
      return
    }

    // Clear operation list (actual file cleanup is handled by storage layer)
    this.operations = []
  }

  /**
   * Returns the unique identifier for the current shadow session.
   */
  getShadowId(): string {
    return this.shadowId
  }

  /**
   * Returns an array of all staged shadow operations.
   */
  getOperations(): ShadowOperation[] {
    return [...this.operations]
  }
}
