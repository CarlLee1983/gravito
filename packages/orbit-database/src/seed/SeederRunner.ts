/**
 * Seeder Runner
 * @description Runs database seeders
 */

import { readdir, stat } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'

import type { SeederConstructor, SeederFile } from './Seeder'

/**
 * Seeder Runner Options
 */
export interface SeederRunnerOptions {
    /** Path to seeders directory */
    path?: string
    /** Database connection name */
    connection?: string
}

/**
 * Seeder Runner
 * Discovers and runs database seeders
 * 
 * @example
 * ```typescript
 * const runner = new SeederRunner({ path: './seeders' })
 * 
 * // Run all seeders
 * await runner.run()
 * 
 * // Run specific seeder
 * await runner.call('UserSeeder')
 * ```
 */
export class SeederRunner {
    private seedersPath: string
    // Reserved for future use with connection-specific seeding
    private _connectionName: string | undefined
    private resolvedSeeders: Map<string, SeederConstructor> = new Map()

    constructor(options: SeederRunnerOptions = {}) {
        this.seedersPath = options.path ?? './seeders'
        this._connectionName = options.connection
    }

    // ============================================================================
    // Configuration
    // ============================================================================

    /**
     * Set seeders path
     */
    setPath(path: string): this {
        this.seedersPath = path
        return this
    }

    /**
     * Set database connection
     */
    connection(name: string): this {
        this._connectionName = name
        return this
    }

    // ============================================================================
    // Seeder Execution
    // ============================================================================

    /**
     * Run all seeders in the directory
     */
    async run(): Promise<string[]> {
        const files = await this.getSeederFiles()
        const executed: string[] = []

        for (const file of files) {
            await this.runSeeder(file)
            executed.push(file.name)
        }

        return executed
    }

    /**
     * Run a specific seeder by name
     */
    async call(seederName: string): Promise<void> {
        const files = await this.getSeederFiles()
        const file = files.find(f => f.name === seederName)

        if (!file) {
            throw new Error(`Seeder "${seederName}" not found`)
        }

        await this.runSeeder(file)
    }

    /**
     * Run multiple specific seeders
     */
    async callMultiple(seederNames: string[]): Promise<void> {
        for (const name of seederNames) {
            await this.call(name)
        }
    }

    /**
     * Check if a seeder exists
     */
    async has(seederName: string): Promise<boolean> {
        const files = await this.getSeederFiles()
        return files.some(f => f.name === seederName)
    }

    /**
     * List all available seeders
     */
    async list(): Promise<string[]> {
        const files = await this.getSeederFiles()
        return files.map(f => f.name)
    }

    // ============================================================================
    // Internal Methods
    // ============================================================================

    /**
     * Get all seeder files from the seeders directory
     */
    private async getSeederFiles(): Promise<SeederFile[]> {
        try {
            const dirStat = await stat(this.seedersPath)
            if (!dirStat.isDirectory()) {
                return []
            }
        } catch {
            // Directory doesn't exist
            return []
        }

        const entries = await readdir(this.seedersPath)
        const seederFiles: SeederFile[] = []

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

            const fullPath = join(this.seedersPath, entry)
            const fileStat = await stat(fullPath)

            if (fileStat.isFile()) {
                seederFiles.push({
                    name: basename(entry, ext),
                    path: fullPath,
                })
            }
        }

        // Sort alphabetically
        return seederFiles.sort((a, b) => a.name.localeCompare(b.name))
    }

    /**
     * Run a single seeder
     */
    private async runSeeder(file: SeederFile): Promise<void> {
        const SeederClass = await this.resolveSeeder(file)
        const instance = new SeederClass()
        await instance.run()
    }

    /**
     * Resolve seeder class from file
     */
    private async resolveSeeder(file: SeederFile): Promise<SeederConstructor> {
        // Check cache
        if (this.resolvedSeeders.has(file.name)) {
            return this.resolvedSeeders.get(file.name)!
        }

        // Dynamic import
        const module = await import(file.path)

        // Support both default export and named export
        const keys = Object.keys(module)
        const firstKey = keys[0]
        const SeederClass = module.default ?? (firstKey ? module[firstKey] : undefined)

        if (!SeederClass || typeof SeederClass !== 'function') {
            throw new Error(`Invalid seeder file: ${file.path}. Must export a seeder class.`)
        }

        this.resolvedSeeders.set(file.name, SeederClass)
        return SeederClass
    }
}
