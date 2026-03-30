/**
 * Deno runtime adapter implementation.
 *
 * @module runtime/adapter-deno
 * @since 3.2.0
 */

import { toUint8Array } from './detection'
import type { RuntimeAdapter, RuntimeSpawnOptions } from './types'

/**
 * Minimal type interface for the Deno global used in adapter operations.
 * Avoids `any` while remaining compatible with globalThis access.
 * @internal
 */
interface DenoGlobal {
  Command?: new (
    cmd: string,
    options: {
      args?: string[]
      cwd?: string
      env?: Record<string, string | undefined>
      stdin?: string
      stdout?: string
      stderr?: string
    }
  ) => {
    spawn: () => {
      kill: (signal: string) => void
      stdout: ReadableStream<Uint8Array> | null
      stderr: ReadableStream<Uint8Array> | null
      status: Promise<{ code: number; success: boolean }>
    }
    outputSync: () => { stdout?: Uint8Array; stderr?: Uint8Array; code?: number }
  }
  writeFile?: (path: string, data: Uint8Array) => Promise<void>
  readFile?: (path: string) => Promise<Uint8Array>
  stat?: (path: string) => Promise<{ size: number }>
  remove?: (path: string) => Promise<void>
  mkdir?: (path: string, options?: { recursive?: boolean }) => Promise<void>
  readDir?: (path: string) => AsyncIterable<{ name: string; isFile: boolean; isDirectory: boolean }>
  env?: { toObject?: () => Record<string, string> }
}

/**
 * Map stdio option to Deno-compatible value.
 * @internal
 */
function mapDenoStdio(
  value: RuntimeSpawnOptions['stdout'] | undefined,
  defaultValue: 'piped' | 'null'
): 'inherit' | 'piped' | 'null' {
  if (value === 'inherit') {
    return 'inherit'
  }
  if (value === 'ignore') {
    return 'null'
  }
  return defaultValue
}

/**
 * Create a RuntimeAdapter for the Deno runtime.
 * @internal
 */
