/**
 * Node.js runtime adapter implementation.
 *
 * @module runtime/adapter-node
 * @since 3.2.0
 */

import { createRequire } from 'node:module'
import { toUint8Array } from './detection'
import type { RuntimeAdapter, RuntimeSpawnOptions } from './types'

/**
 * Create a RuntimeAdapter for the Node.js runtime.
 * @internal
 */
export function createNodeAdapter(): RuntimeAdapter {
  return {
    kind: 'node',
    spawn(command, options = {}) {
      const [cmd, ...args] = command
      if (!cmd) {
        throw new Error('[RuntimeAdapter] spawn() requires a command')
      }

      // biome-ignore lint: node context
      const childProcess = require('node:child_process')
      // biome-ignore lint: node context
      const stream = require('node:stream')

      const stdioMap = (value: RuntimeSpawnOptions['stdout']) => {
        if (value === 'inherit') return 'inherit'
        if (value === 'ignore') return 'ignore'
        return 'pipe'
      }
      const stdinMap = (value: RuntimeSpawnOptions['stdin']) => {
        if (value === 'inherit') return 'inherit'
        if (value === 'ignore') return 'ignore'
        return 'pipe'
      }

      const child = childProcess.spawn(cmd, args, {
        cwd: options.cwd,
        env: options.env as Record<string, string>,
        stdio: [stdinMap(options.stdin), stdioMap(options.stdout), stdioMap(options.stderr)],
      }) as import('node:child_process').ChildProcess

      const toWeb = (streamReadable: NodeJS.ReadableStream | null) => {
        if (!streamReadable) return null
        const maybeWeb = streamReadable as unknown as ReadableStream<Uint8Array>
        if (typeof (maybeWeb as any).getReader === 'function') return maybeWeb
        return stream.Readable.toWeb(streamReadable as any) as unknown as ReadableStream<Uint8Array>
      }

      let timeoutHandle: NodeJS.Timeout | undefined
      let abortListener: (() => void) | undefined

      const exitedWithTimeout = new Promise<number>((resolve, reject) => {
        if (options.timeout) {
          timeoutHandle = setTimeout(() => {
            child.kill('SIGTERM')
            reject(new Error('[RuntimeAdapter] Process timeout'))
          }, options.timeout)
        }

        if (options.signal) {
          abortListener = () => {
            child.kill('SIGTERM')
            reject(new DOMException('Aborted', 'AbortError'))
          }
          options.signal.addEventListener('abort', abortListener)
        }

        child.on('error', reject)
        child.on('exit', (code) => {
          if (timeoutHandle) clearTimeout(timeoutHandle)
          if (abortListener && options.signal)
            options.signal.removeEventListener('abort', abortListener)
          resolve(code ?? 0)
        })
      })

      return {
        exited: exitedWithTimeout,
        stdout: toWeb(child.stdout),
        stderr: toWeb(child.stderr),
        kill: (signal?: string | number) => child.kill(signal as NodeJS.Signals | number),
        unref: () => {
          child.unref()
        },
        resourceUsage: async () => {
          try {
            const usage = (child as any).resourceUsage?.()
            if (!usage) return undefined
            return {
              cpuTime:
                usage.user && usage.system ? { user: usage.user, system: usage.system } : undefined,
              maxRSS: usage.maxRss,
            }
          } catch {
            return undefined
          }
        },
      }
    },
    async spawnAndCollect(command, options = {}) {
      const [cmd, ...args] = command
      if (!cmd) throw new Error('[RuntimeAdapter] spawn() requires a command')

      // biome-ignore lint: node context
      const childProcess = require('node:child_process')

      return new Promise((resolve, reject) => {
        let timedOut = false
        let timeoutHandle: NodeJS.Timeout | undefined
        let abortListener: (() => void) | undefined

        const child = childProcess.spawn(cmd, args, {
          cwd: options.cwd,
          env: options.env as Record<string, string>,
          stdio: ['pipe', 'pipe', 'pipe'],
        }) as import('node:child_process').ChildProcess

        const stdoutChunks: Buffer[] = []
        const stderrChunks: Buffer[] = []

        child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk))
        child.stderr?.on('data', (chunk) => stderrChunks.push(chunk))

        if (options.timeout) {
          timeoutHandle = setTimeout(() => {
            timedOut = true
            child.kill('SIGTERM')
          }, options.timeout)
        }

        if (options.signal) {
          abortListener = () => {
            child.kill('SIGTERM')
          }
          options.signal.addEventListener('abort', abortListener)
        }

        child.on('error', reject)
        child.on('exit', (code) => {
          if (timeoutHandle) clearTimeout(timeoutHandle)
          if (abortListener && options.signal)
            options.signal.removeEventListener('abort', abortListener)

          const stdout = Buffer.concat(stdoutChunks).toString('utf-8')
          const stderr = Buffer.concat(stderrChunks).toString('utf-8')

          resolve({
            exitCode: code ?? 0,
            stdout,
            stderr,
            success: (code ?? 0) === 0 && !timedOut,
            timedOut,
          })
        })
      })
    },
    spawnSync(command, options = {}) {
      const [cmd, ...args] = command
      if (!cmd) throw new Error('[RuntimeAdapter] spawn() requires a command')

      // biome-ignore lint: node context
      const childProcess = require('node:child_process')

      const result = childProcess.spawnSync(cmd, args, {
        cwd: options.cwd,
        env: options.env as Record<string, string>,
        encoding: 'utf-8',
      })

      return {
        exitCode: result.status ?? 0,
        stdout: (result.stdout ?? '') as string,
        stderr: (result.stderr ?? '') as string,
        success: (result.status ?? 0) === 0,
        timedOut: (result.error as any)?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
      }
    },
    async writeFile(path, data) {
      const fs = await import('node:fs/promises')
      const payload = await toUint8Array(data)
      await fs.writeFile(path, payload)
    },
    async readFile(path) {
      const fs = await import('node:fs/promises')
      const buffer = await fs.readFile(path)
      return new Uint8Array(buffer)
    },
    async readFileAsBlob(path) {
      const buffer = await this.readFile(path)
      return new Blob([buffer as unknown as BlobPart])
    },
    async exists(path) {
      const fs = await import('node:fs/promises')
      try {
        await fs.access(path)
        return true
      } catch {
        return false
      }
    },
    async stat(path) {
      const fs = await import('node:fs/promises')
      const stats = await fs.stat(path)
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
    serve(_config) {
      throw new Error('[RuntimeAdapter] Bun runtime is required for Bun.serve()')
    },
  }
}
