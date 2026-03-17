import { OutputFormatter } from './colors/OutputFormatter'
import { NovaShellError } from './errors'
import type { ShellCommand } from './ShellCommand'
import type { ColorConfig, ShellResult, ShellRunOptions } from './types'

/**
 * Represents a pipeline of shell commands connected via pipes.
 * Executes multiple commands where output of one becomes input of the next.
 * @public
 */
export class Pipeline {
  private _colorized = false
  private _colorConfig?: ColorConfig

  constructor(private commands: ShellCommand[]) {
    if (commands.length === 0) {
      throw new Error('Pipeline must have at least one command')
    }
  }

  /**
   * Execute the pipeline and get the full result.
   */
  async run(): Promise<ShellResult> {
    if (this.commands.length === 1) {
      // Single command - execute directly
      return this.commands[0].run()
    }

    // Multiple commands - need to pipe them together
    return this._executePipeline()
  }

  /**
   * Execute the pipeline and get stdout as string.
   */
  async text(): Promise<string> {
    const result = await this.run()
    return result.stdout
  }

  /**
   * Execute the pipeline and get stdout as array of lines.
   */
  async lines(): Promise<string[]> {
    const result = await this.run()
    return result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }

  /**
   * Enable colored output formatting for the pipeline result.
   */
  colorized(config?: ColorConfig): Pipeline {
    const pipeline = new Pipeline(this.commands)
    pipeline._colorized = true
    pipeline._colorConfig = config
    return pipeline
  }

  /**
   * Internal method to execute piped commands.
   */
  private async _executePipeline(): Promise<ShellResult> {
    const commandStrings = this.commands.map((cmd) => cmd.toShellString())

    // Filter out empty commands
    const validCommands = commandStrings.filter((cmd) => cmd.length > 0)

    if (validCommands.length === 0) {
      throw new Error('No valid commands in pipeline')
    }

    // Join commands with pipes
    const fullCommand = validCommands.join(' | ')
    const runOptions = this._resolveRunOptions()

    try {
      const proc = Bun.spawn(['bash', '-c', fullCommand], {
        cwd: runOptions.cwd,
        env: runOptions.env ? { ...process.env, ...runOptions.env } : undefined,
        timeout: runOptions.timeout,
        stdout: 'pipe',
        stderr: 'pipe',
      })

      // Wait for process to complete
      const exitCode = await proc.exited

      // Capture output by reading from streams
      const stdout = await new Response(proc.stdout).text()
      const stderr = await new Response(proc.stderr).text()

      const result: ShellResult = {
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: exitCode === 0,
      }

      // Format output with colors if enabled
      if (this._colorized) {
        const formatter = new OutputFormatter(this._colorConfig)
        const formatted = formatter.formatResult(result, fullCommand, true)
        console.log(formatted.formatted)
      }

      // Throw error on non-zero exit code (pipelines don't have nothrow option)
      if (exitCode !== 0) {
        throw new NovaShellError(exitCode, result.stdout, result.stderr, fullCommand)
      }

      return result
    } catch (error) {
      if (error instanceof NovaShellError) {
        throw error
      }
      throw error
    }
  }

  private _resolveRunOptions(): Pick<ShellRunOptions, 'cwd' | 'env' | 'timeout'> {
    const commandOptions = this.commands.map((cmd) => cmd.getRunOptions())
    const cwdValues = new Set(
      commandOptions
        .map((options) => options.cwd)
        .filter((cwd): cwd is string => typeof cwd === 'string' && cwd.length > 0)
    )

    if (cwdValues.size > 1) {
      throw new Error('Pipeline commands must use the same cwd')
    }

    const env = commandOptions.reduce<Record<string, string> | undefined>((merged, options) => {
      if (!options.env) {
        return merged
      }
      return { ...(merged ?? {}), ...options.env }
    }, undefined)

    const timeouts = commandOptions
      .map((options) => options.timeout)
      .filter((timeout): timeout is number => typeof timeout === 'number')

    return {
      cwd: cwdValues.values().next().value,
      env,
      timeout: timeouts.length > 0 ? Math.min(...timeouts) : undefined,
    }
  }
}
