import { createRequire } from 'node:module'

/**
 * Detected Javascript Runtime Environment
 * @public
 */
export type RuntimeKind = 'bun' | 'node' | 'deno' | 'unknown'

/**
 * Options for spawning subprocesses
 * @public
 */
export interface RuntimeSpawnOptions {
  cwd?: string
  env?: Record<string, string | undefined>
  stdin?: 'pipe' | 'inherit' | 'ignore'
  stdout?: 'pipe' | 'inherit' | 'ignore'
  stderr?: 'pipe' | 'inherit' | 'ignore'
  timeout?: number
  signal?: AbortSignal
}

/**
 * Resource usage statistics from subprocess
 * @public
 */
export interface RuntimeResourceUsage {
  cpuTime?: { user: number; system: number }
  maxRSS?: number
}

/**
 * Optional resource usage statistics
 * @internal
 */
export type OptionalRuntimeResourceUsage = RuntimeResourceUsage | undefined

/**
 * Output from spawned subprocess
 * @public
 */
export interface RuntimeProcessOutput {
  exitCode: number
  stdout: string
  stderr: string
  success: boolean
  timedOut: boolean
}

/**
 * Synchronous subprocess result
 * @public
 */
export interface RuntimeSpawnSyncResult {
  exitCode: number
  stdout: string
  stderr: string
  success: boolean
  timedOut: boolean
}

/**
 * Abstract subprocess interface
 * @public
 */
export interface RuntimeProcess {
  exited: Promise<number>
  stdout?: ReadableStream<Uint8Array> | null
  stderr?: ReadableStream<Uint8Array> | null
  kill?: (signal?: string | number) => void
  unref?: () => void
  resourceUsage?: () => Promise<OptionalRuntimeResourceUsage>
}

/**
 * File statistics abstraction
 * @public
 */
export interface RuntimeFileStat {
  size: number
}

/**
 * HTTP Server configuration
 * @public
 */
export interface RuntimeServeConfig {
  port?: number
  fetch: (req: Request, server?: unknown) => Response | Promise<Response>
  websocket?: unknown
}

/**
 * HTTP Server interface
 * @public
 */
export interface RuntimeServer {
  stop?: () => void
}

/**
 * Abstraction layer for filesystem and process operations across runtimes.
 * @public
 */
export interface RuntimeAdapter {
  kind: RuntimeKind
  spawn(command: string[], options?: RuntimeSpawnOptions): RuntimeProcess
  spawnAndCollect(command: string[], options?: RuntimeSpawnOptions): Promise<RuntimeProcessOutput>
  spawnSync(
    command: string[],
    options?: Omit<RuntimeSpawnOptions, 'signal'>
  ): RuntimeSpawnSyncResult
  writeFile(path: string, data: Blob | Buffer | string | ArrayBuffer | Uint8Array): Promise<void>
  readFile(path: string): Promise<Uint8Array>
  readFileAsBlob(path: string): Promise<Blob>
  exists(path: string): Promise<boolean>
  stat(path: string): Promise<RuntimeFileStat>
  deleteFile(path: string): Promise<void>
  serve(config: RuntimeServeConfig): RuntimeServer
}

/**
 * Abstraction layer for password hashing
 * @public
 */
export interface RuntimePasswordAdapter {
  hash(
    value: string,
    options:
      | { algorithm: 'bcrypt'; cost?: number }
      | {
          algorithm: 'argon2id'
          memoryCost?: number
          timeCost?: number
          parallelism?: number
        }
  ): Promise<string>
  verify(value: string, hashed: string): Promise<boolean>
}

/**
 * SQLite Statement abstraction
 * @public
 */
export interface RuntimeSqliteStatement {
  run(params?: Record<string, unknown>): void
  get(params?: Record<string, unknown>): unknown
  all(params?: Record<string, unknown>): unknown[]
}

/**
 * SQLite Database abstraction
 * @public
 */
export interface RuntimeSqliteDatabase {
  run(sql: string): void
  prepare(sql: string): RuntimeSqliteStatement
  query(sql: string): RuntimeSqliteStatement
  close(): void
}

/**
 * Get environment variables from the current runtime.
 * @public
 */
export const getRuntimeEnv = (): Record<string, string | undefined> => {
  const kind = getRuntimeKind()
  if (kind === 'bun' && typeof Bun !== 'undefined') {
    return Bun.env
  }
  if (kind === 'deno') {
    const deno = (globalThis as any).Deno
    if (deno?.env?.toObject) {
      return deno.env.toObject()
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env
  }
  return {}
}

const getRuntimeKind = (): RuntimeKind => {
  if (typeof Bun !== 'undefined' && typeof Bun.spawn === 'function') {
    return 'bun'
  }
  const denoRuntime = (globalThis as any).Deno
  if (typeof denoRuntime !== 'undefined' && typeof denoRuntime?.version?.deno === 'string') {
    return 'deno'
  }
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node'
  }
  return 'unknown'
}

