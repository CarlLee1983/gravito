/**
 * Migrator
 * @description Migration runner with support for running and rolling back migrations
 */

import { readdir, stat } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'

import { MigrationRepository } from './MigrationRepository'
import type { MigrationConstructor, MigrationFile } from './Migration'

/**
 * Migrator Options
 */
export interface MigratorOptions {
    /** Path to migrations directory */
    path?: string
    /** Database connection name */
    connection?: string
    /** Migration table name */
    table?: string
}

/**
 * Migration Result
 */
export interface MigrationResult {
    /** Migrations that were run */
    migrations: string[]
    /** Batch number */
    batch?: number
}

/**
 * Migrator
 * Handles running and rolling back database migrations
 * 
 * @example
 * ```typescript
 * const migrator = new Migrator({ path: './migrations' })
 * 
 * // Run all pending migrations
 * await migrator.run()
 * 
 * // Rollback the last batch
 * await migrator.rollback()
 * 
 * // Get migration status
 * const status = await migrator.status()
 * ```
 */
export class Migrator {
    private repository: MigrationRepository
    private migrationsPath: string
    private resolvedMigrations: Map<string, MigrationConstructor> = new Map()

    constructor(options: MigratorOptions = {}) {
        this.migrationsPath = options.path ?? './migrations'
        this.repository = new MigrationRepository(options.connection)

        if (options.table) {
            this.repository.setTable(options.table)
        }
    }

    // ============================================================================
    // Configuration
    // ============================================================================

    /**
     * Set migrations path
     */
    setPath(path: string): this {
        this.migrationsPath = path
        return this
    }

    /**
     * Set database connection
     */
    connection(name: string): this {
        this.repository = new MigrationRepository(name)
        return this
    }

    // ============================================================================
    // Migration Execution
    // ============================================================================

    /**
     * Run all pending migrations
     */
    async run(): Promise<MigrationResult> {
        await this.repository.createRepository()

        const files = await this.getMigrationFiles()
        const ran = await this.repository.getRan()

        // Get pending migrations (not yet run)
        const pending = files.filter(file => !ran.includes(file.name))

        if (pending.length === 0) {
            return { migrations: [] }
        }

        const batch = await this.repository.getNextBatchNumber()
        const migrated: string[] = []

        for (const file of pending) {
            await this.runMigration(file, 'up')
            await this.repository.log(file.name, batch)
            migrated.push(file.name)
        }

        return { migrations: migrated, batch }
    }

    /**
     * Run a specific migration up
     */
    async runUp(migrationName: string): Promise<void> {
        await this.repository.createRepository()

        const files = await this.getMigrationFiles()
        const file = files.find(f => f.name === migrationName)

        if (!file) {
            throw new Error(`Migration "${migrationName}" not found`)
        }

        const ran = await this.repository.getRan()
        if (ran.includes(migrationName)) {
            throw new Error(`Migration "${migrationName}" has already been run`)
        }

        const batch = await this.repository.getNextBatchNumber()
        await this.runMigration(file, 'up')
        await this.repository.log(file.name, batch)
    }

    /**
     * Rollback the last batch of migrations
     */
    async rollback(steps = 1): Promise<MigrationResult> {
        await this.repository.createRepository()

        const files = await this.getMigrationFiles()
        const fileMap = new Map(files.map(f => [f.name, f]))

        const rolledBack: string[] = []

        for (let i = 0; i < steps; i++) {
            const lastBatch = await this.repository.getLast()

            if (lastBatch.length === 0) {
                break
            }

            for (const record of lastBatch) {
                const file = fileMap.get(record.migration)

                if (file) {
                    await this.runMigration(file, 'down')
                }

                await this.repository.delete(record.migration)
                rolledBack.push(record.migration)
            }
        }

        return { migrations: rolledBack }
    }

    /**
     * Rollback all migrations
     */
    async reset(): Promise<MigrationResult> {
        await this.repository.createRepository()

        const ran = await this.repository.getRan()
        const files = await this.getMigrationFiles()
        const fileMap = new Map(files.map(f => [f.name, f]))

        const rolledBack: string[] = []

        // Rollback in reverse order
        for (const migration of [...ran].reverse()) {
            const file = fileMap.get(migration)

            if (file) {
                await this.runMigration(file, 'down')
            }

            await this.repository.delete(migration)
            rolledBack.push(migration)
        }

        return { migrations: rolledBack }
    }

    /**
     * Reset and re-run all migrations
     */
    async fresh(): Promise<MigrationResult> {
        await this.reset()
        return await this.run()
    }

    /**
     * Rollback and re-run the last batch
     */
    async refresh(steps = 1): Promise<MigrationResult> {
        await this.rollback(steps)
        return await this.run()
    }

    // ============================================================================
    // Status
    // ============================================================================

    /**
     * Get migration status
     */
    async status(): Promise<{
        ran: string[]
        pending: string[]
    }> {
        await this.repository.createRepository()

        const files = await this.getMigrationFiles()
        const ran = await this.repository.getRan()

        const pending = files
            .filter(file => !ran.includes(file.name))
            .map(file => file.name)

        return { ran, pending }
    }

    // ============================================================================
    // Internal Methods
    // ============================================================================

    /**
     * Get all migration files from the migrations directory
     */
    private async getMigrationFiles(): Promise<MigrationFile[]> {
        try {
            const dirStat = await stat(this.migrationsPath)
            if (!dirStat.isDirectory()) {
                return []
            }
        } catch {
            // Directory doesn't exist
            return []
        }

        const entries = await readdir(this.migrationsPath)
        const migrationFiles: MigrationFile[] = []

        for (const entry of entries) {
            const ext = extname(entry)

            // Only .ts and .js files
            if (ext !== '.ts' && ext !== '.js') {
                continue
            }

            // Skip .d.ts files
            if (entry.endsWith('.d.ts')) {
                continue
            }

            const fullPath = join(this.migrationsPath, entry)
            const fileStat = await stat(fullPath)

            if (fileStat.isFile()) {
                migrationFiles.push({
                    name: basename(entry, ext),
                    path: fullPath,
                })
            }
        }

        // Sort by filename (which should include timestamp)
        return migrationFiles.sort((a, b) => a.name.localeCompare(b.name))
    }

    /**
     * Run a single migration
     */
    private async runMigration(file: MigrationFile, direction: 'up' | 'down'): Promise<void> {
        const MigrationClass = await this.resolveMigration(file)
        const instance = new MigrationClass()

        if (direction === 'up') {
            await instance.up()
        } else {
            await instance.down()
        }
    }

    /**
     * Resolve migration class from file
     */
    private async resolveMigration(file: MigrationFile): Promise<MigrationConstructor> {
        // Check cache
        if (this.resolvedMigrations.has(file.name)) {
            return this.resolvedMigrations.get(file.name)!
        }

        // Dynamic import
        const module = await import(file.path)

        // Support both default export and named export
        const keys = Object.keys(module)
        const firstKey = keys[0]
        const MigrationClass = module.default ?? (firstKey ? module[firstKey] : undefined)

        if (!MigrationClass || typeof MigrationClass !== 'function') {
            throw new Error(`Invalid migration file: ${file.path}. Must export a migration class.`)
        }

        this.resolvedMigrations.set(file.name, MigrationClass)
        return MigrationClass
    }
}
