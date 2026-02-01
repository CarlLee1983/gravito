import { getRuntimeAdapter } from '@gravito/core'

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
 * Leverages the Gravito runtime adapter to ensure compatibility across different
 * JavaScript runtimes (Bun, Node.js). Executes commands within a shell (`sh -c`)
 * to support pipes, redirects, and environment variables.
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
  const runtime = getRuntimeAdapter()
  const proc = runtime.spawn(['sh', '-c', command], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  // Stream consumption using standard Web Streams API via Response
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout ?? null).text(),
    new Response(proc.stderr ?? null).text(),
  ])

  const exitCode = await proc.exited

  return {
    exitCode,
    stdout,
    stderr,
    success: exitCode === 0,
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
