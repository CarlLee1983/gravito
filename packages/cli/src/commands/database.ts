import fs from 'node:fs/promises'
import path from 'node:path'
import pc from 'picocolors'
import { DrizzleMigrationDriver, type MigrationResult } from './DrizzleMigrationDriver'

/**
 * Generate a new migration file
 */
export async function makeMigration(name: string) {
  const driver = new DrizzleMigrationDriver()
  const result = await driver.generate(name)

  if (result.success) {
    console.log(pc.green(`✅ ${result.message}`))
  } else {
    console.error(pc.red(`❌ ${result.error}`))
    process.exit(1)
  }
}

/**
 * Run pending migrations
 */
export async function migrate(options: { fresh?: boolean }) {
  console.log(pc.cyan('🔄 Running migrations...'))

  const driver = new DrizzleMigrationDriver()

  let result: MigrationResult
  if (options.fresh) {
    console.log(pc.yellow('⚠️ Fresh migration: dropping all tables...'))
    result = await driver.fresh()
  } else {
    result = await driver.migrate()
  }

  if (result.success) {
    console.log(pc.green(`✅ ${result.message}`))
  } else {
    console.error(pc.red(`❌ ${result.message}`))
    if (result.error) {
      console.error(pc.gray(result.error))
    }
    process.exit(1)
  }
}

/**
 * Show migration status
 */
export async function migrateStatus() {
  const driver = new DrizzleMigrationDriver()
  const status = await driver.status()

  console.log(pc.bold('\n📋 Migration Status'))
  console.log(pc.gray('─'.repeat(40)))

  if (status.applied.length === 0) {
    console.log(pc.yellow('No migrations found.'))
  } else {
    console.log(pc.bold('Applied Migrations:'))
    for (const m of status.applied) {
      console.log(pc.green(`  ✓ ${m}`))
    }
  }

  if (status.pending.length > 0) {
    console.log(pc.bold('\nPending Migrations:'))
    for (const m of status.pending) {
      console.log(pc.yellow(`  ○ ${m}`))
    }
  }

  console.log('')
}

/**
 * Run database seeders
 */
export async function dbSeed(options: { class?: string }) {
  console.log(pc.cyan('🌱 Running seeders...'))

  const seedersDir = path.join(process.cwd(), 'src/database/seeders')

  try {
    // Check if directory exists
    await fs.access(seedersDir)

    // Get seeder files
    const files = await fs.readdir(seedersDir)
    const seeders = files.filter((f) => f.endsWith('.ts'))

    if (options.class) {
      const className = options.class
      // Run specific seeder
      const seederFile = seeders.find((f) => f.includes(className))
      if (!seederFile) {
        console.error(pc.red(`❌ Seeder not found: ${className}`))
        process.exit(1)
      }
      await runSeeder(path.join(seedersDir, seederFile))
    } else {
      // Run all seeders
      for (const seeder of seeders) {
        await runSeeder(path.join(seedersDir, seeder))
      }
    }

    console.log(pc.green('✅ Seeding complete'))
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'ENOENT') {
      console.log(pc.yellow('No seeders directory found. Run `gravito make:seeder` first.'))
    } else {
      const message = error instanceof Error ? error.message : String(err)
      console.error(pc.red(`❌ Seeding failed: ${message}`))
      process.exit(1)
    }
  }
}

/**
 * Deploy database (health check + migrations).
 */
export async function dbDeploy(options: {
  entry?: string
  noMigrations?: boolean
  seeds?: boolean
  skipHealthCheck?: boolean
  noValidate?: boolean
}) {
  console.log(pc.cyan('🚀 Deploying database...'))

  try {
    const entryFile = options.entry ?? 'src/index.ts'
    const entry = await import(path.join(process.cwd(), entryFile))
    const core = entry.default?.core || entry.core

    if (!core) {
      throw new Error('Could not find core instance')
    }

    const db = core.services.get('db') || core.container.make('db')
    if (!db) {
      throw new Error('Database service not found')
    }

    if (typeof db.deploy !== 'function') {
      throw new Error('Database service does not support deploy()')
    }

    const result = await db.deploy({
      runMigrations: !options.noMigrations,
      runSeeds: !!options.seeds,
      skipHealthCheck: !!options.skipHealthCheck,
      validateBeforeDeploy: !options.noValidate,
    })

    if (result.success) {
      console.log(pc.green('✅ Database deployment complete'))
    } else {
      console.error(pc.red(`❌ Database deployment failed: ${result.error}`))
      process.exit(1)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(pc.red(`❌ Database deployment failed: ${message}`))
    process.exit(1)
  }
}

/**
 * Generate schema lock file by scanning models
 */
export async function schemaLock(options: { entry?: string; lockPath?: string }) {
  console.log(pc.cyan('🔒 Generating schema lock...'))

  try {
    const entryFile = options.entry ?? 'src/index.ts'
    const entry = await import(path.join(process.cwd(), entryFile))
    const core = entry.default?.core || entry.core

    if (!core) {
      throw new Error('Could not find core instance to access SchemaRegistry')
    }

    const { Model, SchemaRegistry } = await import('@gravito/orbit-database')
    const modelsDir = path.join(process.cwd(), 'src/models')
    const files = await fs.readdir(modelsDir)
    const tables: string[] = []

    for (const file of files) {
      if (file.endsWith('.ts')) {
        const modelModule = await import(path.join(modelsDir, file))
        const modelClass = Object.values(modelModule).find(
          (m: any) => m && m.prototype instanceof Model
        ) as any

        if (modelClass && modelClass.table) {
          tables.push(modelClass.table)
        }
      }
    }

    if (tables.length === 0) {
      console.log(pc.yellow('⚠️ No models found in src/models.'))
      return
    }

    const registry = SchemaRegistry.getInstance()

    await registry.saveToLock(tables, options.lockPath)

    console.log(pc.green(`✅ Schema lock generated for ${tables.length} tables: ${tables.join(', ')}`))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(pc.red(`❌ Schema lock failed: ${message}`))
    process.exit(1)
  }
}

/**
 * Refresh schema cache for all models
 */
export async function schemaRefresh(options: { entry?: string }) {
  console.log(pc.cyan('🔄 Refreshing schemas...'))

  try {
    const entryFile = options.entry ?? 'src/index.ts'
    const entry = await import(path.join(process.cwd(), entryFile))
    const core = entry.default?.core || entry.core

    if (!core) {
      throw new Error('Could not find core instance')
    }

    const { SchemaRegistry } = await import('@gravito/orbit-database')
    const registry = SchemaRegistry.getInstance()

    registry.invalidateAll()
    console.log(pc.green('✅ Schema cache invalidated. Next access will re-sniff.'))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(pc.red(`❌ Schema refresh failed: ${message}`))
    process.exit(1)
  }
}

async function runSeeder(filepath: string) {
  const filename = path.basename(filepath)
  console.log(pc.gray(`  Running ${filename}...`))

  try {
    // Dynamic import the entry file to get core
    const entry = await import(path.join(process.cwd(), 'src/index.ts'))
    const core = entry.default?.core || entry.core

    if (!core) {
      throw new Error('Could not find core instance')
    }

    const db = core.services.get('db') || core.container.make('db')
    if (!db) {
      throw new Error('Database service not found')
    }

    // Import and run seeder
    const seeder = await import(filepath)
    const seedFn = seeder.default || seeder.seed
    await seedFn(db)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(pc.red(`  Failed: ${message}`))
    throw err
  }
}
