import { getRuntimeAdapter, type RuntimeAdapter, type RuntimeFileSink } from './runtime'

/**
 * Safe append file operation with automatic fallback to node:fs/promises if not supported
 * @public
 */
export async function runtimeAppendFile(
  adapter: RuntimeAdapter,
  path: string,
  data: string
): Promise<void> {
  if (adapter.appendFile) {
    return adapter.appendFile(path, data)
  }
  // Fallback: use node:fs/promises
  const fs = await import('node:fs/promises')
  await fs.appendFile(path, data, 'utf8')
}

/**
 * Safe text file reading with automatic fallback to node:fs/promises if not supported
 * @public
 */
export async function runtimeReadText(adapter: RuntimeAdapter, path: string): Promise<string> {
  if (adapter.readFileAsText) {
    return adapter.readFileAsText(path)
  }
  // Fallback: read as buffer and decode
  const buffer = await adapter.readFile(path)
  return new TextDecoder().decode(buffer)
}

/**
 * Safe JSON file reading with automatic fallback
 * @public
 */
export async function runtimeReadJSON<T = unknown>(
  adapter: RuntimeAdapter,
  path: string
): Promise<T> {
  if (adapter.readFileAsJSON) {
    return adapter.readFileAsJSON<T>(path)
  }
  // Fallback: read as text and parse
  const text = await runtimeReadText(adapter, path)
  return JSON.parse(text || '{}') as T
}

/**
 * Safe directory creation with automatic fallback
 * @public
 */
export async function runtimeMkdir(
  adapter: RuntimeAdapter,
  path: string,
  options?: { recursive?: boolean }
): Promise<void> {
  if (adapter.mkdir) {
    return adapter.mkdir(path, options)
  }
  // Fallback: use node:fs/promises
  const fs = await import('node:fs/promises')
  await fs.mkdir(path, { recursive: options?.recursive ?? true })
}

/**
 * Safe directory reading with automatic fallback
 * @public
 */
export async function runtimeReadDir(
  adapter: RuntimeAdapter,
  path: string
): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>> {
  if (adapter.readDir) {
    return adapter.readDir(path)
  }
  // Fallback: use node:fs/promises
  const fs = await import('node:fs/promises')
  const entries = await fs.readdir(path, { withFileTypes: true })
  return entries.map((e) => ({
    name: e.name,
    isFile: e.isFile(),
    isDirectory: e.isDirectory(),
  }))
}

/**
 * Safe full file statistics reading with automatic fallback
 * @public
 */
export async function runtimeStatFull(
  adapter: RuntimeAdapter,
  path: string
): Promise<{ size: number; mtimeMs: number; isFile: boolean; isDirectory: boolean }> {
  if (adapter.statFull) {
    return adapter.statFull(path)
  }
  // Fallback: use node:fs/promises and stat()
  const fs = await import('node:fs/promises')
  const stats = await fs.stat(path)
  return {
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
  }
}

/**
 * Safe file rename/move with automatic fallback
 * @public
 */
export async function runtimeRename(
  adapter: RuntimeAdapter,
  oldPath: string,
  newPath: string
): Promise<void> {
  if (adapter.rename) {
    return adapter.rename(oldPath, newPath)
  }
  // Fallback: use node:fs/promises
  const fs = await import('node:fs/promises')
  await fs.rename(oldPath, newPath)
}

/**
 * Safe file sink creation with automatic fallback
 * @public
 */
export function runtimeCreateFileSink(adapter: RuntimeAdapter, path: string): RuntimeFileSink {
  if (adapter.createFileSink) {
    return adapter.createFileSink(path)
  }
  // Fallback: simple write accumulator (not efficient but functional)
  const chunks: Uint8Array[] = []
  return {
    write(data) {
      const buffer =
        typeof data === 'string'
          ? new TextEncoder().encode(data)
          : data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : data
      chunks.push(buffer)
    },
    async flush() {
      // Flush all accumulated chunks to disk
      if (chunks.length > 0) {
        const full = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          full.set(chunk, offset)
          offset += chunk.length
        }
        await adapter.writeFile(path, full)
      }
    },
    async end() {
      await this.flush()
      chunks.length = 0
    },
  }
}

/**
 * Safe recursive directory removal with automatic fallback
 * @public
 */
export async function runtimeRemoveRecursive(adapter: RuntimeAdapter, path: string): Promise<void> {
  if (adapter.removeRecursive) {
    return adapter.removeRecursive(path)
  }
  // Fallback: use node:fs/promises
  const fs = await import('node:fs/promises')
  try {
    await fs.rm(path, { recursive: true, force: true })
  } catch {
    // Ignore if not found
  }
}

/**
 * Safe exclusive file write with automatic fallback
 * @public
 */
export async function runtimeWriteFileExclusive(
  adapter: RuntimeAdapter,
  path: string,
  data: string | Uint8Array
): Promise<void> {
  if (adapter.writeFileExclusive) {
    return adapter.writeFileExclusive(path, data)
  }
  // Fallback: use node:fs/promises
  const fs = await import('node:fs/promises')
  const payload = typeof data === 'string' ? data : new TextDecoder().decode(data)
  await fs.writeFile(path, payload, { flag: 'wx' })
}

/**
 * Get default runtime adapter instance
 * @public
 */
export function getDefaultRuntimeAdapter(): RuntimeAdapter {
  return getRuntimeAdapter()
}
