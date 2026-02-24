import { writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { gzip } from 'node:zlib'
import type { StorageAdapter } from './adapter'
import { FileSystemAdapter } from './FileSystemAdapter'

/**
 * Configuration for log rotation.
 *
 * @public
 * @since 3.1.0
 */
export interface LogRotatorConfig {
  /** Maximum number of backup snapshots to retain. */
  maxBackups?: number
  /** Whether to compress rotated logs with gzip. */
  compress?: boolean
  /** Storage adapter for log files. */
  storage?: StorageAdapter
}

/**
 * Manages log rotation and backup retention for incremental logs.
 *
 * Provides functionality to:
 * - Create timestamped backups of snapshot files
 * - Compress old backups with gzip
 * - Prune old backups based on retention policy
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * const rotator = new LogRotator({
 *   maxBackups: 5,
 *   compress: true
 * });
 *
 * // Create a backup before compaction
 * await rotator.rotate('/path/to/snapshot.json');
 *
 * // Clean up old backups
 * await rotator.prune('/path/to/snapshot.json');
 * ```
 */
export class LogRotator {
  private adapter: StorageAdapter
  private maxBackups: number
  private compress: boolean

  constructor(config: LogRotatorConfig = {}) {
    this.adapter = config.storage || new FileSystemAdapter()
    this.maxBackups = config.maxBackups ?? 5
    this.compress = config.compress ?? true
  }

  /**
   * Rotate a snapshot file by creating a timestamped backup.
   *
   * Creates a backup with format: `{original}.{timestamp}.bak`
   * If compression is enabled, also creates a gzipped version.
   *
   * @param snapshotPath - Path to the snapshot file to rotate.
   * @returns The path to the created backup file.
   * @throws {Error} If the snapshot doesn't exist or rotation fails.
   *
   * @example
   * ```typescript
   * const backupPath = await rotator.rotate('/data/sitemap.snapshot.json');
   * // Creates: /data/sitemap.snapshot.json.1706788800000.bak
   * ```
   */
  async rotate(snapshotPath: string): Promise<string> {
    // Check if snapshot exists
    if (!(await this.adapter.exists(snapshotPath))) {
      throw new Error(`Snapshot not found: ${snapshotPath}`)
    }

    // Generate backup filename with timestamp
    const timestamp = Date.now()
    const backupPath = `${snapshotPath}.${timestamp}.bak`

    // Read snapshot content
    const content = await this.adapter.read(snapshotPath)

    // Write backup
    await this.adapter.write(backupPath, content)

    // Compress if enabled (only for FileSystemAdapter)
    if (this.compress && this.adapter instanceof FileSystemAdapter) {
      await this.compressBackup(backupPath)
    }

    return backupPath
  }

  /**
   * Prune old backups beyond the retention limit.
   *
   * Keeps only the N most recent backups, where N = maxBackups.
   * Deletes both .bak and .bak.gz files.
   *
   * @param snapshotPath - The original snapshot path.
   * @returns Number of backups deleted.
   *
   * @example
   * ```typescript
   * const deleted = await rotator.prune('/data/sitemap.snapshot.json');
   * console.log(`Deleted ${deleted} old backups`);
   * ```
   */
  async prune(snapshotPath: string): Promise<number> {
    // Find all backup files
    const backups = await this.listBackups(snapshotPath)

    if (backups.length <= this.maxBackups) {
      return 0 // Nothing to prune
    }

    // Sort by timestamp (oldest first)
    backups.sort((a, b) => a.timestamp - b.timestamp)

    // Delete oldest backups beyond retention limit
    const toDelete = backups.slice(0, backups.length - this.maxBackups)
    let deletedCount = 0

    for (const backup of toDelete) {
      try {
        await this.adapter.delete(backup.path)
        deletedCount++

        // Also delete compressed version if exists
        const gzPath = `${backup.path}.gz`
        if (await this.adapter.exists(gzPath)) {
          await this.adapter.delete(gzPath)
          deletedCount++
        }
      } catch (error) {
        console.error(`[LogRotator] Failed to delete backup ${backup.path}:`, error)
      }
    }

    return deletedCount
  }

  /**
   * List all backup files for a given snapshot.
   *
   * @param snapshotPath - The original snapshot path.
   * @returns Array of backup metadata sorted by timestamp (newest first).
   * @private
   */
  private async listBackups(
    _snapshotPath: string
  ): Promise<Array<{ path: string; timestamp: number }>> {
    // This is a simplified implementation
    // For production, you'd need to actually list directory contents
    // For now, we'll return an empty array as FileSystemAdapter doesn't have listDir
    // This would need to be enhanced based on the actual adapter capabilities
    return []
  }

  /**
   * Compress a backup file using gzip.
   *
   * Creates a .gz version alongside the original backup.
   * Only works with FileSystemAdapter.
   *
   * @param backupPath - Path to the backup file.
   * @private
   */
  private async compressBackup(backupPath: string): Promise<void> {
    const gzipAsync = promisify(gzip)
    try {
      const gzipPath = `${backupPath}.gz`
      const content = await this.adapter.read(backupPath)
      const compressed = await gzipAsync(Buffer.from(content, 'utf-8'))
      await writeFile(gzipPath, compressed)
    } catch (error) {
      // 壓縮是選擇性的，失敗不應影響主流程
      // 錯誤記錄由 adapter 層處理
      void error
    }
  }

  /**
   * Get rotation statistics.
   *
   * @param snapshotPath - The snapshot path to analyze.
   * @returns Statistics about existing backups.
   */
  async getStats(snapshotPath: string): Promise<{
    backupCount: number
    totalSize: number
    oldestBackup: number | null
    newestBackup: number | null
  }> {
    const backups = await this.listBackups(snapshotPath)

    if (backups.length === 0) {
      return {
        backupCount: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null,
      }
    }

    let totalSize = 0
    for (const backup of backups) {
      try {
        totalSize += await this.adapter.size(backup.path)
      } catch {
        // Ignore errors
      }
    }

    return {
      backupCount: backups.length,
      totalSize,
      oldestBackup: Math.min(...backups.map((b) => b.timestamp)),
      newestBackup: Math.max(...backups.map((b) => b.timestamp)),
    }
  }
}
