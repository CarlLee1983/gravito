import { existsSync } from 'node:fs'
import { appendFile, mkdir, readFile, stat, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { SitemapEntry } from '../interfaces'

export interface LogEntry {
  op: 'add' | 'remove'
  timestamp: number
  entry?: SitemapEntry
  url?: string // For remove op
}

export class JsonlLogger {
  private dirEnsured = false

  constructor(private logPath: string) {}

  private async ensureDir(): Promise<void> {
    if (this.dirEnsured) {
      return
    }
    await mkdir(dirname(this.logPath), { recursive: true })
    this.dirEnsured = true
  }

  /**
   * Append a single operation to the log
   */
  async append(entry: LogEntry): Promise<void> {
    await this.ensureDir()
    const line = `${JSON.stringify(entry)}\n`
    await appendFile(this.logPath, line, 'utf-8')
  }

  /**
   * Read all entries from log
   */
  async readAll(): Promise<LogEntry[]> {
    if (!existsSync(this.logPath)) {
      return []
    }

    const content = await readFile(this.logPath, 'utf-8')
    const lines = content.split('\n').filter((line) => line.trim().length > 0)

    return lines
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null // Skip corrupted lines
        }
      })
      .filter((x) => x !== null) as LogEntry[]
  }

  async getSize(): Promise<number> {
    try {
      const stats = await stat(this.logPath)
      return stats.size
    } catch {
      return 0
    }
  }

  async delete(): Promise<void> {
    if (existsSync(this.logPath)) {
      await unlink(this.logPath)
    }
  }

  /**
   * Filter out corrupted lines and rewrite the log file
   * @returns number of corrupted lines removed
   */
  async repairWAL(): Promise<number> {
    if (!existsSync(this.logPath)) {
      return 0
    }

    const content = await readFile(this.logPath, 'utf-8')
    const lines = content.split('\n')
    const validLines: string[] = []
    let corruptedCount = 0

    for (const line of lines) {
      if (line.trim().length === 0) continue
      try {
        JSON.parse(line)
        validLines.push(line)
      } catch {
        corruptedCount++
      }
    }

    if (corruptedCount > 0) {
      const newContent = validLines.length > 0 ? `${validLines.join('\n')}\n` : ''
      await appendFile(`${this.logPath}.fixed`, newContent, 'utf-8')
      await unlink(this.logPath)
      const { rename } = await import('node:fs/promises')
      await rename(`${this.logPath}.fixed`, this.logPath)
    }

    return corruptedCount
  }
}
