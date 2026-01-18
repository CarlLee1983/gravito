import { getRuntimeAdapter } from '@gravito/core'

/**
 * Result of a process execution.
 *
 * @public
 * @since 3.0.0
 */
export interface ProcessResult {
  /** Exit code of the process (0 indicates success). */
  exitCode: number
  /** Standard output from the process. */
  stdout: string
  /** Standard error output from the process. */
  stderr: string
  /** Whether the process completed successfully (exitCode === 0). */
  success: boolean
}

/**
 * Execute a shell command and capture its output.
 *
 * @param command - The command string to execute.
 * @returns A promise that resolves to the process result.
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
 * Process execution utility for running shell commands.
 *
 * Provides a simple interface for executing shell commands
 * and capturing their output.
 *
 * @example
 * ```typescript
 * const result = await Process.run('ls -la')
 * if (result.success) {
 *   console.log(result.stdout)
 * } else {
 *   console.error(result.stderr)
 * }
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class Process {
  static async run(command: string): Promise<ProcessResult> {
    return runProcess(command)
  }
}
