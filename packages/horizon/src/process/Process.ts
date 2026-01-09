import { getRuntimeAdapter } from '@gravito/core'

export interface ProcessResult {
  exitCode: number
  stdout: string
  stderr: string
  success: boolean
}

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
export class Process {
  static async run(command: string): Promise<ProcessResult> {
    return runProcess(command)
  }
}
