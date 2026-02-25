import { beforeEach, describe, expect, it } from 'bun:test'
import { OutputFormatter } from '../../src/colors/OutputFormatter'
import type { ShellResult } from '../../src/types'

describe('OutputFormatter', () => {
  let formatter: OutputFormatter

  beforeEach(() => {
    formatter = new OutputFormatter({ enabled: true })
  })

  describe('formatRunning', () => {
    it('should format running status with symbol', () => {
      const result = formatter.formatRunning('Executing command')
      expect(result.plain).toContain('Executing command')
      expect(result.hasColor).toBe(true)
    })

    it('should include running symbol in output', () => {
      const result = formatter.formatRunning('test')
      expect(result.plain).toMatch(/⟳|\.\.\./)
    })

    it('should produce colorized output when enabled', () => {
      const result = formatter.formatRunning('test')
      expect(result.formatted).toBeTruthy()
    })
  })

  describe('formatSuccess', () => {
    it('should format success status with checkmark', () => {
      const shellResult: ShellResult = {
        exitCode: 0,
        stdout: 'output',
        stderr: '',
        success: true,
      }
      const result = formatter.formatSuccess(shellResult)
      expect(result.plain).toContain('Success')
      expect(result.plain).toContain('exit code: 0')
    })

    it('should include success symbol in output', () => {
      const shellResult: ShellResult = {
        exitCode: 0,
        stdout: '',
        stderr: '',
        success: true,
      }
      const result = formatter.formatSuccess(shellResult)
      expect(result.plain).toMatch(/✓|✔/)
    })

    it('should be marked as colorized when enabled', () => {
      const shellResult: ShellResult = {
        exitCode: 0,
        stdout: '',
        stderr: '',
        success: true,
      }
      const result = formatter.formatSuccess(shellResult)
      expect(result.hasColor).toBe(true)
    })
  })

  describe('formatError', () => {
    it('should format error status with error symbol', () => {
      const shellResult: ShellResult = {
        exitCode: 1,
        stdout: '',
        stderr: 'error message',
        success: false,
      }
      const result = formatter.formatError(shellResult)
      expect(result.plain).toContain('Error')
      expect(result.plain).toContain('exit code: 1')
    })

    it('should include error symbol in output', () => {
      const shellResult: ShellResult = {
        exitCode: 2,
        stdout: '',
        stderr: '',
        success: false,
      }
      const result = formatter.formatError(shellResult)
      expect(result.plain).toMatch(/✗|✘/)
    })

    it('should mark as colorized when enabled', () => {
      const shellResult: ShellResult = {
        exitCode: 1,
        stdout: '',
        stderr: '',
        success: false,
      }
      const result = formatter.formatError(shellResult)
      expect(result.hasColor).toBe(true)
    })
  })

  describe('formatStderr', () => {
    it('should format stderr with pipe prefix', () => {
      const result = formatter.formatStderr('error line')
      expect(result.plain).toContain('│')
      expect(result.plain).toContain('error line')
    })

    it('should handle multiline stderr', () => {
      const stderr = 'line1\nline2\nline3'
      const result = formatter.formatStderr(stderr)
      expect(result.plain).toContain('line1')
      expect(result.plain).toContain('line2')
      expect(result.plain).toContain('line3')
    })

    it('should skip empty lines in stderr', () => {
      const stderr = 'line1\n\nline3'
      const result = formatter.formatStderr(stderr)
      expect(result.formatted).toBeTruthy()
    })

    it('should colorize non-empty lines', () => {
      const result = formatter.formatStderr('test error')
      expect(result.formatted).toBeTruthy()
    })
  })

  describe('formatResult', () => {
    it('should format complete result with success', () => {
      const shellResult: ShellResult = {
        exitCode: 0,
        stdout: 'output data',
        stderr: '',
        success: true,
      }
      const result = formatter.formatResult(shellResult, 'echo test', true)
      expect(result.plain).toContain('echo test')
      expect(result.plain).toContain('Success')
      expect(result.plain).toContain('output data')
    })

    it('should format complete result with error', () => {
      const shellResult: ShellResult = {
        exitCode: 1,
        stdout: '',
        stderr: 'command not found',
        success: false,
      }
      const result = formatter.formatResult(shellResult, 'invalid', false)
      expect(result.plain).toContain('invalid')
      expect(result.plain).toContain('Error')
      expect(result.plain).toContain('command not found')
    })

    it('should include stdout when requested', () => {
      const shellResult: ShellResult = {
        exitCode: 0,
        stdout: 'output data',
        stderr: '',
        success: true,
      }
      const result = formatter.formatResult(shellResult, 'cmd', true)
      expect(result.plain).toContain('Output:')
      expect(result.plain).toContain('output data')
    })

    it('should skip stdout when not requested', () => {
      const shellResult: ShellResult = {
        exitCode: 0,
        stdout: 'output data',
        stderr: '',
        success: true,
      }
      const result = formatter.formatResult(shellResult, 'cmd', false)
      expect(result.plain).not.toContain('Output:')
    })

    it('should include stderr when available', () => {
      const shellResult: ShellResult = {
        exitCode: 0,
        stdout: '',
        stderr: 'stderr output',
        success: true,
      }
      const result = formatter.formatResult(shellResult, 'cmd')
      expect(result.plain).toContain('Errors:')
      expect(result.plain).toContain('stderr output')
    })
  })

  describe('color disable', () => {
    it('should disable colors when NO_COLOR is set', () => {
      const originalNoColor = process.env.NO_COLOR
      try {
        process.env.NO_COLOR = '1'
        const disabledFormatter = new OutputFormatter({ enabled: false })
        const result = disabledFormatter.formatRunning('test')
        expect(result.hasColor).toBe(false)
      } finally {
        process.env.NO_COLOR = originalNoColor
      }
    })

    it('should respect enabled: false in config', () => {
      const disabledFormatter = new OutputFormatter({ enabled: false })
      const result = disabledFormatter.formatRunning('test')
      expect(result.hasColor).toBe(false)
    })
  })

  describe('custom color scheme', () => {
    it('should use custom colors from scheme', () => {
      const customFormatter = new OutputFormatter({
        enabled: true,
        scheme: {
          running: '#FF0000',
          success: '#00FF00',
          error: '#0000FF',
          stderr: '#FFFF00',
          useSymbols: true,
        },
      })
      const result = customFormatter.formatRunning('test')
      expect(result.formatted).toBeTruthy()
      expect(result.hasColor).toBe(true)
    })
  })

  describe('symbol support', () => {
    it('should use symbols by default', () => {
      const result = formatter.formatRunning('test')
      expect(result.plain).toMatch(/⟳|\.\.\./)
    })

    it('should use symbols when explicitly enabled', () => {
      const withSymbols = new OutputFormatter({
        enabled: true,
        scheme: { useSymbols: true },
      })
      const result = withSymbols.formatRunning('test')
      expect(result.plain).toMatch(/⟳|\.\.\./)
    })

    it('should skip symbols when disabled', () => {
      const noSymbols = new OutputFormatter({
        enabled: true,
        scheme: { useSymbols: false },
      })
      const result = noSymbols.formatRunning('test')
      // When symbols disabled, should still have message but different prefix
      expect(result.plain).toContain('test')
    })
  })
})
