import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { MakeCommand } from '../src/commands/MakeCommand'

describe('MakeCommand', () => {
  let tempDir: string
  let cmd: MakeCommand
  let exitSpy: any

  beforeEach(async () => {
    // Create a truly unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gravito-make-test-'))
    cmd = new MakeCommand(path.resolve(__dirname, '../stubs'), tempDir)

    // Mock process.exit to prevent killing the test runner
    exitSpy = spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(async () => {
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true })
    exitSpy.mockRestore()
  })

  it('should create a controller', async () => {
    await cmd.run('controller', 'TestUser')

    const file = path.join(tempDir, 'src/http/controllers/TestUserController.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class TestUserController')
    expect(content).toContain("message: 'Hello from TestUser'")
  })

  it('should create a middleware', async () => {
    await cmd.run('middleware', 'EnsureAuth')

    const file = path.join(tempDir, 'src/http/middleware/EnsureAuthMiddleware.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('export const ensureAuth: MiddlewareHandler')
  })

  it('should create a model', async () => {
    await cmd.run('model', 'Product')

    const file = path.join(tempDir, 'src/models/Product.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class Product extends Model')
  })

  it('should create a command with default signature', async () => {
    await cmd.run('command', 'GreetCommand')

    const file = path.join(tempDir, 'src/commands/GreetCommand.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class Greet extends Command')
    expect(content).toContain("static signature = 'greet'")
  })

  it('should create a command with custom signature', async () => {
    await cmd.run('command', 'TestCommand', { command: 'app:test' })

    const file = path.join(tempDir, 'src/commands/TestCommand.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class Test extends Command')
    expect(content).toContain("static signature = 'app:test'")
  })
})
