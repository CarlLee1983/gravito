import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { ContentDriver } from './ContentDriver'

export class LocalDriver implements ContentDriver {
  constructor(private rootDir: string) {}

  async read(path: string): Promise<string> {
    const fullPath = join(this.rootDir, path)
    return readFile(fullPath, 'utf-8')
  }

  async exists(path: string): Promise<boolean> {
    try {
      await stat(join(this.rootDir, path))
      return true
    } catch {
      return false
    }
  }

  async list(dir: string): Promise<string[]> {
    try {
      const fullPath = join(this.rootDir, dir)
      return await readdir(fullPath)
    } catch {
      return []
    }
  }
}
