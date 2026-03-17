import { OutputFormatter } from './colors/OutputFormatter'
import { NovaShellError } from './errors'
import type { ColorConfig, ShellResult, ShellRunOptions } from './types'

/**
 * Represents a shell command built from template literals.
 * Provides a chainable API for configuring and executing shell commands.
 * @public
 */
export class ShellCommand implements PromiseLike<ShellResult> {
  private _cwd?: string
  private _env?: Record<string, string>
  private _quiet = false
  private _nothrow = false
  private _timeout?: number
  private _colorized = false
  private _colorConfig?: ColorConfig
  private _promise?: Promise<ShellResult>

  constructor(
    readonly strings: TemplateStringsArray,
    readonly values: unknown[]
  ) {}

  /**
   * Set the working directory for command execution.
   */
  cwd(dir: string): ShellCommand {
    const cmd = this._clone()
    cmd._cwd = dir
    return cmd
  }

  /**
   * Set environment variables for command execution.
   */
  env(vars: Record<string, string>): ShellCommand {
    const cmd = this._clone()
    cmd._env = vars
    return cmd
  }

  /**
   * Suppress command output.
   */
  quiet(): ShellCommand {
    const cmd = this._clone()
    cmd._quiet = true
    return cmd
  }

  /**
   * Don't throw error on non-zero exit code.
   */
  nothrow(): ShellCommand {
    const cmd = this._clone()
    cmd._nothrow = true
    return cmd
  }

  /**
   * Set maximum execution time in milliseconds.
   */
  timeout(ms: number): ShellCommand {
    const cmd = this._clone()
    cmd._timeout = ms
    return cmd
  }

  /**
   * Enable colored output formatting for the command result.
   * Uses @gravito/chromatic if available, falls back to ANSI codes.
   */
  colorized(config?: ColorConfig): ShellCommand {
    const cmd = this._clone()
    cmd._colorized = true
    cmd._colorConfig = config
    return cmd
  }

  /**
   * Execute the command and get full result.
   */
  async run(): Promise<ShellResult> {
    return this._executeCommand()
  }

  /**
   * Execute the command and get stdout as string.
   */
  async text(): Promise<string> {
    const result = await this._executeCommand()
    return result.stdout
  }

  /**
   * Execute the command and get stdout parsed as JSON.
   */
  async json<T = unknown>(): Promise<T> {
    const result = await this._executeCommand()
    return JSON.parse(result.stdout) as T
  }

  /**
   * Execute the command and get stdout as array of lines.
   */
  async lines(): Promise<string[]> {
    const result = await this._executeCommand()
    return result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }

  /**
   * Create an immutable clone of this command with current state.
   */
  private _clone(): ShellCommand {
    const cmd = new ShellCommand(this.strings, this.values)
    cmd._cwd = this._cwd
    cmd._env = this._env
    cmd._quiet = this._quiet
    cmd._nothrow = this._nothrow
    cmd._timeout = this._timeout
    cmd._colorized = this._colorized
    cmd._colorConfig = this._colorConfig
    return cmd
  }

  /**
   * Build the escaped shell command string for execution.
   */
  toShellString(): string {
    return this._buildCommandString()
  }

  /**
   * Return the configured execution options for this command.
   */
  getRunOptions(): ShellRunOptions {
    return {
      cwd: this._cwd,
      env: this._env,
      quiet: this._quiet,
      nothrow: this._nothrow,
      timeout: this._timeout,
      color: this._colorConfig,
    }
  }

  /**
   * PromiseLike implementation for direct await support.
   */
  // biome-ignore lint/suspicious/noThenProperty: Required for PromiseLike interface
  then<TResult1 = ShellResult, TResult2 = never>(
    onfulfilled?: ((value: ShellResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    if (!this._promise) {
      this._promise = this._executeCommand()
    }
    return this._promise.then(onfulfilled, onrejected)
  }

  /**
   * PromiseLike catch implementation.
   */
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
  ): Promise<ShellResult | TResult> {
    if (!this._promise) {
      this._promise = this._executeCommand()
    }
    return this._promise.catch(onrejected)
  }

  /**
   * Internal method to execute the command using Bun's shell.
   */
  private async _executeCommand(): Promise<ShellResult> {
    const cmdStr = this.toShellString()

    try {
      // Use Bun.spawn to execute the command with proper options
      const proc = Bun.spawn(['bash', '-c', cmdStr], {
        cwd: this._cwd,
        env: this._env ? { ...process.env, ...this._env } : undefined,
        timeout: this._timeout,
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
      if (this._colorized && !this._quiet) {
        const formatter = new OutputFormatter(this._colorConfig)
        const formatted = formatter.formatResult(result, cmdStr, !this._quiet)
        console.log(formatted.formatted)
      }

      // Handle error cases
      if (exitCode !== 0 && !this._nothrow) {
        throw new NovaShellError(exitCode, result.stdout, result.stderr, cmdStr)
      }

      return result
    } catch (error) {
      if (error instanceof NovaShellError) {
        throw error
      }
      if (this._nothrow) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
          success: false,
        }
      }
      throw error
    }
  }

  /**
   * Build the command string from template strings and values.
   * Returns an object with the base command and values to pass separately.
   */
  private _buildCommandString(): string {
    let cmd = ''
    for (let i = 0; i < this.strings.length; i++) {
      cmd += this.strings[i]
      if (i < this.values.length) {
        const value = String(this.values[i])
        // Use single quotes to prevent shell interpretation
        // Escape single quotes by ending the quote, adding escaped quote, and starting new quote
        cmd += `'${value.replace(/'/g, "'\\''")}'`
      }
    }
    return cmd
  }
}
