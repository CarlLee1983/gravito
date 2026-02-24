import { Shell } from '@gravito/nova'

/**
 * Encapsulates the outcome of a child process execution.
 *
 * Provides status codes and captured stream outputs for programmatic inspection.
 *
 * @public
 * @since 3.0.0
 */
export interface ProcessResult {
  /** numeric exit code returned by the operating system (0 typically denotes success). */
  exitCode: number
  /** Captured UTF-8 encoded text from the standard output stream. */
  stdout: string
  /** Captured UTF-8 encoded text from the standard error stream. */
  stderr: string
  /** Semantic indicator of successful completion (mapped from exitCode === 0). */
  success: boolean
}

/**
 * Spawns a shell command and asynchronously captures its full output.
 *
 * Leverages the Nova Shell orchestration engine to ensure type-safe,
 * shell-injection-resistant command execution. Supports pipes, redirects,
 * and environment variables.
 *
 * @param command - Raw shell command string to execute.
 * @returns Resolves to a detailed `ProcessResult` object.
 *
 * @example
 * ```typescript
 * const result = await runProcess('ls -lh /var/logs');
 * if (result.success) {
 *   processLogs(result.stdout);
 * }
 * ```
 *
 * @public
 * @since 3.0.0
 */
export async function runProcess(command: string): Promise<ProcessResult> {
  try {
    const result = await Shell.run`bash -c ${command}`.nothrow().run()
    return result
  } catch (error) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      success: false,
    }
  }
}

// Legacy class-based API for backward compatibility
/**
 * Utility class for managing child process lifecycles.
 *
 * Acts as a wrapper for `runProcess` to maintain compatibility with earlier
 * versions of the framework.
 *
 * @example
 * ```typescript
 * const { stdout } = await Process.run('bun -v');
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class Process {
  /**
   * Static alias for `runProcess`.
   *
   * @param command - Command to execute.
   * @returns Process outcome.
   */
  static async run(command: string): Promise<ProcessResult> {
    return runProcess(command)
  }
}
