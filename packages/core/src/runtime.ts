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

// ============ Archive Support Types ============

/**
 * 歸檔項目 -- 支援多種資料來源
 * @public
 */
export interface ArchiveEntry {
  /** 歸檔中的路徑（自動正規化為正斜線） */
  readonly path: string
  /** 資料內容 */
  readonly data: string | Blob | ArrayBuffer | Uint8Array
}

/**
 * 歸檔建立選項
 * @public
 */
export interface ArchiveCreateOptions {
  /** 壓縮演算法（目前僅支援 gzip） */
  compress?: 'gzip'
  /** 壓縮等級（1-12，預設 6） */
  level?: number
}

/**
 * 歸檔提取選項
 * @public
 */
export interface ArchiveExtractOptions {
  /** Glob 模式過濾（僅提取匹配的檔案） */
  glob?: string | readonly string[]
}

/**
 * 歸檔中的檔案資訊
 * @public
 */
export interface ArchiveFileInfo {
  /** 檔案路徑 */
  readonly path: string
  /** 檔案大小（bytes） */
  readonly size: number
  /** 最後修改時間 */
  readonly lastModified: number
  /** 讀取文字內容 */
  text(): Promise<string>
  /** 讀取為 ArrayBuffer */
  arrayBuffer(): Promise<ArrayBuffer>
}

/**
 * 歸檔操作的運行時抽象
 * @public
 */
export interface RuntimeArchiveAdapter {
  /**
   * 從檔案/目錄映射建立歸檔
   * @param entries - 路徑到內容的映射
   * @param options - 壓縮選項
   * @returns 歸檔的二進位資料
   */
  create(
    entries: Record<string, string | Blob | ArrayBuffer | Uint8Array>,
    options?: ArchiveCreateOptions
  ): Promise<Uint8Array>

  /**
   * 提取歸檔到指定目錄
   * @param data - 歸檔二進位資料
   * @param targetDir - 目標目錄（自動建立）
   * @param options - 提取選項（glob 過濾）
   * @returns 提取的檔案數量
   */
  extract(
    data: Blob | ArrayBuffer | Uint8Array,
    targetDir: string,
    options?: ArchiveExtractOptions
  ): Promise<number>

  /**
   * 讀取歸檔中的檔案列表（不提取）
   * @param data - 歸檔二進位資料
   * @param glob - 可選的 glob 過濾
   * @returns 路徑到檔案資訊的映射
   */
  list(
    data: Blob | ArrayBuffer | Uint8Array,
    glob?: string | readonly string[]
  ): Promise<Map<string, ArchiveFileInfo>>

  /**
   * 從歸檔中讀取單一檔案
   * @param data - 歸檔二進位資料
   * @param filePath - 檔案路徑
   * @returns 檔案內容，若不存在則回傳 null
   */
  readFile(data: Blob | ArrayBuffer | Uint8Array, filePath: string): Promise<Uint8Array | null>
}

// ============ Archive Adapter Implementations ============

/**
 * 將 Blob/ArrayBuffer/Uint8Array 統一轉換為 Uint8Array（歸檔專用）
 * @internal
 */
