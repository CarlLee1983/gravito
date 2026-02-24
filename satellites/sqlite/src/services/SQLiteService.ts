/**
 * SQLite Service
 * Manages SQLite database connections via Xenon FFI
 */

import type { SQLiteServiceConfig, SQLiteConnection } from '../types'
import { SQLiteConnectionError } from '../errors'

// 模擬 Xenon（實際環境使用 @gravito/xenon）
const Xenon = {
  configure: (config: any) => config,
  getConfig: () => ({}),
}

/**
 * SQLite Service using Xenon for safe FFI operations
 */
export class SQLiteService {
  private config: SQLiteServiceConfig
  private connections: Map<string, SQLiteConnection> = new Map()

  constructor(config: SQLiteServiceConfig) {
    this.config = {
      libPath: config.libPath || this.getSystemSQLitePath(),
      ...config,
    }

    // Configure Xenon with security policy
    Xenon.configure({
      allowedPaths: config.xenonConfig?.allowedPaths || this.getDefaultAllowedPaths(),
      blockedPaths: config.xenonConfig?.blockedPaths || ['/etc/**', '/sys/**'],
    })
  }

  /**
   * Create a new database connection (mock implementation)
   * In production, this would use real FFI calls
   */
  async createConnection(dbPath: string): Promise<SQLiteConnection> {
    // Validate path security
    if (!this.isPathAllowed(dbPath)) {
      throw new SQLiteConnectionError(
        `Database path not allowed: ${dbPath}`,
      )
    }

    // In real implementation:
    // 1. Load libsqlite3 via Xenon.load()
    // 2. Call sqlite3_open()
    // 3. Return connection wrapper

    return {
      dbPath,
      execute: async (): Promise<any[]> => {
        // Implementation would use FFI to sqlite3_exec
        return []
      },
      run: async (): Promise<void> => {
        // Implementation would use FFI
      },
      getOne: async (): Promise<null> => {
        // Implementation would use FFI
        return null
      },
      close: async (): Promise<void> => {
        // Implementation would use FFI sqlite3_close
      },
      isOpen: () => true,
    }
  }

  /**
   * Get default allowed paths for SQLite databases
   */
  private getDefaultAllowedPaths(): string[] {
    return [
      '/app/data/sqlite/*.db',
      '/var/lib/gravito/sqlite/*.db',
      '/home/**/.gravito/sqlite/*.db',
    ]
  }

  /**
   * Check if database path is allowed
   */
  private isPathAllowed(path: string): boolean {
    const config = Xenon.getConfig() as any
    const allowedPaths = (config.allowedPaths as string[]) || []
    if (allowedPaths.length === 0) {
      return !path.startsWith('/etc') && !path.startsWith('/sys')
    }
    return allowedPaths.some((p: string) => this.pathMatches(path, p))
  }

  /**
   * Simple path matching (glob-like)
   */
  private pathMatches(path: string, pattern: string): boolean {
    if (!pattern.includes('*')) {
      return path === pattern
    }
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`)
    return regex.test(path)
  }

  /**
   * Get system SQLite library path
   */
  private getSystemSQLitePath(): string {
    // In production, would detect OS and return correct path
    switch (process.platform) {
      case 'darwin':
        return '/usr/lib/libsqlite3.dylib'
      case 'linux':
        return '/usr/lib/x86_64-linux-gnu/libsqlite3.so.0'
      case 'win32':
        return 'C:\\Windows\\System32\\sqlite3.dll'
      default:
        return 'libsqlite3.so'
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    for (const conn of this.connections.values()) {
      await conn.close()
    }
    this.connections.clear()
  }

  /**
   * Get configuration
   */
  getConfig(): SQLiteServiceConfig {
    return { ...this.config }
  }
}
