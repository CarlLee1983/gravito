import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { MakeCommand } from '../src/commands/MakeCommand'

// Mock process.cwd to a temp dir
const TEST_DIR = path.resolve(__dirname, 'temp_make_test')

// Subclass to override stubs path and relative path logic if needed,
// but MakeCommand uses __dirname relative resolution.
// Since tests are in packages/cli/tests, the CLI source is in packages/cli/src
// The stubs are in packages/cli/stubs
// MakeCommand uses packages/cli/src/commands/MakeCommand.ts -> __dirname is .../src/commands
// resolve(..., '../../stubs') -> .../packages/cli/stubs. Correct.

describe('MakeCommand', () => {
  const cmd = new MakeCommand(path.resolve(__dirname, '../stubs'))
  // We need to change cwd for the duration of the test, or mock it.
  // MakeCommand uses process.cwd(). Let's chdir.

  const originalCwd = process.cwd()
  let exitSpy: any

  beforeEach(() => {
    // Mock process.exit to prevent killing the test runner
    exitSpy = spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(async () => {
    // Cleanup
    process.chdir(originalCwd)
    await fs.rm(TEST_DIR, { recursive: true, force: true })
    exitSpy.mockRestore()
  })

  it('should create a controller', async () => {
    // Setup
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('controller', 'TestUser')

    const file = path.join(TEST_DIR, 'src/Http/Controllers/TestUserController.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class TestUserController')
    expect(content).toContain("message: 'Hello from TestUser'")
  })

  it('should create a middleware', async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('middleware', 'EnsureAuth')

    const file = path.join(TEST_DIR, 'src/Http/Middleware/EnsureAuthMiddleware.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('export const ensureAuth: MiddlewareHandler')
  })

  it('should create a model', async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('model', 'Product')

    const file = path.join(TEST_DIR, 'src/Models/Product.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class Product extends Model')
  })

  it('should create a command with default signature', async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('command', 'GreetCommand')

    const file = path.join(TEST_DIR, 'src/commands/GreetCommand.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class Greet extends Command')
    expect(content).toContain("static signature = 'greet'")
  })

  it('should create a command with custom signature', async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('command', 'TestCommand', { command: 'app:test' })

    const file = path.join(TEST_DIR, 'src/commands/TestCommand.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class Test extends Command')
    expect(content).toContain("static signature = 'app:test'")
  })

  afterEach(async () => {
    // Cleanup
    process.chdir(originalCwd)
    await fs.rm(TEST_DIR, { recursive: true, force: true })
  })
})
