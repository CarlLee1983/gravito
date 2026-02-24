import { describe, expect, it } from 'bun:test'
import { NovaShellError } from '../src/errors'
import { Pipeline } from '../src/Pipeline'
import { Shell } from '../src/Shell'
import { ShellCommand } from '../src/ShellCommand'

describe('Shell', () => {
  // Shell.run() tests
  describe('Shell.run', () => {
    it('should execute command with template literal', async () => {
      const result = await Shell.run`echo hello`
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('hello')
    })

    it('should auto-escape interpolations', async () => {
      const userInput = '$PATH'
      const result = await Shell.run`echo ${userInput}`
      expect(result.stdout).toBe('$PATH')
    })

    it('should return ShellCommand instance for chaining', () => {
      const cmd = Shell.run`echo test`
      expect(cmd).toBeInstanceOf(ShellCommand)
    })

    it('should support method chaining on run result', async () => {
      const result = await Shell.run`echo chained`.quiet().run()
      expect(result.success).toBe(true)
    })

    it('should handle multiple interpolations in run', async () => {
      const result = await Shell.run`echo ${'first'} ${'second'}`
      expect(result.stdout).toContain('first')
      expect(result.stdout).toContain('second')
    })
  })

  // Shell.text() tests
  describe('Shell.text', () => {
    it('should return stdout as string', async () => {
      const text = await Shell.text`echo text-output`
      expect(text).toBe('text-output')
      expect(typeof text).toBe('string')
    })

    it('should auto-escape interpolations in text', async () => {
      const dangerous = '`whoami`'
      const text = await Shell.text`echo ${dangerous}`
      expect(text).toBe('`whoami`')
    })

    it('should strip whitespace', async () => {
      const text = await Shell.text`echo "text with spaces"`
      expect(text).not.toContain('\n')
    })

    it('should handle empty output', async () => {
      const text = await Shell.text`true`
      expect(text).toBe('')
    })

    it('should throw on command failure', async () => {
      try {
        await Shell.text`false`
        expect.unreachable()
      } catch (error) {
        expect(error).toBeInstanceOf(NovaShellError)
      }
    })
  })

  // Shell.json() tests
  describe('Shell.json', () => {
    it('should parse JSON output', async () => {
      const data = await Shell.json`echo '{"key":"value"}'`
      expect(data).toEqual({ key: 'value' })
    })

    it('should handle JSON arrays', async () => {
      const arr = await Shell.json`echo '[1,2,3]'`
      expect(Array.isArray(arr)).toBe(true)
      expect(arr).toEqual([1, 2, 3])
    })

    it('should support custom type parameter', async () => {
      const data = await Shell.json<{ name: string }>`echo '{"name":"test"}'`
      expect(data.name).toBe('test')
    })

    it('should throw on invalid JSON', async () => {
      try {
        await Shell.json`echo 'invalid json'`
        expect.unreachable()
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle complex JSON structures', async () => {
      const json = '{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}'
      const data = await Shell.json`echo ${json}`
      expect(data).toEqual(JSON.parse(json))
    })
  })

  // Shell.cmd() tests
  describe('Shell.cmd', () => {
    it('should return ShellCommand instance', () => {
      const cmd = Shell.cmd`echo test`
      expect(cmd).toBeInstanceOf(ShellCommand)
    })

    it('should be identical to run method', async () => {
      const result1 = await Shell.run`echo identical`
      const result2 = await Shell.cmd`echo identical`
      expect(result1.stdout).toBe(result2.stdout)
    })

    it('should support configuration after cmd', async () => {
      const result = await Shell.cmd`echo configured`.quiet().run()
      expect(result.success).toBe(true)
    })

    it('should auto-escape in cmd', async () => {
      const result = await Shell.cmd`echo ${'test$var'}`.run()
      expect(result.stdout).toBe('test$var')
    })
  })

  // Shell.pipe() tests
  describe('Shell.pipe', () => {
    it('should create Pipeline instance', () => {
      const cmd1 = Shell.cmd`echo test`
      const cmd2 = Shell.cmd`cat`
      const pipeline = Shell.pipe(cmd1, cmd2)
      expect(pipeline).toBeInstanceOf(Pipeline)
    })

    it('should pipe multiple commands', async () => {
      const result = await Shell.pipe(
        Shell.cmd`echo -e "apple\\nbanana\\ncherry"`,
        Shell.cmd`grep a`
      ).run()

      expect(result.success).toBe(true)
      expect(result.stdout).toContain('apple')
      expect(result.stdout).toContain('banana')
    })

    it('should support .text() on pipeline', async () => {
      const text = await Shell.pipe(Shell.cmd`echo "pipe-text"`, Shell.cmd`cat`).text()

      expect(text).toBe('pipe-text')
    })

    it('should support .lines() on pipeline', async () => {
      const lines = await Shell.pipe(
        Shell.cmd`printf "line1\\nline2\\nline3"`,
        Shell.cmd`cat`
      ).lines()

      expect(lines).toEqual(['line1', 'line2', 'line3'])
    })

    it('should handle three-command pipeline', async () => {
      const result = await Shell.pipe(
        Shell.cmd`printf "c\\na\\nb"`,
        Shell.cmd`sort`,
        Shell.cmd`head -n 1`
      ).run()

      expect(result.success).toBe(true)
      expect(result.stdout).toBe('a')
    })

    it('should throw on pipeline failure', async () => {
      try {
        await Shell.pipe(Shell.cmd`echo test`, Shell.cmd`grep nonexistent`).run()
        expect.unreachable()
      } catch (error) {
        expect(error).toBeInstanceOf(NovaShellError)
      }
    })

    it('should escape interpolations in piped commands', async () => {
      const result = await Shell.pipe(Shell.cmd`echo ${'test'}`, Shell.cmd`cat`).run()

      expect(result.success).toBe(true)
      expect(result.stdout).toBe('test')
    })
  })

  // Integration tests
  describe('Shell integration', () => {
    it('should allow complex workflow', async () => {
      const result = await Shell.run`echo "hello world"`.then((r) => r.stdout.toUpperCase())

      expect(result).toBe('HELLO WORLD')
    })

    it('should mix different Shell methods', async () => {
      const data = await Shell.json`echo '{"status":"ok"}'`
      expect(data.status).toBe('ok')

      const text = await Shell.text`echo done`
      expect(text).toBe('done')
    })

    it('should handle rapid sequential commands', async () => {
      const results = await Promise.all([
        Shell.text`echo 1`,
        Shell.text`echo 2`,
        Shell.text`echo 3`,
      ])

      expect(results).toEqual(['1', '2', '3'])
    })

    it('should allow template literal nesting', async () => {
      const greeting = 'hello'
      const message = 'world'
      const result = await Shell.run`echo ${greeting} ${message}`
      expect(result.stdout).toContain('hello')
      expect(result.stdout).toContain('world')
    })
  })

  // Error handling tests
  describe('Shell error handling', () => {
    it('should throw on command failure by default', async () => {
      try {
        await Shell.text`false`
        expect.unreachable()
      } catch (error) {
        expect(error).toBeInstanceOf(NovaShellError)
      }
    })

    it('should provide error details', async () => {
      try {
        await Shell.run`exit 42`
        expect.unreachable()
      } catch (error) {
        if (error instanceof NovaShellError) {
          expect(error.exitCode).toBe(42)
          expect(error.message).toContain('42')
        } else {
          expect.unreachable()
        }
      }
    })

    it('should allow error suppression with nothrow', async () => {
      const result = await Shell.run`false`.nothrow().run()
      expect(result.success).toBe(false)
    })
  })

  // Security tests
  describe('Shell security', () => {
    it('should prevent shell injection via template interpolation', async () => {
      const payload = '$(whoami)'
      const result = await Shell.text`echo ${payload}`
      expect(result).toBe('$(whoami)')
      expect(result).not.toContain('root')
    })

    it('should escape semicolon injections', async () => {
      const payload = 'test; rm -rf /'
      const result = await Shell.text`echo ${payload}`
      expect(result).toBe('test; rm -rf /')
    })

    it('should handle quote injections safely', async () => {
      const payload = "' || echo injected || '"
      const result = await Shell.text`echo ${payload}`
      expect(result).toContain("'")
    })

    it('should handle pipe injections safely', async () => {
      const payload = 'test | whoami'
      const result = await Shell.text`echo ${payload}`
      expect(result).toBe('test | whoami')
    })
  })
})
