import type { ShellResult } from './types'
import { NovaShellError } from './errors'
import type { ShellCommand } from './ShellCommand'

/**
 * Represents a pipeline of shell commands connected via pipes.
 * Executes multiple commands where output of one becomes input of the next.
 * @public
 */
export class Pipeline {
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
   * Internal method to execute piped commands.
   */
  private async _executePipeline(): Promise<ShellResult> {
    // Build the full piped command by extracting command strings from each ShellCommand
    const commandStrings = this.commands.map((cmd) => {
      // Build command string from the ShellCommand's template strings and values
      let cmd_str = ''
      for (let i = 0; i < cmd.strings.length; i++) {
        cmd_str += cmd.strings[i]
        if (i < cmd.values.length) {
          const value = cmd.values[i]
          // Escape the value to prevent shell injection
          cmd_str += `'${String(value).replace(/'/g, "'\\''")}'`
        }
      }
      return cmd_str
    })

    // Filter out empty commands
    const validCommands = commandStrings.filter((cmd) => cmd.length > 0)

    if (validCommands.length === 0) {
      throw new Error('No valid commands in pipeline')
    }

    // Join commands with pipes
    const fullCommand = validCommands.join(' | ')

    try {
      // Execute the piped command using bash
      const proc = Bun.spawn(['bash', '-c', fullCommand], {
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

      // Throw error on non-zero exit code (pipelines don't have nothrow option)
      if (exitCode !== 0) {
        throw new NovaShellError(
          exitCode,
          result.stdout,
          result.stderr,
          fullCommand,
        )
      }

      return result
    } catch (error) {
      if (error instanceof NovaShellError) {
        throw error
      }
      throw error
    }
  }
}
