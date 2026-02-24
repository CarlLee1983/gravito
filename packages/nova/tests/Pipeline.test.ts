import { describe, it, expect } from 'bun:test'
import { Pipeline } from '../src/Pipeline'
import { ShellCommand } from '../src/ShellCommand'
import { NovaShellError } from '../src/errors'

describe('Pipeline', () => {
  // Basic pipeline tests
  it('should execute single command pipeline', async () => {
    const cmd = new ShellCommand(['echo ', ''], ['single'])
    const pipeline = new Pipeline([cmd])
    const result = await pipeline.run()

    expect(result.success).toBe(true)
    expect(result.stdout).toBe('single')
  })

  it('should execute two-command pipeline', async () => {
    const cmd1 = new ShellCommand(['echo -e "line1\\nline2\\nline3"'], [])
    const cmd2 = new ShellCommand(['grep ', ''], ['line'])
    const pipeline = new Pipeline([cmd1, cmd2])
    const result = await pipeline.run()

    expect(result.success).toBe(true)
    expect(result.stdout).toContain('line')
  })

  it('should execute multi-command pipeline with pipes', async () => {
    const cmd1 = new ShellCommand(['echo -e "apple\\nbanana\\ncherry"'], [])
    const cmd2 = new ShellCommand(['grep ', ''], ['a'])
    const cmd3 = new ShellCommand(['head -n ', ''], [1])
    const pipeline = new Pipeline([cmd1, cmd2, cmd3])
    const result = await pipeline.run()

    expect(result.success).toBe(true)
    expect(result.stdout).toContain('apple')
  })

  // .text() method tests
  it('should return pipeline text output via .text()', async () => {
    const cmd1 = new ShellCommand(['echo ', ''], ['pipeline-text'])
    const cmd2 = new ShellCommand(['cat'], [])
    const pipeline = new Pipeline([cmd1, cmd2])
    const text = await pipeline.text()

    expect(text).toBe('pipeline-text')
  })

  // .lines() method tests
  it('should split pipeline output into lines', async () => {
    const cmd1 = new ShellCommand(['printf ', ''], ['line1\\nline2\\nline3'])
    const cmd2 = new ShellCommand(['cat'], [])
    const pipeline = new Pipeline([cmd1, cmd2])
    const lines = await pipeline.lines()

    expect(lines).toEqual(['line1', 'line2', 'line3'])
  })

  // Error handling tests
  it('should throw on pipeline error', async () => {
    const cmd1 = new ShellCommand(['echo ', ''], ['test'])
    const cmd2 = new ShellCommand(['grep ', ''], ['nonexistent'])
    const pipeline = new Pipeline([cmd1, cmd2])

    try {
      await pipeline.run()
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(NovaShellError)
    }
  })

  it('should capture stderr in pipeline errors', async () => {
    const cmd1 = new ShellCommand(['echo ', ''], ['test'])
    const cmd2 = new ShellCommand(['grep ', ''], ['nonexistent-pattern'])
    const pipeline = new Pipeline([cmd1, cmd2])

    try {
      await pipeline.run()
      expect.unreachable()
    } catch (error) {
      if (error instanceof NovaShellError) {
        // grep returns non-zero when pattern not found
        expect(error.exitCode).not.toBe(0)
      } else {
        expect.unreachable()
      }
    }
  })

  // Pipeline composition tests
  it('should filter output through pipeline', async () => {
    const cmd1 = new ShellCommand(['printf ', ''], ['apple\\nbanana\\ncherry'])
    const cmd2 = new ShellCommand(['grep ', ''], ['a'])
    const pipeline = new Pipeline([cmd1, cmd2])
    const result = await pipeline.run()

    expect(result.stdout).toContain('apple')
    expect(result.stdout).toContain('banana')
    expect(result.stdout).not.toContain('cherry')
  })

  it('should transform output through pipeline', async () => {
    const cmd1 = new ShellCommand(['echo -e "A\\nB\\nC"'], [])
    const cmd2 = new ShellCommand(['tr A-Z a-z'], [])
    const pipeline = new Pipeline([cmd1, cmd2])
    const result = await pipeline.run()

    expect(result.stdout).toContain('a')
    expect(result.stdout).toContain('b')
    expect(result.stdout).toContain('c')
  })

  // Edge cases
  it('should throw on empty pipeline', () => {
    expect(() => {
      new Pipeline([])
    }).toThrow()
  })

  it('should handle pipeline with empty command output', async () => {
    const cmd1 = new ShellCommand(['true'], [])
    const cmd2 = new ShellCommand(['cat'], [])
    const pipeline = new Pipeline([cmd1, cmd2])
    const result = await pipeline.run()

    expect(result.success).toBe(true)
    expect(result.stdout).toBe('')
  })

  it('should handle pipeline with special characters in intermediate output', async () => {
    const cmd1 = new ShellCommand(['echo "test$VAR\\nmore"'], [])
    const cmd2 = new ShellCommand(['cat'], [])
    const pipeline = new Pipeline([cmd1, cmd2])
    const result = await pipeline.run()

    expect(result.success).toBe(true)
    expect(result.stdout).toContain('test')
  })

  // Complex pipelines
  it('should execute word count pipeline', async () => {
    const cmd1 = new ShellCommand(['printf ', ''], ['apple\\nbanana\\ncherry\\n'])
    const cmd2 = new ShellCommand(['wc -l'], [])
    const pipeline = new Pipeline([cmd1, cmd2])
    const result = await pipeline.run()

    expect(result.success).toBe(true)
    // wc -l counts the number of newlines, not lines
    expect(result.stdout.trim()).toBe('3')
  })

  it('should execute sort and dedup pipeline', async () => {
    const cmd1 = new ShellCommand(['printf ', ''], ['b\\na\\nb\\na'])
    const cmd2 = new ShellCommand(['sort'], [])
    const cmd3 = new ShellCommand(['uniq'], [])
    const pipeline = new Pipeline([cmd1, cmd2, cmd3])
    const result = await pipeline.run()

    expect(result.success).toBe(true)
    const lines = result.stdout.split('\n').filter((l) => l.length > 0)
    expect(lines).toEqual(['a', 'b'])
  })
})