const toUint8Array = async (
  data: Blob | Buffer | string | ArrayBuffer | Uint8Array
): Promise<Uint8Array> => {
  if (data instanceof Uint8Array) {
    return data
  }
  if (typeof data === 'string') {
    return new TextEncoder().encode(data)
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  if (typeof Buffer !== 'undefined' && data instanceof Buffer) {
    return new Uint8Array(data)
  }
  if (data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer())
  }
  return new Uint8Array()
}

const createBunAdapter = (): RuntimeAdapter => ({
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
        // Bun.spawn doesn't have unref, but we can return undefined
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
    let abortListener: (() => void) | undefined

    const exitPromise = proc.exited
      .then((code) => ({ code, timedOut }))
      .catch(() => ({
        code: -1,
        timedOut: true,
      }))

    if (options.timeout) {
      const timeoutPromise = new Promise<{ code: number; timedOut: boolean }>((resolve) => {
        timeoutHandle = setTimeout(() => {
          timedOut = true
          proc.kill('SIGTERM')
          resolve({ code: -1, timedOut: true })
        }, options.timeout)
      })

      const race = Promise.race([exitPromise, timeoutPromise])
      const result = await race

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
  spawnSync(command, options = {}) {
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

    const decoder = new TextDecoder('utf-8', { fatal: false })
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
  serve(config) {
    return Bun.serve({
      port: config.port,
      fetch: config.fetch,
      websocket: config.websocket as any,
    })
  },
})

const createNodeAdapter = (): RuntimeAdapter => ({
  kind: 'node',
  spawn(command, options = {}) {
    const [cmd, ...args] = command
    if (!cmd) {
      throw new Error('[RuntimeAdapter] spawn() requires a command')
    }
    const require = createRequire(import.meta.url)
    const childProcess = require('node:child_process') as typeof import('node:child_process')
    const stream = require('node:stream') as typeof import('node:stream')

    const stdioMap = (value: RuntimeSpawnOptions['stdout']) => {
      if (value === 'inherit') {
        return 'inherit'
      }
      if (value === 'ignore') {
        return 'ignore'
      }
      return 'pipe'
    }
    const stdinMap = (value: RuntimeSpawnOptions['stdin']) => {
      if (value === 'inherit') {
        return 'inherit'
      }
      if (value === 'ignore') {
        return 'ignore'
      }
      return 'pipe'
    }

    const child = childProcess.spawn(cmd, args, {
      cwd: options.cwd,
      env: options.env as Record<string, string>,
      stdio: [stdinMap(options.stdin), stdioMap(options.stdout), stdioMap(options.stderr)],
    }) as import('node:child_process').ChildProcess

    const toWeb = (streamReadable: NodeJS.ReadableStream | null) => {
      if (!streamReadable) {
        return null
      }
      const maybeWeb = streamReadable as unknown as ReadableStream<Uint8Array>
      if (typeof (maybeWeb as any).getReader === 'function') {
        return maybeWeb
      }
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
        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
        }
        if (abortListener && options.signal) {
          options.signal.removeEventListener('abort', abortListener)
        }
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
          if (!usage) {
            return undefined
          }
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
    if (!cmd) {
      throw new Error('[RuntimeAdapter] spawn() requires a command')
    }
    const require = createRequire(import.meta.url)
    const childProcess = require('node:child_process') as typeof import('node:child_process')

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
        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
        }
        if (abortListener && options.signal) {
          options.signal.removeEventListener('abort', abortListener)
        }

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
    if (!cmd) {
      throw new Error('[RuntimeAdapter] spawn() requires a command')
    }
    const require = createRequire(import.meta.url)
    const childProcess = require('node:child_process') as typeof import('node:child_process')

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
      timedOut: (result.error as any)?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ? true : false,
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
})

const createDenoAdapter = (): RuntimeAdapter => ({
  kind: 'deno',
  spawn(command, options = {}) {
    const [cmd, ...args] = command
    if (!cmd) {
      throw new Error('[RuntimeAdapter] spawn() requires a command')
    }
    const deno = (globalThis as any).Deno
    if (!deno?.Command) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for spawn()')
    }

    const stdin =
      options.stdin === 'inherit' ? 'inherit' : options.stdin === 'ignore' ? 'null' : 'piped'
    const stdout =
      options.stdout === 'inherit' ? 'inherit' : options.stdout === 'ignore' ? 'null' : 'piped'
    const stderr =
      options.stderr === 'inherit' ? 'inherit' : options.stderr === 'ignore' ? 'null' : 'piped'

    const proc = new deno.Command(cmd, {
      args,
      cwd: options.cwd,
      env: options.env,
      stdin,
      stdout,
      stderr,
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
    const deno = (globalThis as any).Deno
    if (!deno?.Command) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for spawn()')
    }

    const proc = new deno.Command(cmd, {
      args,
      cwd: options.cwd,
      env: options.env,
      stdout: 'piped',
      stderr: 'piped',
      stdin: options.stdin === 'inherit' ? 'inherit' : 'null',
    }).spawn()

    let timedOut = false
    let timeoutHandle: number | undefined
    let abortListener: (() => void) | undefined

    const statusPromise = proc.status.then((status: { code: number; success: boolean }) => ({
      code: status.code ?? 0,
      timedOut,
    }))

    if (options.timeout) {
      const timeoutPromise = new Promise<{ code: number; timedOut: boolean }>((resolve) => {
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
    const deno = (globalThis as any).Deno
    if (!deno?.Command) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for spawnSync()')
    }

    const result = new deno.Command(cmd, {
      args,
      cwd: options.cwd,
      env: options.env,
      stdin: options.stdin === 'inherit' ? 'inherit' : 'null',
    }).outputSync()

    const decoder = new TextDecoder('utf-8', { fatal: false })
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
    const deno = (globalThis as any).Deno
    if (!deno?.writeFile) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for writeFile()')
    }
    const payload = await toUint8Array(data)
    await deno.writeFile(path, payload)
  },
  async readFile(path) {
    const deno = (globalThis as any).Deno
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
    const deno = (globalThis as any).Deno
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
    const deno = (globalThis as any).Deno
    if (!deno?.stat) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for stat()')
    }
    const stats = await deno.stat(path)
    return { size: stats.size }
  },
  async deleteFile(path) {
    const deno = (globalThis as any).Deno
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
})

const createUnknownAdapter = (): RuntimeAdapter => ({
  kind: 'unknown',
  spawn() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for spawn()')
  },
  async spawnAndCollect() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for spawnAndCollect()')
  },
  spawnSync() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for spawnSync()')
  },
  async writeFile() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for writeFile()')
  },
  async readFile() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for readFile()')
  },
  async readFileAsBlob() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for readFileAsBlob()')
  },
  async exists() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for exists()')
  },
  async stat() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for stat()')
  },
  async deleteFile() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for deleteFile()')
  },
  serve() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for serve()')
  },
})

