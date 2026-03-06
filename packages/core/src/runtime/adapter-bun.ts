/**
 * Bun runtime adapter implementation.
 *
 * @module runtime/adapter-bun
 * @since 3.2.0
 */

import type { RuntimeAdapter, RuntimeSpawnOptions } from './types'

/**
 * Create a RuntimeAdapter for the Bun runtime.
 * @internal
 */
export function createBunAdapter(): RuntimeAdapter {
  return {
    kind: 'bun',
    spawn(command, options = {}) {
      const [cmd, ...args] = command
      if (!cmd) {
        throw new Error('[RuntimeAdapter] spawn() requires a command')
      }
      const proc = Bun.spawn([cmd, ...args], {
        cwd: options.cwd,
        env: options.env,
        stdin: options.stdin,
        stdout: options.stdout ?? 'pipe',
        stderr: options.stderr ?? 'pipe',
      })

      let timeoutHandle: Timer | undefined
      let abortListener: (() => void) | undefined

      const exitedWithTimeout = new Promise<number>((resolve, reject) => {
        if (options.timeout) {
          timeoutHandle = setTimeout(() => {
            proc.kill('SIGTERM')
            reject(new Error('[RuntimeAdapter] Process timeout'))
          }, options.timeout)
        }

        if (options.signal) {
          abortListener = () => {
            proc.kill('SIGTERM')
            reject(new DOMException('Aborted', 'AbortError'))
          }
          options.signal.addEventListener('abort', abortListener)
        }

        proc.exited
          .then(resolve)
          .catch(reject)
          .finally(() => {
            if (timeoutHandle) {
              clearTimeout(timeoutHandle)
            }
            if (abortListener && options.signal) {
              options.signal.removeEventListener('abort', abortListener)
            }
          })
      })

      return {
        exited: exitedWithTimeout,
        stdout: proc.stdout ?? null,
        stderr: proc.stderr ?? null,
        kill: (signal?: string | number) => {
          const bunSignal =
            typeof signal === 'number' ? signal : (signal as NodeJS.Signals | undefined)
          proc.kill(bunSignal)
        },
        unref: () => {
          // Bun.spawn doesn't have unref
        },
        resourceUsage: async () => {
          // Bun doesn't expose resource usage through spawn API
          return undefined
        },
      }
    },
    async spawnAndCollect(command, options = {}) {
      const [cmd, ...args] = command
      if (!cmd) {
        throw new Error('[RuntimeAdapter] spawn() requires a command')
      }

      const proc = Bun.spawn([cmd, ...args], {
        cwd: options.cwd,
        env: options.env,
        stdin: options.stdin,
        stdout: 'pipe',
        stderr: 'pipe',
      })

      let timedOut = false
      let timeoutHandle: Timer | undefined

      const exitPromise = proc.exited
        .then((code: number) => ({ code, timedOut }))
        .catch(() => ({
          code: -1,
          timedOut: true,
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
          }, options.timeout)
        })

        const result = await Promise.race([exitPromise, timeoutPromise])

        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
        }

        const [stdoutText, stderrText] = await Promise.all([
          new Response(proc.stdout ?? null).text(),
          new Response(proc.stderr ?? null).text(),
        ])

        return {
          exitCode: result.code,
          stdout: stdoutText,
          stderr: stderrText,
          success: result.code === 0 && !result.timedOut,
          timedOut: result.timedOut,
        }
      }

      let abortListener: (() => void) | undefined
      if (options.signal) {
        abortListener = () => {
          proc.kill('SIGTERM')
        }
        options.signal.addEventListener('abort', abortListener)
      }

      const { code, timedOut: timeout } = await exitPromise

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
    spawnSync(command, options: Omit<RuntimeSpawnOptions, 'signal'> = {}) {
      const [cmd, ...args] = command
      if (!cmd) {
        throw new Error('[RuntimeAdapter] spawn() requires a command')
      }

      const timedOut = false
      const proc = Bun.spawnSync([cmd, ...args], {
        cwd: options.cwd,
        env: options.env,
        stdin: options.stdin,
        stdout: 'pipe',
        stderr: 'pipe',
      })

      const decoder = new TextDecoder('utf-8', {
        fatal: false,
      })
      const stdoutText = decoder.decode(proc.stdout ?? new Uint8Array())
      const stderrText = decoder.decode(proc.stderr ?? new Uint8Array())

      return {
        exitCode: proc.exitCode ?? 0,
        stdout: stdoutText,
        stderr: stderrText,
        success: (proc.exitCode ?? 0) === 0 && !timedOut,
        timedOut,
      }
    },
    async writeFile(path, data) {
      await Bun.write(path, data)
    },
    async appendFile(path, data) {
      const file = Bun.file(path)
      const writer = file.writer()
      writer.write(data)
      await writer.end()
    },
    createFileSink(path) {
      const writer = Bun.file(path).writer()
      return {
        write(data) {
          writer.write(data)
        },
        async flush() {
          await writer.flush()
        },
        async end() {
          await writer.end()
        },
      }
    },
    async readFile(path) {
      const file = Bun.file(path)
      const buffer = await file.arrayBuffer()
      return new Uint8Array(buffer)
    },
    async readFileAsBlob(path) {
      return Bun.file(path)
    },
    async exists(path) {
      return await Bun.file(path).exists()
    },
    async stat(path) {
      const stats = await Bun.file(path).stat()
      return { size: stats.size }
    },
    async deleteFile(path) {
      const fs = await import('node:fs/promises')
      try {
        await fs.unlink(path)
      } catch {
        // Ignore if not found
      }
    },
    async mkdir(path, options = {}) {
      const fs = await import('node:fs/promises')
      await fs.mkdir(path, options)
    },
    async readDir(path) {
      const fs = await import('node:fs/promises')
      const entries = await fs.readdir(path, { withFileTypes: true })
      return entries.map((entry) => ({
        name: entry.name,
        isFile: entry.isFile(),
        isDirectory: entry.isDirectory(),
      }))
    },
    async removeRecursive(path) {
      const fs = await import('node:fs/promises')
      await fs.rm(path, { recursive: true, force: true })
    },
    serve(config) {
      return Bun.serve({
        port: config.port,
        fetch: config.fetch,
        websocket: config.websocket as any,
      })
    },
  }
}
