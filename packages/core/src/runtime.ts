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
}

/**
 * File statistics abstraction
 * @public
 */
export interface RuntimeFileStat {
  size: number
  mtimeMs?: number
}

/**
 * Incremental file writing interface (FileSink abstraction)
 * @public
 */
export interface RuntimeFileSink {
  /** Write data to the file sink */
  write(data: string | Uint8Array | ArrayBuffer): void
  /** Flush buffered data to disk */
  flush(): Promise<void>
  /** Close the sink and flush remaining data */
  end(): Promise<void>
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
  writeFile(path: string, data: Blob | Buffer | string | ArrayBuffer | Uint8Array): Promise<void>
  readFile(path: string): Promise<Uint8Array>
  readFileAsBlob(path: string): Promise<Blob>
  exists(path: string): Promise<boolean>
  stat(path: string): Promise<RuntimeFileStat>
  deleteFile(path: string): Promise<void>
  serve(config: RuntimeServeConfig): RuntimeServer

  /** Append data to a file (optional) */
  appendFile?(path: string, data: string | Uint8Array): Promise<void>
  /** Read file as UTF-8 text (optional) */
  readFileAsText?(path: string): Promise<string>
  /** Read and parse JSON file (optional) */
  readFileAsJSON?<T = unknown>(path: string): Promise<T>
  /** Create directory (optional) */
  mkdir?(path: string, options?: { recursive?: boolean }): Promise<void>
  /** Read directory contents (optional) */
  readDir?(path: string): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>>
  /** Get full file statistics including modification time (optional) */
  statFull?(
    path: string
  ): Promise<{ size: number; mtimeMs: number; isFile: boolean; isDirectory: boolean }>
  /** Rename/move a file (optional) */
  rename?(oldPath: string, newPath: string): Promise<void>
  /** Create an incremental file writer (FileSink) (optional) */
  createFileSink?(path: string): RuntimeFileSink
  /** Recursively remove a directory (optional) */
  removeRecursive?(path: string): Promise<void>
  /** Create/write a file exclusively (atomic) (optional) */
  writeFileExclusive?(path: string, data: string | Uint8Array): Promise<void>
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
    return {
      exited: proc.exited,
      stdout: proc.stdout ?? null,
      stderr: proc.stderr ?? null,
      kill: (signal?: string | number) => {
        const bunSignal =
          typeof signal === 'number' ? signal : (signal as NodeJS.Signals | undefined)
        proc.kill(bunSignal)
      },
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
    return { size: stats.size, mtimeMs: (stats as any).mtimeMs ?? stats.mtime?.getTime() }
  },
  async deleteFile(path) {
    const fs = await import('node:fs/promises')
    try {
      await fs.unlink(path)
    } catch {
      // Ignore if not found
    }
  },
  async appendFile(path, data) {
    const file = Bun.file(path)
    const writer = file.writer()
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data
    writer.write(buffer)
    await writer.end()
  },
  async readFileAsText(path) {
    return await Bun.file(path).text()
  },
  async readFileAsJSON<T = unknown>(path: string): Promise<T> {
    return (await Bun.file(path).json()) as T
  },
  async mkdir(path, options = {}) {
    const fs = await import('node:fs/promises')
    await fs.mkdir(path, { recursive: options.recursive ?? true })
  },
  async readDir(path) {
    const fs = await import('node:fs/promises')
    const entries = await fs.readdir(path, { withFileTypes: true })
    return entries.map((e) => ({
      name: e.name,
      isFile: e.isFile(),
      isDirectory: e.isDirectory(),
    }))
  },
  async statFull(path) {
    const file = Bun.file(path)
    const stats = await file.stat()
    const statsAny = stats as any
    return {
      size: stats.size,
      mtimeMs: statsAny.mtimeMs ?? stats.mtime?.getTime() ?? 0,
      isFile:
        typeof statsAny.isFile === 'function' ? statsAny.isFile() : (statsAny.isFile ?? false),
      isDirectory:
        typeof statsAny.isDirectory === 'function'
          ? statsAny.isDirectory()
          : (statsAny.isDirectory ?? false),
    }
  },
  async rename(oldPath, newPath) {
    const fs = await import('node:fs/promises')
    await fs.rename(oldPath, newPath)
  },
  createFileSink(path) {
    const file = Bun.file(path)
    const writer = file.writer()
    return {
      write(data) {
        const buffer =
          typeof data === 'string'
            ? new TextEncoder().encode(data)
            : data instanceof ArrayBuffer
              ? new Uint8Array(data)
              : data
        writer.write(buffer)
      },
      async flush() {
        await writer.flush()
      },
      async end() {
        await writer.end()
      },
    }
  },
  async removeRecursive(path) {
    const fs = await import('node:fs/promises')
    try {
      await fs.rm(path, { recursive: true, force: true })
    } catch {
      // Ignore if not found
    }
  },
  async writeFileExclusive(path, data) {
    const fs = await import('node:fs/promises')
    const payload = typeof data === 'string' ? data : new TextDecoder().decode(data)
    await fs.writeFile(path, payload, { flag: 'wx' })
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

    const exited = new Promise<number>((resolve, reject) => {
      child.on('error', reject)
      child.on('exit', (code) => resolve(code ?? 0))
    })

    return {
      exited,
      stdout: toWeb(child.stdout),
      stderr: toWeb(child.stderr),
      kill: (signal?: string | number) => child.kill(signal as NodeJS.Signals | number),
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
    return { size: stats.size, mtimeMs: stats.mtimeMs }
  },
  async deleteFile(path) {
    const fs = await import('node:fs/promises')
    try {
      await fs.unlink(path)
    } catch {
      // Ignore if not found
    }
  },
  async appendFile(path, data) {
    const fs = await import('node:fs/promises')
    const buffer = typeof data === 'string' ? data : new TextDecoder().decode(data)
    await fs.appendFile(path, buffer, 'utf8')
  },
  async readFileAsText(path) {
    const fs = await import('node:fs/promises')
    return await fs.readFile(path, 'utf8')
  },
  async readFileAsJSON<T = unknown>(path: string): Promise<T> {
    const fs = await import('node:fs/promises')
    const text = await fs.readFile(path, 'utf8')
    return JSON.parse(text || '{}') as T
  },
  async mkdir(path, options = {}) {
    const fs = await import('node:fs/promises')
    await fs.mkdir(path, { recursive: options.recursive ?? true })
  },
  async readDir(path) {
    const fs = await import('node:fs/promises')
    const entries = await fs.readdir(path, { withFileTypes: true })
    return entries.map((e) => ({
      name: e.name,
      isFile: e.isFile(),
      isDirectory: e.isDirectory(),
    }))
  },
  async statFull(path) {
    const fs = await import('node:fs/promises')
    const stats = await fs.stat(path)
    return {
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    }
  },
  async rename(oldPath, newPath) {
    const fs = await import('node:fs/promises')
    await fs.rename(oldPath, newPath)
  },
  createFileSink(path) {
    let writer: NodeJS.WritableStream | null = null
    const fsPromise = import('node:fs/promises').then(() => {
      const nodeFs = require('node:fs') as typeof import('node:fs')
      writer = nodeFs.createWriteStream(path)
      return writer
    })

    return {
      write(data) {
        if (!writer) return
        const buffer =
          typeof data === 'string'
            ? new TextEncoder().encode(data)
            : data instanceof ArrayBuffer
              ? new Uint8Array(data)
              : data
        writer.write(buffer)
      },
      async flush() {
        if (!writer) await fsPromise
        // Node.js streams don't have explicit flush, but the buffer is managed internally
      },
      async end() {
        if (!writer) await fsPromise
        return new Promise<void>((resolve, reject) => {
          if (!writer) {
            resolve()
            return
          }
          writer.end(() => resolve())
          writer.on('error', reject)
        })
      },
    }
  },
  async removeRecursive(path) {
    const fs = await import('node:fs/promises')
    try {
      await fs.rm(path, { recursive: true, force: true })
    } catch {
      // Ignore if not found
    }
  },
  async writeFileExclusive(path, data) {
    const fs = await import('node:fs/promises')
    const payload = typeof data === 'string' ? data : new TextDecoder().decode(data)
    await fs.writeFile(path, payload, { flag: 'wx' })
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

    const exited = proc.status.then((status: { code: number }) => status.code ?? 0)

    return {
      exited,
      stdout: (proc.stdout as unknown as ReadableStream<Uint8Array>) ?? null,
      stderr: (proc.stderr as unknown as ReadableStream<Uint8Array>) ?? null,
      kill: (signal?: string | number) => {
        const killSignal = typeof signal === 'string' ? signal : 'SIGTERM'
        proc.kill(killSignal)
      },
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
    return { size: stats.size, mtimeMs: stats.mtime?.getTime() }
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
  async appendFile(path, data) {
    const deno = (globalThis as any).Deno
    if (!deno?.open) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for appendFile()')
    }
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const file = await deno.open(path, { write: true, create: true, append: true })
    await file.writeSync(buffer)
    file.close()
  },
  async readFileAsText(path) {
    const deno = (globalThis as any).Deno
    if (!deno?.readTextFile) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for readFileAsText()')
    }
    return await deno.readTextFile(path)
  },
  async readFileAsJSON<T = unknown>(path: string): Promise<T> {
    const deno = (globalThis as any).Deno
    if (!deno?.readTextFile) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for readFileAsJSON()')
    }
    const text = await deno.readTextFile(path)
    return JSON.parse(text || '{}') as T
  },
  async mkdir(path, options = {}) {
    const deno = (globalThis as any).Deno
    if (!deno?.mkdir) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for mkdir()')
    }
    await deno.mkdir(path, { recursive: options.recursive ?? true })
  },
  async readDir(path) {
    const deno = (globalThis as any).Deno
    if (!deno?.readDir) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for readDir()')
    }
    const entries: Array<{ name: string; isFile: boolean; isDirectory: boolean }> = []
    for await (const entry of await deno.readDir(path)) {
      entries.push({
        name: entry.name,
        isFile: entry.isFile,
        isDirectory: entry.isDirectory,
      })
    }
    return entries
  },
  async statFull(path) {
    const deno = (globalThis as any).Deno
    if (!deno?.stat) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for statFull()')
    }
    const stats = await deno.stat(path)
    return {
      size: stats.size,
      mtimeMs: stats.mtime?.getTime() ?? 0,
      isFile: stats.isFile,
      isDirectory: stats.isDirectory,
    }
  },
  async rename(oldPath, newPath) {
    const deno = (globalThis as any).Deno
    if (!deno?.rename) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for rename()')
    }
    await deno.rename(oldPath, newPath)
  },
  createFileSink(path) {
    const deno = (globalThis as any).Deno
    let file: any = null

    return {
      async write(data) {
        if (!file) {
          if (!deno?.open) {
            throw new Error('[RuntimeAdapter] Deno runtime is required for createFileSink()')
          }
          file = await deno.open(path, { write: true, create: true })
        }
        const buffer =
          typeof data === 'string'
            ? new TextEncoder().encode(data)
            : data instanceof ArrayBuffer
              ? new Uint8Array(data)
              : data
        await file.write(buffer)
      },
      async flush() {
        if (file?.syncSync) {
          file.syncSync()
        }
      },
      async end() {
        if (file) {
          file.close()
          file = null
        }
      },
    }
  },
  async removeRecursive(path) {
    const deno = (globalThis as any).Deno
    if (!deno?.remove) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for removeRecursive()')
    }
    try {
      await deno.remove(path, { recursive: true })
    } catch {
      // Ignore if not found
    }
  },
  async writeFileExclusive(path, data) {
    const deno = (globalThis as any).Deno
    if (!deno?.open) {
      throw new Error('[RuntimeAdapter] Deno runtime is required for writeFileExclusive()')
    }
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const file = await deno.open(path, { write: true, create: true, createNew: true })
    await file.write(buffer)
    file.close()
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
  async appendFile() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for appendFile()')
  },
  async readFileAsText() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for readFileAsText()')
  },
  async readFileAsJSON() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for readFileAsJSON()')
  },
  async mkdir() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for mkdir()')
  },
  async readDir() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for readDir()')
  },
  async statFull() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for statFull()')
  },
  async rename() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for rename()')
  },
  createFileSink() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for createFileSink()')
  },
  async removeRecursive() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for removeRecursive()')
  },
  async writeFileExclusive() {
    throw new Error('[RuntimeAdapter] Unsupported runtime for writeFileExclusive()')
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
