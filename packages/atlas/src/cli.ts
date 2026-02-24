#!/usr/bin/env bun

/**
 * Orbit Database CLI
 * Super-fast database management tool
 */

import { resolve } from 'node:path'
import { DoctorCommand } from './commands/DoctorCommand'
import { MakeMigrationCommand } from './commands/MakeMigrationCommand'
import { MakeModelCommand } from './commands/MakeModelCommand'
import { TinkerCommand } from './commands/TinkerCommand'
import { DataExporter } from './data/DataExporter'
import { Migrator } from './migration/Migrator'
import { MigrationGenerator } from './schema/MigrationGenerator'
import { SchemaDiff } from './schema/SchemaDiff'
import { TypeGenerator } from './schema/TypeGenerator'
import { TypeWriter } from './schema/TypeWriter'
import { SeederRunner } from './seed/SeederRunner'

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  // Parse flags
  const flags: Record<string, string | boolean> = {}
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (!arg) {
      continue
    }

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

  const migrationsPath = flags.path
    ? resolve(process.cwd(), flags.path as string)
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
      case 'migrate:latest': {
        console.log('Running migrations...')
        const migrator = new Migrator({ path: migrationsPath })
        const result = await migrator.run()
        if (result.migrations.length === 0) {
          console.log('Nothing to migrate.')
        } else {
          console.log(`Batch ${result.batch} run:`)
          result.migrations.forEach((m) => {
            console.log(`✓ ${m}`)
          })
        }
        break
      }

      case 'migrate:rollback': {
        console.log('Rolling back migrations...')
        const rollbackMigrator = new Migrator({ path: migrationsPath })
        const steps = flags.step ? parseInt(flags.step as string, 10) : 1
        const rollbackResult = await rollbackMigrator.rollback(steps)
        if (rollbackResult.migrations.length === 0) {
          console.log('Nothing to rollback.')
        } else {
          rollbackResult.migrations.forEach((m) => {
            console.log(`✗ ${m}`)
          })
        }
        break
      }

      case 'migrate:status': {
        const statusMigrator = new Migrator({ path: migrationsPath })
        const status = await statusMigrator.status()
        console.log('Ran Migrations:')
        status.ran.forEach((m) => {
          console.log(`✓ ${m}`)
        })
        console.log('\nPending Migrations:')
        status.pending.forEach((m) => {
          console.log(`- ${m}`)
        })
        break
      }

      case 'migrate:fresh': {
        console.log('Dropping all tables and re-running migrations...')
        const freshMigrator = new Migrator({ path: migrationsPath })
        await freshMigrator.fresh()
        console.log('Database refreshed.')
        break
      }

      case 'seed':
      case 'seed:run': {
        console.log('Running seeders...')
        const runner = new SeederRunner({ path: seedersPath })
        const ran = await runner.run()
        ran.forEach((s) => {
          console.log(`✓ ${s}`)
        })
        break
      }

      case 'make:model': {
        const name = args[1]
        if (!name) {
          console.error('Error: Model name required')
          process.exit(1)
        }
        await new MakeModelCommand().handle({
          name,
          path: flags.path as string,
          migration: Boolean(flags.migration || flags.m),
        })
        break
      }

      case 'make:migration': {
        const name = args[1]
        if (!name) {
          console.error('Error: Migration name required')
          process.exit(1)
        }
        await new MakeMigrationCommand().handle({ name, path: flags.path as string })
        break
      }

      case 'tinker': {
        await new TinkerCommand().handle({})
        break
      }

      case 'doctor': {
        await new DoctorCommand().handle(flags)
        break
      }

      case 'generate:types': {
        const modelsDir = flags.models
          ? resolve(process.cwd(), flags.models as string)
          : resolve(process.cwd(), 'src/models')
        const outFile = flags.out
          ? resolve(process.cwd(), flags.out as string)
          : resolve(process.cwd(), '.orbit/generated.d.ts')

        console.log(`Scanning models in: ${modelsDir}`)
        const gen = new TypeGenerator({ modelsDir, verbose: true })
        const maps = await gen.generate()

        if (maps.length === 0) {
          console.log('No models with @Column decorators found.')
        } else {
          const writer = new TypeWriter({ outputPath: outFile })
          await writer.write(maps)
          console.log(`\n✓ Generated types for ${maps.length} model(s) → ${outFile}`)
        }
        break
      }

      case 'db:push': {
        console.log('Comparing model schema vs live database...')
        const { DB } = await import('./DB')
        const connection = DB.connection()
        const driver = connection.getDriver()
        const dialect = driver.getDriverName()

        if (dialect === 'sqlite' || dialect === 'mongodb' || dialect === 'redis') {
          console.error(`db:push is not supported for ${dialect} driver.`)
          process.exit(1)
        }

        const tables = flags.tables ? String(flags.tables).split(',') : []
        if (tables.length === 0) {
          console.error('Usage: bun orbit db:push --tables users,posts,...')
          process.exit(1)
        }

        const generator = new MigrationGenerator({ dialect: dialect as any })
        let totalChanges = 0

        for (const table of tables) {
          const differ = new SchemaDiff({ connection, table, desired: [] })
          const diff = await differ.compare()

          if (!diff.hasChanges) {
            console.log(`  ✓ ${table}: up to date`)
            continue
          }

          const statements = generator.generate(diff)
          console.log(`  ~ ${table}: applying ${statements.length} change(s)...`)

          for (const sql of statements) {
            await connection.raw(sql, [])
            console.log(`    → ${sql}`)
            totalChanges++
          }
        }

        console.log(`\n✓ db:push complete (${totalChanges} statement(s) applied)`)
        break
      }

      case 'db:export': {
        // 取得並驗證必要參數
        const exportTable = String(flags.table ?? '')
        if (!exportTable) {
          console.error(
            'Usage: bun orbit db:export --table <name> [--output <file>] [--batch-size <n>] [--where <condition>]'
          )
          process.exit(1)
        }

        // 設定輸出檔案路徑，預設為 {table}.jsonl
        const exportOutput = flags.output
          ? resolve(process.cwd(), String(flags.output))
          : resolve(process.cwd(), `${exportTable}.jsonl`)

        // 解析可選參數
        const exportBatchSize = flags['batch-size']
          ? parseInt(String(flags['batch-size']), 10)
          : undefined
        const exportWhere = flags.where ? String(flags.where) : undefined

        // 載入 DB 連線
        const { DB: ExportDB } = await import('./DB')
        const exportConnection = ExportDB.connection()

        const exporter = new DataExporter(exportConnection)
        const exportResult = await exporter.exportToJsonl({
          table: exportTable,
          output: exportOutput,
          batchSize: exportBatchSize,
          where: exportWhere,
        })

        console.log(`✓ Exported ${exportResult.rows} rows to ${exportOutput}`)
        break
      }

      case 'db:import': {
        // 取得並驗證必要參數
        const importTable = String(flags.table ?? '')
        if (!importTable) {
          console.error(
            'Usage: bun orbit db:import --table <name> --input <file.jsonl> [--batch-size <n>] [--on-conflict skip|update|error]'
          )
          process.exit(1)
        }

        const importInput = flags.input ? String(flags.input) : ''
        if (!importInput) {
          console.error('Error: --input <file.jsonl> is required')
          process.exit(1)
        }

        // 解析可選參數
        const importBatchSize = flags['batch-size']
          ? parseInt(String(flags['batch-size']), 10)
          : undefined
        const rawOnConflict = flags['on-conflict'] ? String(flags['on-conflict']) : 'error'
        const onConflict = (
          ['skip', 'update', 'error'].includes(rawOnConflict) ? rawOnConflict : 'error'
        ) as 'skip' | 'update' | 'error'

        // 解析輸入檔案路徑（相對於 cwd）
        const resolvedInput = resolve(process.cwd(), importInput)

        // 載入 DB 連線
        const { DB: ImportDB } = await import('./DB')
        const importConnection = ImportDB.connection()

        const importer = new DataExporter(importConnection)
        const importResult = await importer.importFromJsonl({
          input: resolvedInput,
          table: importTable,
          batchSize: importBatchSize,
          onConflict,
        })

        console.log(`✓ Imported ${importResult.rows} rows into ${importTable}`)
        break
      }

      case 'migrate:generate': {
        const { DB } = await import('./DB')
        const connection = DB.connection()
        const driver = connection.getDriver()
        const dialect = driver.getDriverName()
        const table = String(flags.table ?? '')

        if (!table) {
          console.error('Usage: bun orbit migrate:generate --table <tableName>')
          process.exit(1)
        }

        const differ = new SchemaDiff({ connection, table, desired: [] })
        const diff = await differ.compare()

        if (!diff.hasChanges) {
          console.log(`Table '${table}' is up to date. No migration needed.`)
          break
        }

        const gen = new MigrationGenerator({ dialect: dialect as any })
        const content = gen.generateMigrationScript(diff)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -1)
        const filename = `${timestamp}_sync_${table}.ts`
        const migrationFile = resolve(migrationsPath, filename)

        const { writeFile, mkdir } = await import('node:fs/promises')
        const { dirname } = await import('node:path')
        await mkdir(dirname(migrationFile), { recursive: true })
        await writeFile(migrationFile, content, 'utf8')

        console.log(`\n✓ Migration generated: ${migrationFile}`)
        const addedCount = diff.added.length
        const removedCount = diff.removed.length
        const modifiedCount = diff.modified.length
        console.log(`  +${addedCount} added, -${removedCount} removed, ~${modifiedCount} modified`)
        break
      }

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
  migrate:generate    Generate a migration from schema diff  --table <name>
  seed                Run all seeders
  make:model <name>   Create a new model
  make:migration <n>  Create a new migration
  generate:types      Generate TypeScript types from @Column decorators
                        --models <dir>   (default: src/models)
                        --out    <file>  (default: .orbit/generated.d.ts)
  db:push             Apply schema diff to live database --tables <table1,table2>
  db:export           Export table data to JSONL format
                        --table <name>       (required) table to export
                        --output <file>      (default: {table}.jsonl)
                        --batch-size <n>     (default: 1000)
                        --where <condition>  (optional) SQL WHERE clause
  db:import           Import JSONL data into a table
                        --table <name>       (required) target table
                        --input <file.jsonl> (required) input file path
                        --batch-size <n>     (default: 500)
                        --on-conflict        skip|update|error (default: error)
  doctor              Diagnose database connection and config
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
