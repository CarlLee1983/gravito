import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Migrator } from '../src/migration/Migrator'

function createMigrationFile(dir: string, name: string, label: string) {
  const filePath = join(dir, `${name}.js`)
  const contents = `export default class Migration {
    async up() { globalThis.__migrationLog.push('up:${label}') }
    async down() { globalThis.__migrationLog.push('down:${label}') }
  }`
  writeFileSync(filePath, contents)
}

describe('Migrator', () => {
  const log: string[] = []
  ;(globalThis as any).__migrationLog = log

  afterEach(() => {
    log.length = 0
  })

  it('runs and rolls back migrations', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-migrations-'))

    createMigrationFile(dir, '20240101_create_users', 'users')
    createMigrationFile(dir, '20240102_create_posts', 'posts')

    const ran: string[] = []
    const logged: Array<{ migration: string; batch: number }> = []

    const repo = {
      createRepository: async () => {},
      getRan: async () => [...ran],
      getNextBatchNumber: async () => (logged.length === 0 ? 1 : 2),
      log: async (migration: string, batch: number) => {
        ran.push(migration)
        logged.push({ migration, batch })
      },
      getLast: async () => {
        if (logged.length === 0) {
          return []
        }
        const max = Math.max(...logged.map((entry) => entry.batch))
        return logged.filter((entry) => entry.batch === max)
      },
      delete: async (migration: string) => {
        const index = ran.indexOf(migration)
        if (index >= 0) {
          ran.splice(index, 1)
        }
      },
      getMigrations: async (batch: number) => logged.filter((entry) => entry.batch === batch),
      getLastBatchNumber: async () => (logged.length === 0 ? 0 : 1),
    }

    const migrator = new Migrator({ path: dir })
    ;(migrator as any).repository = repo

    const result = await migrator.run()
    expect(result.migrations).toEqual(['20240101_create_users', '20240102_create_posts'])
    expect(log).toEqual(['up:users', 'up:posts'])

    await migrator.runUp('20240102_create_posts').catch((err: Error) => {
      expect(err.message).toContain('already been run')
    })

    const status = await migrator.status()
    expect(status.ran).toEqual(['20240101_create_users', '20240102_create_posts'])

    const rollback = await migrator.rollback()
    expect(rollback.migrations).toEqual(['20240101_create_users', '20240102_create_posts'])
    expect(log).toContain('down:users')
    expect(log).toContain('down:posts')

    await migrator.reset()
    await migrator.fresh()
    await migrator.refresh()

    rmSync(dir, { recursive: true, force: true })
  })
})
