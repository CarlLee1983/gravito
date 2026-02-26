import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { MakeCommand } from '../src/commands/MakeCommand'

// Use a distinct temp dir for comprehensive tests
const TEST_DIR = path.resolve(__dirname, 'temp_make_comp')

describe('MakeCommand Comprehensive', () => {
  const cmd = new MakeCommand(path.resolve(__dirname, '../stubs'))
  const originalCwd = process.cwd()
  let exitSpy: any

  // Mock console to keep test output clean
  // const consoleLog = spyOn(console, 'log').mockImplementation(() => {})
  // const consoleError = spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    exitSpy = spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    await fs.rm(TEST_DIR, { recursive: true, force: true })
    // consoleLog.mockClear()
    exitSpy.mockRestore()
  })

  it('should create a request class', async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('request', 'CreateUser')

    const file = path.join(TEST_DIR, 'src/Http/Requests/CreateUserRequest.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class CreateUserRequest extends FormRequest')
  })

  it('should create a satellite', async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('satellite', 'blog')

    const dir = path.join(TEST_DIR, 'blog')
    expect(await fs.exists(dir)).toBe(true)
    expect(await fs.exists(path.join(dir, 'package.json'))).toBe(true)
    expect(await fs.exists(path.join(dir, 'src/index.ts'))).toBe(true)
  })

  it('should create an internal satellite', async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('satellite', 'auth', { internal: true })

    const dir = path.join(TEST_DIR, 'satellites/auth')
    expect(await fs.exists(dir)).toBe(true)
  })

  it('should create a seeder', async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('seeder', 'UserSeeder')

    // MVC architecture places seeders in database/seeders/
    const file = path.join(TEST_DIR, 'database/seeders/UserSeeder.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('export default async function seed(db: DBService)')
  })

  // Testing make:model --all logic requires invoking the CLI action handler logic
  // which is in index.ts, not MakeCommand directly.
  // However, MakeCommand.run('model') just makes the model.
  // The logic for --all is in the CLI definition in index.ts.
  // We can't easily test index.ts without refactoring it to export the action handlers.

  // But we can test MakeCommand's ability to handle different types.
})
