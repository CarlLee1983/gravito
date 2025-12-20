#!/usr/bin/env bun
/**
 * Orbit Database CLI
 * Super-fast database management tool
 */

import { Migrator } from './migration/Migrator'
import { SeederRunner } from './seed/SeederRunner'
import { resolve } from 'node:path'

async function main() {
    const args = process.argv.slice(2)
    const command = args[0]

    // Parse flags
    const flags: Record<string, string | boolean> = {}
    for (let i = 1; i < args.length; i++) {
        const arg = args[i]
        if (!arg) continue;

        if (arg.startsWith('--')) {
            const key = arg.slice(2)
            // Check if next arg is value or another flag
            const nextArg = args[i + 1]
            if (nextArg && !nextArg.startsWith('--')) {
                flags[key] = nextArg
                i++
            } else {
                flags[key] = true
            }
        }
    }

    const migrationsPath = flags['path']
        ? resolve(process.cwd(), flags['path'] as string)
        : resolve(process.cwd(), 'database/migrations')

    const seedersPath = flags['seed-path']
        ? resolve(process.cwd(), flags['seed-path'] as string)
        : resolve(process.cwd(), 'database/seeders')

    // Initialize DB if config is passed via args or env
    // For now, assume DB is configured via some bootstrap or we load .env
    // In a real CLI, we might need to load the user's config file (e.g. orbit.config.ts)
    // But for this simplified version, we'll assume environment variables are set

    try {
        switch (command) {
            case 'migrate':
            case 'migrate:latest':
                console.log('Running migrations...')
                const migrator = new Migrator({ path: migrationsPath })
                const result = await migrator.run()
                if (result.migrations.length === 0) {
                    console.log('Nothing to migrate.')
                } else {
                    console.log(`Batch ${result.batch} run:`)
                    result.migrations.forEach(m => console.log(`✓ ${m}`))
                }
                break

            case 'migrate:rollback':
                console.log('Rolling back migrations...')
                const rollbackMigrator = new Migrator({ path: migrationsPath })
                const steps = flags['step'] ? parseInt(flags['step'] as string) : 1
                const rollbackResult = await rollbackMigrator.rollback(steps)
                if (rollbackResult.migrations.length === 0) {
                    console.log('Nothing to rollback.')
                } else {
                    rollbackResult.migrations.forEach(m => console.log(`✗ ${m}`))
                }
                break

            case 'migrate:status':
                const statusMigrator = new Migrator({ path: migrationsPath })
                const status = await statusMigrator.status()
                console.log('Ran Migrations:')
                status.ran.forEach(m => console.log(`✓ ${m}`))
                console.log('\nPending Migrations:')
                status.pending.forEach(m => console.log(`- ${m}`))
                break

            case 'migrate:fresh':
                console.log('Dropping all tables and re-running migrations...')
                const freshMigrator = new Migrator({ path: migrationsPath })
                await freshMigrator.fresh()
                console.log('Database refreshed.')
                break

            case 'seed':
            case 'seed:run':
                console.log('Running seeders...')
                const runner = new SeederRunner({ path: seedersPath })
                const ran = await runner.run()
                ran.forEach(s => console.log(`✓ ${s}`))
                break

            default:
                console.log(`
Orbit Database CLI

Usage:
  bun orbit <command> [flags]

Commands:
  migrate             Run pending migrations
  migrate:rollback    Rollback the last batch of migrations
  migrate:fresh       Drop all tables and re-run all migrations
  migrate:status      Show status of migrations
  seed                Run all seeders

Flags:
  --path <path>       Path to migrations directory
  --seed-path <path>  Path to seeders directory
  --step <n>          Number of batches to rollback (default: 1)
`)
        }
    } catch (error) {
        console.error('Error:', error)
        process.exit(1)
    } finally {
        // Ensure we close connection if needed? DB.connection() usually keeps alive.
        // We might need a DB.close() or process.exit()
        process.exit(0)
    }
}

main()
