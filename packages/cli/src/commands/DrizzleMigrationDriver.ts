import fs from 'node:fs/promises'
import path from 'node:path'
import { getRuntimeAdapter } from '@gravito/core'
import type { MigrationDriver, MigrationResult } from './MigrationDriver'

/**
 * Drizzle Kit Migration Driver.
 *
 * Wraps `drizzle-kit` CLI commands to manage migrations for Drizzle ORM projects.
 *
 * @public
 * @since 3.0.0
 */
export class DrizzleMigrationDriver implements MigrationDriver {
  /**
   * Create a new DrizzleMigrationDriver instance.
   *
   * @param configPath - Path to the drizzle.config.ts file.
   * @param migrationsDir - Path to the migrations directory.
   */
  constructor(
    private configPath = 'drizzle.config.ts',
    private migrationsDir = 'src/database/migrations'
  ) {}

  /**
   * Generate a new migration file.
   *
   * @param name - The name of the migration.
   * @returns A promise that resolves with the migration result.
   */
  async generate(name: string): Promise<MigrationResult> {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
    const filename = `${timestamp}_${name}.ts`
    const filepath = path.join(process.cwd(), this.migrationsDir, filename)

    await fs.mkdir(path.dirname(filepath), { recursive: true })

    // Use string concatenation to avoid nested backtick escape issues
    const content =
      "import { sql } from 'drizzle-orm'\n\n" +
      'export async function up(db: any): Promise<void> {\n' +
      '  // TODO: Implement migration\n' +
      '  // await db.execute(sql`CREATE TABLE ...`)\n' +
      '}\n\n' +
      'export async function down(db: any): Promise<void> {\n' +
      '  // TODO: Implement rollback\n' +
      '  // await db.execute(sql`DROP TABLE ...`)\n' +
      '}\n'

    await fs.writeFile(filepath, content, 'utf-8')

    return {
      success: true,
      message: `Migration created: ${filename}`,
      migrations: [filename],
    }
  }

  /**
   * Run all pending migrations.
   *
   * @returns A promise that resolves with the migration result.
   */
  async migrate(): Promise<MigrationResult> {
    try {
      const runtime = getRuntimeAdapter()
      // Use drizzle-kit migrate for applying migration files
      const proc = runtime.spawn(['bunx', 'drizzle-kit', 'migrate', '--config', this.configPath], {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
      })

      const output = await new Response(proc.stdout ?? null).text()
      const exitCode = await proc.exited

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr ?? null).text()
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

  /**
   * Drop all tables and re-run migrations.
   *
   * @returns A promise that resolves with the migration result.
   */
  async fresh(): Promise<MigrationResult> {
    try {
      const runtime = getRuntimeAdapter()
      const dropProc = runtime.spawn(['bunx', 'drizzle-kit', 'drop', '--config', this.configPath], {
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

  /**
   * Rollback the last migration.
   *
   * @returns A promise that resolves with the migration result.
   */
  async rollback(): Promise<MigrationResult> {
    return {
      success: false,
      message:
        'Rollback is not supported by the Drizzle driver. Please use manual SQL or snapshots.',
    }
  }

  /**
   * Get the current status of migrations.
   *
   * @returns A promise that resolves with the migration status.
   */
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

  /**
   * Extract error message from an unknown error.
   *
   * @param err - The unknown error.
   * @returns The extracted error message.
   */
  private static getErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message
    }
    return String(err)
  }
}
