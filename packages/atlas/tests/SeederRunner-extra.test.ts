import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { SeederRunner } from '../src/seed'

const FIXTURES_DIR = join(process.cwd(), 'tests/fixtures/seeders')

describe('SeederRunner Integration', () => {
  beforeAll(async () => {
    await mkdir(FIXTURES_DIR, { recursive: true })

    // Create a valid seeder
    await writeFile(
      join(FIXTURES_DIR, 'UserSeeder.ts'),
      `
      export default class UserSeeder {
        async run() {
          // console.log('UserSeeder ran')
        }
      }
      `
    )

    // Create another valid seeder (named export)
    await writeFile(
      join(FIXTURES_DIR, 'PostSeeder.ts'),
      `
      export class PostSeeder {
        async run() {
          // console.log('PostSeeder ran')
        }
      }
      `
    )

    // Create one that might fail if called (for error testing)
    await writeFile(
      join(FIXTURES_DIR, 'ErrorSeeder.ts'),
      `
      export default class ErrorSeeder {
        async run() {
          throw new Error('Seeder failed')
        }
      }
      `
    )
  })

  afterAll(async () => {
    await rm(FIXTURES_DIR, { recursive: true, force: true })
  })

  it('should discover and run all valid seeders', async () => {
    // Only run User & Post, ignore ErrorSeeder for this test
    // But runner.run() runs ALL.
    // So we should probably specificy path to a subdir or just filter?
    // The runner.run() doesn't filter.

    // Let's create a separate subdir for "clean" run
    const cleanDir = join(FIXTURES_DIR, 'clean')
    await mkdir(cleanDir, { recursive: true })

    await writeFile(
      join(cleanDir, 'A_Seeder.ts'),
      `export default class A_Seeder { async run() {} }`
    )
    await writeFile(
      join(cleanDir, 'B_Seeder.ts'),
      `export default class B_Seeder { async run() {} }`
    )

    const runner = new SeederRunner({ path: cleanDir })
    const executed = await runner.run()

    expect(executed).toHaveLength(2)
    expect(executed).toContain('A_Seeder')
    expect(executed).toContain('B_Seeder')
  })

  it('should call specific seeder', async () => {
    const runner = new SeederRunner({ path: FIXTURES_DIR })

    // Should not throw
    await runner.call('UserSeeder')
    await runner.call('PostSeeder')
  })

  it('should call multiple seeders', async () => {
    const runner = new SeederRunner({ path: FIXTURES_DIR })
    await runner.callMultiple(['UserSeeder', 'PostSeeder'])
  })

  it('should throw when seeder not found', async () => {
    const runner = new SeederRunner({ path: FIXTURES_DIR })
    expect(runner.call('MissingSeeder')).rejects.toThrow('not found')
  })

  it('should propagate errors from seeder', async () => {
    const runner = new SeederRunner({ path: FIXTURES_DIR })
    expect(runner.call('ErrorSeeder')).rejects.toThrow('Seeder failed')
  })

  it('should check if seeder exists', async () => {
    const runner = new SeederRunner({ path: FIXTURES_DIR })
    expect(await runner.has('UserSeeder')).toBe(true)
    expect(await runner.has('MissingSeeder')).toBe(false)
  })
})
