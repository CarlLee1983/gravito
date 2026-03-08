import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { MakeCommand } from '../src/commands/MakeCommand'

describe('MakeCommand Comprehensive', () => {
  let tempDir: string
  let cmd: MakeCommand
  let exitSpy: any

  beforeEach(async () => {
    // Create a truly unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gravito-make-comp-test-'))
    cmd = new MakeCommand(path.resolve(__dirname, '../stubs'), tempDir)

    // Mock process.exit to prevent killing the test runner
    exitSpy = spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(async () => {
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true })
    exitSpy.mockRestore()
  })

  it('should create a request class', async () => {
    await cmd.run('request', 'CreateUser')

    const file = path.join(tempDir, 'src/Http/Requests/CreateUserRequest.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class CreateUserRequest extends FormRequest')
  })

  it('should create a satellite', async () => {
    await cmd.run('satellite', 'blog')

    const dir = path.join(tempDir, 'blog')
    expect(await fs.exists(dir)).toBe(true)
    expect(await fs.exists(path.join(dir, 'package.json'))).toBe(true)
    expect(await fs.exists(path.join(dir, 'src/index.ts'))).toBe(true)
  })

  it('should create an internal satellite', async () => {
    await cmd.run('satellite', 'auth', { internal: true })

    const dir = path.join(tempDir, 'satellites/auth')
    expect(await fs.exists(dir)).toBe(true)
  })

  it('should create a seeder', async () => {
    await cmd.run('seeder', 'UserSeeder')

    // MVC architecture places seeders in database/seeders/
    const file = path.join(tempDir, 'database/seeders/UserSeeder.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('export default async function seed(db: DBService)')
  })
})
