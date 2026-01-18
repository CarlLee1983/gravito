import { existsSync } from 'node:fs'
import { appendFile, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { StorageAdapter } from './adapter'

/**
 * FileSystemAdapter implements the `StorageAdapter` interface for the local file system.
 *
 * It provides standard file operations (read, write, delete, etc.) using
 * Node.js or Bun's native file system modules.
 *
 * @public
 * @since 3.0.0
 */
export class FileSystemAdapter implements StorageAdapter {
  async append(path: string, content: string): Promise<void> {
    await this.ensureDir(path)
    await appendFile(path, content, 'utf-8')
  }

  async write(path: string, content: string): Promise<void> {
    await this.ensureDir(path)
    await writeFile(path, content, 'utf-8')
  }

  async read(path: string): Promise<string> {
    if (!existsSync(path)) {
      throw new Error(`File not found: ${path}`)
    }
    return readFile(path, 'utf-8')
  }

  async exists(path: string): Promise<boolean> {
    return existsSync(path)
  }

  async delete(path: string): Promise<void> {
    if (existsSync(path)) {
      await unlink(path)
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await rename(oldPath, newPath)
  }

  async size(path: string): Promise<number> {
    try {
      const stats = await stat(path)
      return stats.size
    } catch {
      return 0
    }
  }

  async ensureDir(path: string): Promise<void> {
    const dir = dirname(path)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
  }
}
