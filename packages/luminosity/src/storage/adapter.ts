/**
 * Interface for a low-level storage adapter.
 *
 * Provides a unified API for basic file operations across different
 * storage backends (Local FS, S3, etc.).
 *
 * @public
 * @since 3.0.0
 */
export interface StorageAdapter {
  /**
   * Append content to a file.
   *
   * @param path - The file path or key.
   * @param content - The content to append.
   */
  append(path: string, content: string): Promise<void>

  /**
   * Write content to a file, overwriting existing content.
   *
   * @param path - The file path or key.
   * @param content - The content to write.
   */
  write(path: string, content: string): Promise<void>

  /**
   * Read file content as a string.
   *
   * @param path - The file path or key.
   * @returns The file content.
   */
  read(path: string): Promise<string>

  /**
   * Check if a file exists.
   *
   * @param path - The file path or key.
   * @returns True if the file exists, false otherwise.
   */
  exists(path: string): Promise<boolean>

  /**
   * Delete a file.
   *
   * @param path - The file path or key.
   */
  delete(path: string): Promise<void>

  /**
   * Rename or move a file.
   *
   * @param oldPath - The current path.
   * @param newPath - The new path.
   */
  rename(oldPath: string, newPath: string): Promise<void>

  /**
   * Get the size of a file in bytes.
   *
   * @param path - The file path or key.
   * @returns The file size.
   */
  size(path: string): Promise<number>

  /**
   * Ensure the parent directory or environment exists for the given path.
   *
   * @param path - The target file path.
   */
  ensureDir(path: string): Promise<void>
}
