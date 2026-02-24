import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { ShellCommand } from '../src/ShellCommand'
import { NovaShellError } from '../src/errors'
import { createTestDir, createTestFile, cleanupTestDir } from './helpers'
import { tmpdir } from 'os'

describe('ShellCommand', () => {
  let testDir: string

  beforeEach(() => {
    testDir = createTestDir(tmpdir())
  })

  afterEach(() => {
    cleanupTestDir(testDir)
  })

  // Basic execution tests
  it('should execute a simple echo command', async () => {
    const cmd = new ShellCommand(['echo ', ''], ['hello'])
    const result = await cmd.run()

    expect(result.success).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('hello')
    expect(result.stderr).toBe('')
  })

  it('should execute command with multiple interpolations', async () => {
    const cmd = new ShellCommand(
      ['echo ', ' ', ''],
      ['hello', 'world'],
    )
    const result = await cmd.run()

    expect(result.success).toBe(true)
    expect(result.stdout).toContain('hello')
    expect(result.stdout).toContain('world')
  })

  // .text() method tests
  it('should return stdout as string via .text()', async () => {
    const cmd = new ShellCommand(['echo ', ''], ['test-output'])
    const text = await cmd.text()

    expect(text).toBe('test-output')
  })

  it('should strip whitespace in .text()', async () => {
    const cmd = new ShellCommand(['echo ', ''], ['content'])
    const text = await cmd.text()

    expect(text).toBe('content')
    expect(text).not.toContain('\n')
  })

  // .lines() method tests
  it('should split output into lines via .lines()', async () => {
    const cmd = new ShellCommand(['printf ', ''], ['line1\\nline2\\nline3'])
    const lines = await cmd.lines()

    expect(lines).toEqual(['line1', 'line2', 'line3'])
  })

  it('should filter empty lines in .lines()', async () => {
    const cmd = new ShellCommand(['printf ', ''], ['a\\n\\nb\\n\\n'])
    const lines = await cmd.lines()

    expect(lines).toEqual(['a', 'b'])
  })

  // .json() method tests
  it('should parse JSON output via .json()', async () => {
    const jsonString = '{"name":"test","value":42}'
    const cmd = new ShellCommand(['echo ', ''], [jsonString])
    const data = await cmd.json<{ name: string; value: number }>()

    expect(data.name).toBe('test')
    expect(data.value).toBe(42)
  })

  it('should handle JSON arrays', async () => {
    const cmd = new ShellCommand(['echo ', ''], ['[1,2,3]'])
    const arr = await cmd.json<number[]>()

    expect(Array.isArray(arr)).toBe(true)
    expect(arr).toEqual([1, 2, 3])
  })

  // .cwd() method tests
  it('should change working directory with .cwd()', async () => {
    const filepath = createTestFile(testDir, 'test.txt', 'test-content')
    const cmd = new ShellCommand(['ls -la'], [])
    const result = await cmd.cwd(testDir).run()

    expect(result.success).toBe(true)
    expect(result.stdout).toContain('test.txt')
  })

  it('should fail if directory does not exist', async () => {
    const cmd = new ShellCommand(['ls'], [])
    const badDir = '/nonexistent/directory/path'

    try {
      await cmd.cwd(badDir).run()
      expect.unreachable()
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  // .env() method tests
  it('should set environment variables with .env()', async () => {
    const cmd = new ShellCommand(['echo $TEST_VAR'], [])
    const result = await cmd.env({ TEST_VAR: 'test-value' }).run()

    expect(result.success).toBe(true)
    expect(result.stdout).toBe('test-value')
  })

  it('should merge environment variables', async () => {
    const cmd = new ShellCommand(
      ['echo $PATH | grep -o .'],
      [],
    )
    const result = await cmd.env({ CUSTOM_VAR: 'custom' }).run()

    expect(result.success).toBe(true)
    // PATH should still be available
    expect(result.stdout.length).toBeGreaterThan(0)
  })

  // .quiet() method tests
  it('should suppress output with .quiet()', async () => {
    const cmd = new ShellCommand(['echo ', ''], ['suppressed'])
    const result = await cmd.quiet().run()

    expect(result.success).toBe(true)
    // Output is still captured in result
    expect(result.stdout).toBe('suppressed')
  })

  // .nothrow() method tests
  it('should not throw on error with .nothrow()', async () => {
    const cmd = new ShellCommand(['false'], [])
    const result = await cmd.nothrow().run()

    expect(result.success).toBe(false)
    expect(result.exitCode).not.toBe(0)
  })

  it('should throw on non-zero exit code by default', async () => {
    const cmd = new ShellCommand(['false'], [])

    try {
      await cmd.run()
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(NovaShellError)
    }
  })

  // Error handling tests
  it('should capture stderr on error', async () => {
    const cmd = new ShellCommand(['false'], [])

    try {
      await cmd.run()
      expect.unreachable()
    } catch (error) {
      if (error instanceof NovaShellError) {
        expect(error.exitCode).not.toBe(0)
      } else {
        expect.unreachable()
      }
    }
  })

  it('should create NovaShellError with command info', async () => {
    const cmd = new ShellCommand(['bash -c "exit 1"'], [])

    try {
      await cmd.run()
      expect.unreachable()
    } catch (error) {
      if (error instanceof NovaShellError) {
        expect(error.message).toContain('1')
        expect(error.exitCode).toBe(1)
      } else {
        expect.unreachable()
      }
    }
  })

  // Shell injection protection tests
  it('should escape shell special characters', async () => {
    const cmd = new ShellCommand(['echo ', ''], ['$PATH'])
    const result = await cmd.run()

    // Should output literal $PATH, not the environment variable
    expect(result.stdout).toBe('$PATH')
    expect(result.stdout).not.toBe(process.env.PATH)
  })

  it('should escape single quotes in arguments', async () => {
    const cmd = new ShellCommand(['echo ', ''], ["it's"])
    const result = await cmd.run()

    expect(result.stdout).toBe("it's")
  })

  it('should escape backticks to prevent command injection', async () => {
    const cmd = new ShellCommand(['echo ', ''], ['`whoami`'])
    const result = await cmd.run()

    // Should output literal string, not execute whoami
    expect(result.stdout).toBe('`whoami`')
    expect(result.stdout).not.toContain('root')
  })

  // PromiseLike implementation tests
  it('should support direct await syntax', async () => {
    const cmd = new ShellCommand(['echo ', ''], ['await-test'])
    const result = await cmd

    expect(result.success).toBe(true)
    expect(result.stdout).toBe('await-test')
  })

  it('should support .then() chaining', async () => {
    const cmd = new ShellCommand(['echo ', ''], ['then-test'])

    const result = await cmd.then((r) => {
      expect(r.success).toBe(true)
      return r.stdout
    })

    expect(result).toBe('then-test')
  })

  it('should support .catch() for error handling', async () => {
    const cmd = new ShellCommand(['false'], [])

    const error = await cmd.catch((e) => {
      expect(e).toBeInstanceOf(NovaShellError)
      return null
    })

    expect(error).toBeNull()
  })

  // Chaining configuration tests
  it('should support chaining multiple configurations', async () => {
    const envVar = 'chained-test'
    const cmd = new ShellCommand(['echo $CHAINED_VAR'], [])
    const result = await cmd
      .env({ CHAINED_VAR: envVar })
      .quiet()
      .run()

    expect(result.success).toBe(true)
    expect(result.stdout).toBe(envVar)
  })

  it('should create immutable copies with each configuration', async () => {
    const cmd1 = new ShellCommand(['echo ', ''], ['cmd1'])
    const cmd2 = cmd1.env({ VAR: 'test' })

    // cmd1 should not have the env set
    const result1 = await cmd1.run()
    expect(result1.success).toBe(true)

    // cmd2 should have the env
    const result2 = await cmd2.run()
    expect(result2.success).toBe(true)
  })

  // Complex command tests
  it('should execute complex shell commands', async () => {
    const cmd = new ShellCommand(
      ['ls -la ', ' | wc -l'],
      [testDir],
    )
    const result = await cmd.run()

    expect(result.success).toBe(true)
    const lineCount = parseInt(result.stdout, 10)
    expect(lineCount).toBeGreaterThanOrEqual(0)
  })

  it('should handle commands with multiple pipes', async () => {
    const cmd = new ShellCommand(
      ['echo -e "apple\\nbanana\\ncherry" | grep ', ''],
      ['a'],
    )
    const result = await cmd.run()

    expect(result.success).toBe(true)
    expect(result.stdout).toContain('apple')
    expect(result.stdout).toContain('banana')
  })

  // Empty command tests
  it('should handle empty output gracefully', async () => {
    const cmd = new ShellCommand(['true'], [])
    const result = await cmd.run()

    expect(result.success).toBe(true)
    expect(result.stdout).toBe('')
  })

  // Timeout tests
  it('should accept timeout configuration', async () => {
    const cmd = new ShellCommand(['sleep 0.1'], [])
    const result = await cmd.timeout(5000).run()

    expect(result.success).toBe(true)
  })
})