const toArchiveUint8Array = async (data: Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array> => {
  if (data instanceof Uint8Array) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  // Blob
  return new Uint8Array(await data.arrayBuffer())
}

/**
 * 建立 Bun 原生歸檔 adapter（使用 Bun.Tarball API）
 * @internal
 */
const createBunArchiveAdapter = (): RuntimeArchiveAdapter => ({
  async create(entries, options = {}) {
    if (typeof Bun === 'undefined' || typeof (Bun as any).Tarball === 'undefined') {
      throw new Error('[RuntimeArchiveAdapter] Bun.Tarball is not available in this Bun version')
    }

    // 正規化所有路徑為正斜線
    const normalizedEntries: Record<string, string | Blob | ArrayBuffer | Uint8Array> = {}
    for (const [entryPath, data] of Object.entries(entries)) {
      const normalized = entryPath.replace(/\\/g, '/')
      normalizedEntries[normalized] = data
    }

    const tarball = new (Bun as any).Tarball(normalizedEntries, {
      ...(options.compress !== undefined ? { compress: options.compress } : {}),
      ...(options.level !== undefined ? { level: options.level } : {}),
    })

    return new Uint8Array(await tarball.bytes())
  },

  async extract(data, targetDir, options = {}) {
    if (typeof Bun === 'undefined' || typeof (Bun as any).Tarball === 'undefined') {
      throw new Error('[RuntimeArchiveAdapter] Bun.Tarball is not available in this Bun version')
    }

    const buffer = await toArchiveUint8Array(data)
    const tarball = new (Bun as any).Tarball(buffer.buffer)

    const count = await tarball.extract(targetDir, {
      ...(options.glob !== undefined ? { glob: options.glob } : {}),
    })

    return count as number
  },

  async list(data, glob) {
    if (typeof Bun === 'undefined' || typeof (Bun as any).Tarball === 'undefined') {
      throw new Error('[RuntimeArchiveAdapter] Bun.Tarball is not available in this Bun version')
    }

    const buffer = await toArchiveUint8Array(data)
    const tarball = new (Bun as any).Tarball(buffer.buffer)
    const files = await tarball.files(glob)

    const result = new Map<string, ArchiveFileInfo>()
    const entries: [string, unknown][] =
      files instanceof Map ? Array.from(files.entries()) : Object.entries(files as object)

    for (const [entryPath, file] of entries) {
      const f = file as {
        size: number
        lastModified?: number
        text: () => Promise<string>
        arrayBuffer: () => Promise<ArrayBuffer>
      }
      result.set(entryPath, {
        path: entryPath,
        size: f.size,
        lastModified: f.lastModified ?? 0,
        text: () => f.text(),
        arrayBuffer: () => f.arrayBuffer(),
      })
    }

    return result
  },

  async readFile(data, filePath) {
    if (typeof Bun === 'undefined' || typeof (Bun as any).Tarball === 'undefined') {
      throw new Error('[RuntimeArchiveAdapter] Bun.Tarball is not available in this Bun version')
    }

    const buffer = await toArchiveUint8Array(data)
    const tarball = new (Bun as any).Tarball(buffer.buffer)
    const files = await tarball.files(filePath)

    // 支援 Map 或 object 格式的返回值
    const file: unknown = files instanceof Map ? files.get(filePath) : (files as any)[filePath]
    if (!file) {
      return null
    }

    const f = file as { arrayBuffer: () => Promise<ArrayBuffer> }
    return new Uint8Array(await f.arrayBuffer())
  },
})

/**
 * 建立 Node.js 歸檔 adapter（提示安裝 tar 可選依賴）
 * @internal
 */
const createNodeArchiveAdapter = (): RuntimeArchiveAdapter => ({
  async create(_entries, _options = {}) {
    throw new Error(
      '[RuntimeArchiveAdapter] Node.js archive support requires "tar" optional dependency. Install: npm install --save-optional tar'
    )
  },

  async extract(_data, _targetDir, _options = {}) {
    throw new Error(
      '[RuntimeArchiveAdapter] Node.js archive support requires "tar" optional dependency. Install: npm install --save-optional tar'
    )
  },

  async list(_data, _glob) {
    throw new Error(
      '[RuntimeArchiveAdapter] Node.js archive support requires "tar" optional dependency. Install: npm install --save-optional tar'
    )
  },

  async readFile(_data, _filePath) {
    throw new Error(
      '[RuntimeArchiveAdapter] Node.js archive support requires "tar" optional dependency. Install: npm install --save-optional tar'
    )
  },
})

/**
 * 建立 Deno 歸檔 adapter（尚未實作）
 * @internal
 */
const createDenoArchiveAdapter = (): RuntimeArchiveAdapter => ({
  async create(_entries, _options = {}) {
    throw new Error(
      '[RuntimeArchiveAdapter] Deno archive support not yet implemented. Use Bun or Node.js runtime.'
    )
  },

  async extract(_data, _targetDir, _options = {}) {
    throw new Error(
      '[RuntimeArchiveAdapter] Deno archive support not yet implemented. Use Bun or Node.js runtime.'
    )
  },

  async list(_data, _glob) {
    throw new Error(
      '[RuntimeArchiveAdapter] Deno archive support not yet implemented. Use Bun or Node.js runtime.'
    )
  },

  async readFile(_data, _filePath) {
    throw new Error(
      '[RuntimeArchiveAdapter] Deno archive support not yet implemented. Use Bun or Node.js runtime.'
    )
  },
})

/**
 * 建立 Unknown runtime 歸檔 adapter（不支援）
 * @internal
 */
const createUnknownArchiveAdapter = (): RuntimeArchiveAdapter => ({
  async create(_entries, _options = {}) {
    throw new Error(
      `[RuntimeArchiveAdapter] Archive support unavailable in unknown runtime. Detected runtime: ${getRuntimeKind()}`
    )
  },

  async extract(_data, _targetDir, _options = {}) {
    throw new Error(
      `[RuntimeArchiveAdapter] Archive support unavailable in unknown runtime. Detected runtime: ${getRuntimeKind()}`
    )
  },

  async list(_data, _glob) {
    throw new Error(
      `[RuntimeArchiveAdapter] Archive support unavailable in unknown runtime. Detected runtime: ${getRuntimeKind()}`
    )
  },

  async readFile(_data, _filePath) {
    throw new Error(
      `[RuntimeArchiveAdapter] Archive support unavailable in unknown runtime. Detected runtime: ${getRuntimeKind()}`
    )
  },
})

let archiveAdapter: RuntimeArchiveAdapter | null = null

/**
 * 取得歸檔操作 adapter（依運行時自動選擇最佳實作）
 * @public
 */
export const getArchiveAdapter = (): RuntimeArchiveAdapter => {
  if (archiveAdapter) {
    return archiveAdapter
  }
  const kind = getRuntimeKind()
  archiveAdapter =
    kind === 'bun'
      ? createBunArchiveAdapter()
      : kind === 'node'
        ? createNodeArchiveAdapter()
        : kind === 'deno'
          ? createDenoArchiveAdapter()
          : createUnknownArchiveAdapter()
  return archiveAdapter
}
