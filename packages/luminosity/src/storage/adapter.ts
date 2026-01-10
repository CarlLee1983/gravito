export interface StorageAdapter {
  /**
   * Append content to a file.
   * Used for WAL (Write-Ahead Logging).
   */
  append(path: string, content: string): Promise<void>

  /**
   * Write content to a file (overwrite).
   * Used for Snapshots.
   */
  write(path: string, content: string): Promise<void>

  /**
   * Read file content as string.
   */
  read(path: string): Promise<string>

  /**
   * Check if a file exists.
   */
  exists(path: string): Promise<boolean>

  /**
   * Delete a file.
   */
  delete(path: string): Promise<void>

  /**
   * Rename a file (atomically if possible).
   */
  rename(oldPath: string, newPath: string): Promise<void>

  /**
   * Get file size in bytes.
   */
  size(path: string): Promise<number>

  /**
   * Ensure directory exists (optional, mostly for local fs)
   */
  ensureDir(path: string): Promise<void>
}
