import fs from 'node:fs/promises'
import { join } from 'node:path'
import type { ConnectionConfig } from '@gravito/atlas'
import { DB, Migrator } from '@gravito/atlas'
import type { MigrationDriver, MigrationResult, MigrationStatus } from './MigrationDriver'

const DEFAULT_DATABASE_URL = 'sqlite:./demo.db'

export class AtlasMigrationDriver implements MigrationDriver {
  constructor(private migrationsDir = 'src/database/migrations') {}

  async generate(name: string): Promise<MigrationResult> {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
    const filename = `${timestamp}_${name}.ts`
    const filepath = join(process.cwd(), this.migrationsDir, filename)
    await fs.mkdir(join(process.cwd(), this.migrationsDir), { recursive: true })

    const className = this.buildClassName(name)
    const content = `import { Schema } from '@gravito/atlas'

export default class ${className} {
  async up() {
    // TODO: Implement schema changes using Schema.create/table/drop
  }

  async down() {
    // TODO: Implement rollback logic (drop tables, columns, etc.)
  }
}
`

    await fs.writeFile(filepath, content, 'utf8')

    return {
      success: true,
      message: `Migration created: ${filename}`,
      migrations: [filename],
    }
  }

  async migrate(): Promise<MigrationResult> {
    try {
      this.ensureDatabaseConfigured()
      const migrator = new Migrator({ path: this.migrationsDir })
      const result = await migrator.run()
      const message =
        result.migrations.length === 0
          ? 'No pending migrations'
          : `Applied ${result.migrations.length} migration(s)`
      return { success: true, message }
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Migration failed',
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async fresh(): Promise<MigrationResult> {
    try {
      this.ensureDatabaseConfigured()
      const migrator = new Migrator({ path: this.migrationsDir })
      const result = await migrator.fresh()
      const message =
        result.migrations.length === 0
          ? 'Fresh migration completed (no migrations found)'
          : `Fresh migration applied ${result.migrations.length} migration(s)`
      return { success: true, message }
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Fresh migration failed',
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async status(): Promise<MigrationStatus> {
    this.ensureDatabaseConfigured()
    const migrator = new Migrator({ path: this.migrationsDir })
    const status = await migrator.status()
    return {
      applied: status.ran,
      pending: status.pending,
    }
  }

  private ensureDatabaseConfigured() {
    DB.configure({
      default: 'default',
      connections: {
        default: this.buildConnectionConfig(),
      },
    })
  }

  private buildConnectionConfig(): ConnectionConfig {
    const url = (process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL).trim()

    if (url.toLowerCase().startsWith('sqlite:')) {
      const pathPart = url.slice('sqlite:'.length)
      if (pathPart === ':memory:') {
        return {
          driver: 'sqlite',
          database: ':memory:',
        }
      }

      const normalizedPath = pathPart.replace(/^\/+/, '/')
      const database = normalizedPath === '' ? './demo.db' : normalizedPath
      const normalized = database.startsWith('/') ? database : join(process.cwd(), database)
      return {
        driver: 'sqlite',
        database: normalized,
      }
    }

    try {
      const parsed = new URL(url)
      let driver = parsed.protocol.replace(':', '')
      if (driver === 'postgresql') {
        driver = 'postgres'
      }

      const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : undefined
      const config: Record<string, unknown> = {
        driver,
      }

      if (database) {
        config.database = database
      }
      if (parsed.hostname) {
        config.host = parsed.hostname
      }
      if (parsed.port) {
        config.port = Number(parsed.port)
      }
      if (parsed.username) {
        config.username = decodeURIComponent(parsed.username)
      }
      if (parsed.password) {
        config.password = decodeURIComponent(parsed.password)
      }

      // TODO: Improve config typing for MongoDB
      return config as unknown as ConnectionConfig
    } catch {
      return {
        driver: 'sqlite',
        database: join(process.cwd(), 'demo.db'),
      } as ConnectionConfig
    }
  }

  private buildClassName(name: string) {
    const segments = name.split(/[^0-9a-zA-Z]+/).filter(Boolean)
    const pascal = segments.map((segment) => segment[0].toUpperCase() + segment.slice(1)).join('')
    return pascal ? `Migration${pascal}` : `Migration${Date.now()}`
  }
}
