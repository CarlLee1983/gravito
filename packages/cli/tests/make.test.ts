import { afterEach, describe, expect, it } from 'bun:test'
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
  const cmd = new MakeCommand()
  // We need to change cwd for the duration of the test, or mock it.
  // MakeCommand uses process.cwd(). Let's chdir.

  const originalCwd = process.cwd()

  it('should create a controller', async () => {
    // Setup
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('controller', 'TestUser')

    const file = path.join(TEST_DIR, 'src/controllers/TestUserController.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class TestUserController')
    expect(content).toContain("message: 'TestUser index'")
  })

  it('should create a middleware', async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('middleware', 'EnsureAuth')

    const file = path.join(TEST_DIR, 'src/middleware/ensureAuth.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('export const ensureAuth: MiddlewareHandler')
  })

  it('should create a model', async () => {
    await fs.mkdir(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    await cmd.run('model', 'Product')

    const file = path.join(TEST_DIR, 'src/models/Product.ts')
    expect(await fs.exists(file)).toBe(true)

    const content = await fs.readFile(file, 'utf-8')
    expect(content).toContain('class Product extends Model')
  })

  afterEach(async () => {
    // Cleanup
    process.chdir(originalCwd)
    await fs.rm(TEST_DIR, { recursive: true, force: true })
  })
})
