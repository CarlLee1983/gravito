import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'bun'

/**
 * Migration result interface
 */
export interface MigrationResult {
  success: boolean
  message: string
  migrations?: string[]
  error?: string
}

/**
 * Drizzle Kit Migration Driver
 * Wraps drizzle-kit CLI commands
 */
export class DrizzleMigrationDriver {
  constructor(
    private configPath = 'drizzle.config.ts',
    private migrationsDir = 'src/database/migrations'
  ) {}

  async generate(name: string): Promise<MigrationResult> {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
    const filename = `${timestamp}_${name}.ts`
    const filepath = path.join(process.cwd(), this.migrationsDir, filename)

    await fs.mkdir(path.dirname(filepath), { recursive: true })

    const content = `import { sql } from 'drizzle-orm'

export async function up(db: any): Promise<void> {
  // TODO: Implement migration
  // await db.execute(sql\`CREATE TABLE ...\`)
}

export async function down(db: any): Promise<void> {
  // TODO: Implement rollback
  // await db.execute(sql\`DROP TABLE ...\`)
}
`

    await fs.writeFile(filepath, content, 'utf-8')

    return {
      success: true,
      message: `Migration created: ${filename}`,
      migrations: [filename],
    }
  }

  async migrate(): Promise<MigrationResult> {
    try {
      // Use drizzle-kit migrate for applying migration files
      const proc = spawn(['bunx', 'drizzle-kit', 'migrate', '--config', this.configPath], {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
      })

      const output = await new Response(proc.stdout).text()
      const exitCode = await proc.exited

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text()
        // If migration fails, it might be because migrations folder is empty or not initialized.
        // Fallback or explicit error?
        // Standard behavior: migrate fails if something is wrong.

        return {
          success: false,
          message: 'Migration failed',
          error: error || output,
        }
      }

      return {
        success: true,
        message: 'Migrations applied successfully',
      }
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Migration failed',
        error: DrizzleMigrationDriver.getErrorMessage(err),
      }
    }
  }

  async fresh(): Promise<MigrationResult> {
    try {
      const dropProc = spawn(['bunx', 'drizzle-kit', 'drop', '--config', this.configPath], {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
      })
      await dropProc.exited

      return this.migrate()
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Fresh migration failed',
        error: DrizzleMigrationDriver.getErrorMessage(err),
      }
    }
  }

  async status(): Promise<{ pending: string[]; applied: string[] }> {
    try {
      const migrationsPath = path.join(process.cwd(), this.migrationsDir)
      const files = await fs.readdir(migrationsPath)
      const migrations = files.filter((f) => f.endsWith('.ts'))

      return {
        pending: [],
        applied: migrations,
      }
    } catch {
      return { pending: [], applied: [] }
    }
  }

  private static getErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message
    }
    return String(err)
  }
}
