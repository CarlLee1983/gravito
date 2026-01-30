import { resolve } from 'node:path'
import { DB } from '../DB'
import { Grammar } from '../grammar/Grammar'
import { Migrator } from '../migration/Migrator'
import { Command } from './Command'

export class DoctorCommand extends Command {
  signature = 'doctor'
  description = 'Diagnose database connection and configuration'

  async handle(flags: Record<string, unknown>): Promise<void> {
    console.log('\n🏥 Orbit Doctor - Diagnosing your database...\n')

    const connectionCheck = () => {
      try {
        const connection = DB.connection()
        const driver = connection.getDriver().getDriverName()
        const isConnected = connection.getDriver().isConnected()

        console.log(`[Connection] Driver: ${driver}`)

        if (!isConnected) {
          return connection
            .getDriver()
            .connect()
            .then(() => console.log('✓ Connection established successfully.'))
        }

        console.log('✓ Already connected.')
        return Promise.resolve()
      } catch (error) {
        console.error('✗ Connection failed:', (error as Error).message)
        console.log('💡 Suggestion: Check your DB_* environment variables or configuration file.')
        return Promise.resolve()
      }
    }

    const migrationCheck = async () => {
      try {
        const migrationsPath = flags.path
          ? resolve(process.cwd(), flags.path as string)
          : resolve(process.cwd(), 'database/migrations')

        const migrator = new Migrator({ path: migrationsPath })
        const status = await migrator.status()

        if (status.pending.length > 0) {
          console.log(`[Migrations] ⚠ You have ${status.pending.length} pending migrations.`)
          console.log('💡 Suggestion: Run "bun orbit migrate" to apply changes.')
        } else {
          console.log('✓ All migrations are up to date.')
        }
      } catch (error) {
        console.log(`[Migrations] ⚠ Could not check migration status: ${(error as Error).message}`)
      }
    }

    const optimizationCheck = () => {
      console.log(`[Grammar] Cache Enabled: ${Grammar.useCache ? 'Yes' : 'No'}`)
      const stats = Grammar.getCacheStats()
      console.log(`[Grammar] Cache Size: ${stats.size}/${stats.maxSize}`)
    }

    await connectionCheck()
    await migrationCheck()
    optimizationCheck()

    console.log('\n✅ Diagnosis complete.\n')
  }
}