let runtimeAdapter: RuntimeAdapter | null = null

/**
 * Get the runtime abstraction adapter (Bun/Node/Deno).
 * @public
 */
export const getRuntimeAdapter = (): RuntimeAdapter => {
  if (runtimeAdapter) {
    return runtimeAdapter
  }
  const kind = getRuntimeKind()
  runtimeAdapter =
    kind === 'bun'
      ? createBunAdapter()
      : kind === 'node'
        ? createNodeAdapter()
        : kind === 'deno'
          ? createDenoAdapter()
          : createUnknownAdapter()
  return runtimeAdapter
}

let passwordAdapter: RuntimePasswordAdapter | null = null

/**
 * Get the password hashing adapter using native optimized implementations if available.
 * @public
 */
export const getPasswordAdapter = (): RuntimePasswordAdapter => {
  if (passwordAdapter) {
    return passwordAdapter
  }
  const kind = getRuntimeKind()
  if (kind === 'bun' && typeof Bun !== 'undefined') {
    passwordAdapter = {
      hash: async (value, options) => {
        if (options.algorithm === 'bcrypt') {
          return await Bun.password.hash(value, {
            algorithm: 'bcrypt',
            cost: options.cost ?? 12,
          })
        }
        return await Bun.password.hash(value, {
          algorithm: 'argon2id',
          ...(options.memoryCost !== undefined ? { memoryCost: options.memoryCost } : {}),
          ...(options.timeCost !== undefined ? { timeCost: options.timeCost } : {}),
          ...(options.parallelism !== undefined ? { parallelism: options.parallelism } : {}),
        })
      },
      verify: async (value, hashed) => await Bun.password.verify(value, hashed),
    }
    return passwordAdapter
  }

  passwordAdapter = {
    hash: async () => {
      throw new Error(
        '[RuntimeAdapter] Password hashing requires Bun runtime or a Node/Deno adapter'
      )
    },
    verify: async () => {
      throw new Error(
        '[RuntimeAdapter] Password hashing requires Bun runtime or a Node/Deno adapter'
      )
    },
  }
  return passwordAdapter
}

/**
 * Create a SQLite database connection using runtime-native drivers.
 * @public
 */
export const createSqliteDatabase = async (path: string): Promise<RuntimeSqliteDatabase> => {
  const kind = getRuntimeKind()
  if (kind === 'bun') {
    const sqlite = await import('bun:sqlite')
    const db = new sqlite.Database(path, { create: true })
    return db as RuntimeSqliteDatabase
  }

  throw new Error('[RuntimeAdapter] SQLite storage requires Bun runtime or a Node/Deno adapter')
}