export function createDenoAdapter(): RuntimeAdapter {
  return {
    kind: 'deno',
    spawn(command, options = {}) {
      const [cmd, ...args] = command
      if (!cmd) {
        throw new Error('[RuntimeAdapter] spawn() requires a command')
      }
      const deno = (globalThis as unknown as { Deno?: DenoGlobal }).Deno
      if (!deno?.Command) {
        throw new Error('[RuntimeAdapter] Deno runtime is required for spawn()')
      }

      const proc = new deno.Command(cmd, {
        args,
        cwd: options.cwd,
        env: options.env,
        stdin: mapDenoStdio(options.stdin, 'piped'),
        stdout: mapDenoStdio(options.stdout, 'piped'),
        stderr: mapDenoStdio(options.stderr, 'piped'),
      }).spawn()

      let timeoutHandle: number | undefined
      let abortListener: (() => void) | undefined

      const exitedWithTimeout = new Promise<number>((resolve, reject) => {
        if (options.timeout) {
          timeoutHandle = setTimeout(() => {
            proc.kill('SIGTERM')
            reject(new Error('[RuntimeAdapter] Process timeout'))
          }, options.timeout) as unknown as number
        }

        if (options.signal) {
          abortListener = () => {
            proc.kill('SIGTERM')
            reject(new DOMException('Aborted', 'AbortError'))
          }
          options.signal.addEventListener('abort', abortListener)
        }

        proc.status
          .then((status: { code: number }) => {
            if (timeoutHandle) {
              clearTimeout(timeoutHandle)
            }
            if (abortListener && options.signal) {
              options.signal.removeEventListener('abort', abortListener)
            }
            resolve(status.code ?? 0)
          })
          .catch(reject)
      })

      return {
        exited: exitedWithTimeout,
        stdout: (proc.stdout as unknown as ReadableStream<Uint8Array>) ?? null,
        stderr: (proc.stderr as unknown as ReadableStream<Uint8Array>) ?? null,
        kill: (signal?: string | number) => {
          const killSignal = typeof signal === 'string' ? signal : 'SIGTERM'
          proc.kill(killSignal)
        },
      }
    },
    async spawnAndCollect(command, options = {}) {
      const [cmd, ...args] = command
      if (!cmd) {
        throw new Error('[RuntimeAdapter] spawn() requires a command')
      }
      const deno = (globalThis as unknown as { Deno?: DenoGlobal }).Deno
      if (!deno?.Command) {
        throw new Error('[RuntimeAdapter] Deno runtime is required for spawn()')
      }

      const proc = new deno.Command(cmd, {
        args,
        cwd: options.cwd,
        env: options.env,
        stdout: 'piped',
        stderr: 'piped',
        stdin: mapDenoStdio(options.stdin, 'null'),
      }).spawn()

      let timedOut = false
      let timeoutHandle: number | undefined
      let abortListener: (() => void) | undefined

      const statusPromise = proc.status.then((status: { code: number; success: boolean }) => ({
        code: status.code ?? 0,
        timedOut,
      }))

      if (options.timeout) {
        const timeoutPromise = new Promise<{
          code: number
          timedOut: boolean
        }>((resolve) => {
          timeoutHandle = setTimeout(() => {
            timedOut = true
            proc.kill('SIGTERM')
            resolve({ code: -1, timedOut: true })
          }, options.timeout) as unknown as number
        })

        const raceResult = await Promise.race([statusPromise, timeoutPromise])

        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
        }

        const [stdoutText, stderrText] = await Promise.all([
          new Response(proc.stdout ?? null).text(),
          new Response(proc.stderr ?? null).text(),
        ])

        return {
          exitCode: raceResult.code,
          stdout: stdoutText,
          stderr: stderrText,
          success: raceResult.code === 0 && !raceResult.timedOut,
          timedOut: raceResult.timedOut,
        }
      }

      if (options.signal) {
        abortListener = () => {
          proc.kill('SIGTERM')
        }
        options.signal.addEventListener('abort', abortListener)
      }

      const { code, timedOut: timeout } = await statusPromise

      if (abortListener && options.signal) {
        options.signal.removeEventListener('abort', abortListener)
      }

      const [stdoutText, stderrText] = await Promise.all([
        new Response(proc.stdout ?? null).text(),
        new Response(proc.stderr ?? null).text(),
      ])

      return {
        exitCode: code,
        stdout: stdoutText,
        stderr: stderrText,
        success: code === 0 && !timeout,
        timedOut: timeout,
      }
    },
    spawnSync(command, options = {}) {
      const [cmd, ...args] = command
      if (!cmd) {
        throw new Error('[RuntimeAdapter] spawn() requires a command')
      }
      const deno = (globalThis as unknown as { Deno?: DenoGlobal }).Deno
      if (!deno?.Command) {
        throw new Error('[RuntimeAdapter] Deno runtime is required for spawnSync()')
      }

      const result = new deno.Command(cmd, {
        args,
        cwd: options.cwd,
        env: options.env,
        stdin: mapDenoStdio(options.stdin, 'null'),
      }).outputSync()

      const decoder = new TextDecoder('utf-8', {
        fatal: false,
      })
      const stdoutText = decoder.decode(result.stdout ?? new Uint8Array())
      const stderrText = decoder.decode(result.stderr ?? new Uint8Array())

      return {
        exitCode: result.code ?? 0,
        stdout: stdoutText,
        stderr: stderrText,
        success: (result.code ?? 0) === 0,
        timedOut: false,
      }
    },
    async writeFile(path, data) {
      const deno = (globalThis as unknown as { Deno?: DenoGlobal }).Deno
      if (!deno?.writeFile) {
        throw new Error('[RuntimeAdapter] Deno runtime is required for writeFile()')
      }
      const payload = await toUint8Array(data)
      await deno.writeFile(path, payload)
    },
    async readFile(path) {
      const deno = (globalThis as unknown as { Deno?: DenoGlobal }).Deno
      if (!deno?.readFile) {
        throw new Error('[RuntimeAdapter] Deno runtime is required for readFile()')
      }
      return await deno.readFile(path)
    },
    async readFileAsBlob(path) {
      const buffer = await this.readFile(path)
      return new Blob([buffer as unknown as BlobPart])
    },
    async exists(path) {
      const deno = (globalThis as unknown as { Deno?: DenoGlobal }).Deno
      if (!deno?.stat) {
        throw new Error('[RuntimeAdapter] Deno runtime is required for exists()')
      }
      try {
        await deno.stat(path)
        return true
      } catch {
        return false
      }
    },
    async stat(path) {
      const deno = (globalThis as unknown as { Deno?: DenoGlobal }).Deno
      if (!deno?.stat) {
        throw new Error('[RuntimeAdapter] Deno runtime is required for stat()')
      }
      const stats = await deno.stat(path)
      return { size: stats.size }
    },
    async deleteFile(path) {
      const deno = (globalThis as unknown as { Deno?: DenoGlobal }).Deno
      if (!deno?.remove) {
        throw new Error('[RuntimeAdapter] Deno runtime is required for deleteFile()')
      }
      try {
        await deno.remove(path)
      } catch {
        // Ignore if not found
      }
    },
    serve(_config) {
      throw new Error('[RuntimeAdapter] Bun runtime is required for Bun.serve()')
    },
  }
}
