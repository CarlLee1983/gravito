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

  /**
   * Color configuration for output formatting.
   */
  color?: ColorConfig
}

/**
 * Color configuration for shell output.
 * @public
 */
export interface ColorConfig {
  /**
   * Enable colored output (respects NO_COLOR environment variable).
   */
  enabled?: boolean

  /**
   * Custom color scheme for different output types.
   */
  scheme?: ShellColorScheme
}

/**
 * Shell-specific color scheme definition.
 * @public
 */
export interface ShellColorScheme {
  /**
   * Color for running/pending status indicator.
   */
  running?: string

  /**
   * Color for success status (exit code 0).
   */
  success?: string

  /**
   * Color for error status (non-zero exit code).
   */
  error?: string

  /**
   * Color for stderr output.
   */
  stderr?: string

  /**
   * Color for command name/label.
   */
  label?: string

  /**
   * Whether to use symbols (spinner, checkmark, cross) in output.
   */
  useSymbols?: boolean
}

/**
 * Formatted output result with optional coloring.
 * @public
 */
export interface ColorizedResult {
  /**
   * Formatted output with ANSI color codes.
   */
  formatted: string

  /**
   * Plain text output without colors.
   */
  plain: string

  /**
   * Whether coloring was applied.
   */
  hasColor: boolean
}
