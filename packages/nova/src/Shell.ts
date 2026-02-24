import { Pipeline } from './Pipeline'
import { ShellCommand } from './ShellCommand'

/**
 * Static facade for shell command execution.
 * Provides a clean, template-literal-based API for executing shell commands.
 *
 * @example
 * ```typescript
 * // Simple command execution
 * const result = await Shell.run`echo hello`
 *
 * // Get text output
 * const text = await Shell.text`cat ${file}`
 *
 * // Parse JSON output
 * const data = await Shell.json`curl ${apiUrl}`
 *
 * // Create a pipeline
 * const output = await Shell.pipe(
 *   Shell.cmd`cat ${file}`,
 *   Shell.cmd`grep error`,
 *   Shell.cmd`head -n 10`
 * ).text()
 * ```
 * @public
 */
export const Shell = {
  /**
   * Execute a shell command with template literal syntax.
   * Automatically escapes all interpolated values to prevent shell injection.
   *
   * @param strings - Template string parts
   * @param values - Interpolated values (auto-escaped)
   * @returns ShellCommand that can be awaited or configured further
   *
   * @example
   * ```typescript
   * const result = await Shell.run`ls -la ${directory}`
   * ```
   */
  run(strings: TemplateStringsArray, ...values: unknown[]): ShellCommand {
    return new ShellCommand(strings, values)
  },

  /**
   * Execute a shell command and get stdout as string.
   * Automatically escapes all interpolated values to prevent shell injection.
   *
   * @param strings - Template string parts
   * @param values - Interpolated values (auto-escaped)
   * @returns Promise<string> with stdout content
   *
   * @example
   * ```typescript
   * const text = await Shell.text`npm whoami`
   * ```
   */
  async text(strings: TemplateStringsArray, ...values: unknown[]): Promise<string> {
    const cmd = new ShellCommand(strings, values)
    return cmd.text()
  },

  /**
   * Execute a shell command and parse stdout as JSON.
   * Automatically escapes all interpolated values to prevent shell injection.
   *
   * @param strings - Template string parts
   * @param values - Interpolated values (auto-escaped)
   * @returns Promise<T> with parsed JSON
   *
   * @example
   * ```typescript
   * const data = await Shell.json`curl ${apiUrl}`
   * ```
   */
  async json<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> {
    const cmd = new ShellCommand(strings, values)
    return cmd.json<T>()
  },

  /**
   * Create a shell command for use in pipelines.
   * Identical to run() but named for clarity in pipeline contexts.
   *
   * @param strings - Template string parts
   * @param values - Interpolated values (auto-escaped)
   * @returns ShellCommand that can be piped
   *
   * @example
   * ```typescript
   * const result = await Shell.pipe(
   *   Shell.cmd`cat ${file}`,
   *   Shell.cmd`grep pattern`
   * ).run()
   * ```
   */
  cmd(strings: TemplateStringsArray, ...values: unknown[]): ShellCommand {
    return new ShellCommand(strings, values)
  },

  /**
   * Create a pipeline from multiple commands.
   * Commands are connected with pipe operators (|).
   *
   * @param commands - Array of ShellCommand instances
   * @returns Pipeline that can be executed
   *
   * @example
   * ```typescript
   * const output = await Shell.pipe(
   *   Shell.cmd`cat ${file}`,
   *   Shell.cmd`grep ${pattern}`,
   *   Shell.cmd`head -n ${count}`
   * ).text()
   * ```
   */
  pipe(...commands: ShellCommand[]): Pipeline {
    return new Pipeline(commands)
  },
}
