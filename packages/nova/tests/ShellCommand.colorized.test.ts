import { describe, expect, it } from 'bun:test'
import { ShellCommand } from '../src/ShellCommand'

describe('ShellCommand.colorized()', () => {
  describe('colorized method', () => {
    it('should create a colorized command', () => {
      const cmd = new ShellCommand(['echo ', ''], ['hello'])
      const colorizedCmd = cmd.colorized()
      expect(colorizedCmd).toBeDefined()
      expect(colorizedCmd).toBeInstanceOf(ShellCommand)
    })

    it('should be chainable', () => {
      const cmd = new ShellCommand(['echo ', ''], ['hello'])
      const result = cmd.colorized().quiet()
      expect(result).toBeInstanceOf(ShellCommand)
    })

    it('should accept color config', () => {
      const cmd = new ShellCommand(['echo ', ''], ['hello'])
      const colorConfig = {
        enabled: true,
        scheme: {
          success: '#00ff00',
          error: '#ff0000',
        },
      }
      const colorizedCmd = cmd.colorized(colorConfig)
      expect(colorizedCmd).toBeDefined()
    })

    it('should not mutate original command', () => {
      const cmd = new ShellCommand(['echo ', ''], ['hello'])
      const colorizedCmd = cmd.colorized()
      expect(cmd).not.toBe(colorizedCmd)
    })
  })

  describe('immutability', () => {
    it('should preserve state when chaining', () => {
      const cmd = new ShellCommand(['echo ', ''], ['hello']).cwd('/tmp')
      const colorized = cmd.colorized()
      expect(colorized).toBeInstanceOf(ShellCommand)
    })

    it('should allow multiple method calls', () => {
      const cmd = new ShellCommand(['ls ', ''], ['/tmp'])
      const result = cmd.cwd('/home').quiet().nothrow().colorized()
      expect(result).toBeInstanceOf(ShellCommand)
    })

    it('should not share internal state between clones', () => {
      const cmd = new ShellCommand(['echo ', ''], ['test'])
      const cmd1 = cmd.quiet()
      const cmd2 = cmd.colorized()
      // Both should be separate instances
      expect(cmd1).not.toBe(cmd2)
    })
  })

  describe('order independence', () => {
    it('should work before quiet', () => {
      const cmd = new ShellCommand(['echo ', ''], ['test'])
      const result = cmd.colorized().quiet()
      expect(result).toBeInstanceOf(ShellCommand)
    })

    it('should work after quiet', () => {
      const cmd = new ShellCommand(['echo ', ''], ['test'])
      const result = cmd.quiet().colorized()
      expect(result).toBeInstanceOf(ShellCommand)
    })

    it('should work with other methods', () => {
      const cmd = new ShellCommand(['echo ', ''], ['test'])
      const result = cmd.cwd('/tmp').env({ PATH: '/usr/bin' }).timeout(5000).nothrow().colorized()
      expect(result).toBeInstanceOf(ShellCommand)
    })
  })

  describe('color config handling', () => {
    it('should accept ColorConfig with enabled flag', () => {
      const cmd = new ShellCommand(['echo ', ''], ['test'])
      const result = cmd.colorized({ enabled: true })
      expect(result).toBeDefined()
    })

    it('should accept ColorConfig with scheme', () => {
      const cmd = new ShellCommand(['echo ', ''], ['test'])
      const result = cmd.colorized({
        scheme: {
          success: '#00ff00',
          error: '#ff0000',
          running: '#0099ff',
          useSymbols: true,
        },
      })
      expect(result).toBeDefined()
    })

    it('should accept complete ColorConfig', () => {
      const cmd = new ShellCommand(['echo ', ''], ['test'])
      const result = cmd.colorized({
        enabled: true,
        scheme: {
          success: '#00cc66',
          error: '#ff3333',
          stderr: '#ffaa00',
          label: '#0099ff',
          running: '#0099ff',
          useSymbols: true,
        },
      })
      expect(result).toBeDefined()
    })

    it('should accept undefined config', () => {
      const cmd = new ShellCommand(['echo ', ''], ['test'])
      const result = cmd.colorized(undefined)
      expect(result).toBeDefined()
    })
  })

  describe('PromiseLike interface', () => {
    it('colorized command should remain PromiseLike', async () => {
      const cmd = new ShellCommand(['echo ', ''], ['hello']).colorized()
      // Should not throw when used as promise-like
      expect(cmd).toHaveProperty('then')
      expect(cmd).toHaveProperty('catch')
    })
  })

  describe('execution with colorized', () => {
    it('should execute colorized command without errors', async () => {
      const cmd = new ShellCommand(['echo ', ''], ['hello']).colorized().quiet()
      const result = await cmd.run()
      expect(result.success).toBe(true)
      expect(result.stdout).toContain('hello')
    })

    it('should return ShellResult on execution', async () => {
      const cmd = new ShellCommand(['echo ', ''], ['test']).colorized()
      const result = await cmd.run()
      expect(result).toHaveProperty('exitCode')
      expect(result).toHaveProperty('stdout')
      expect(result).toHaveProperty('stderr')
      expect(result).toHaveProperty('success')
    })

    it('should preserve nothrow with colorized', async () => {
      const cmd = new ShellCommand(['false', ''], []).nothrow().colorized().quiet()
      const result = await cmd.run()
      expect(result.success).toBe(false)
      expect(result.exitCode).not.toBe(0)
    })
  })

  describe('method chaining order', () => {
    it('colorized at beginning', async () => {
      const cmd = new ShellCommand(['echo ', ''], ['test']).colorized().cwd('/tmp').quiet()
      expect(cmd).toBeInstanceOf(ShellCommand)
      const result = await cmd.run()
      expect(result.success).toBe(true)
    })

    it('colorized at end', async () => {
      const cmd = new ShellCommand(['echo ', ''], ['test']).cwd('/tmp').quiet().colorized()
      expect(cmd).toBeInstanceOf(ShellCommand)
      const result = await cmd.run()
      expect(result.success).toBe(true)
    })

    it('colorized in middle', async () => {
      const cmd = new ShellCommand(['echo ', ''], ['test']).cwd('/tmp').colorized().quiet()
      expect(cmd).toBeInstanceOf(ShellCommand)
      const result = await cmd.run()
      expect(result.success).toBe(true)
    })
  })
})
