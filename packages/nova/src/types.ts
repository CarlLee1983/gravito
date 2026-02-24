/**
 * Result of a shell command execution.
 * @public
 */
export interface ShellResult {
  /**
   * Exit code of the process (0 for success).
   */
  exitCode: number

  /**
   * Standard output as a string.
   */
  stdout: string

  /**
   * Standard error as a string.
   */
  stderr: string

  /**
   * Whether the command succeeded (exitCode === 0).
   */
  success: boolean
}

/**
 * Options for shell command execution.
 * @public
 */
export interface ShellRunOptions {
  /**
   * Working directory for the command execution.
   */
  cwd?: string

  /**
   * Environment variables to merge with current process env.
   */
  env?: Record<string, string>

  /**
   * Whether to suppress command output.
   */
  quiet?: boolean

  /**
   * Whether to suppress error throwing on non-zero exit code.
   */
  nothrow?: boolean

  /**
   * Maximum execution time in milliseconds.
   */
  timeout?: number
}
