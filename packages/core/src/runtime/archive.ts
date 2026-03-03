/**
 * Runtime archive adapter implementations.
 *
 * @module runtime/archive
 * @since 3.2.0
 */

import { getRuntimeKind } from './detection'
import type {
  ArchiveCreateOptions,
  ArchiveFromDirectoryOptions,
  RuntimeArchiveAdapter,
} from './types'

// ============ Bun Archive Adapter ============

/**
 * 建立 Bun 原生封裝 adapter (使用 Bun.Tar)
 * @internal
 */
function createBunArchiveAdapter(): RuntimeArchiveAdapter {
  return {
    async create(entries, _options = {}) {
      // Use globalThis to avoid Vite import errors
      const B = (globalThis as any).Bun
      if (!B) throw new Error('[RuntimeArchiveAdapter] Bun global not found')
      if (!B.Tar) throw new Error('[RuntimeArchiveAdapter] Bun.Tarball is not available')

      const tar = new B.Tar()
      for (const [path, data] of Object.entries(entries)) {
        // Handle different data types
        let content: Uint8Array
        if (data instanceof Uint8Array) {
          content = data
        } else if (typeof data === 'string') {
          content = new TextEncoder().encode(data)
        } else if (data instanceof ArrayBuffer) {
          content = new Uint8Array(data)
        } else if (data instanceof Blob) {
          content = new Uint8Array(await data.arrayBuffer())
        } else {
          throw new Error(`[RuntimeArchiveAdapter] Unsupported data type for path: ${path}`)
        }
        tar.append(path, content)
      }
      return new Uint8Array(await new Response(tar.out).arrayBuffer())
    },

    async extract(_data, _targetDir, _options = {}) {
      const B = (globalThis as any).Bun
      if (!B?.Tar) throw new Error('[RuntimeArchiveAdapter] Bun.Tarball is not available')
      throw new Error('[RuntimeArchiveAdapter] Tar extraction not yet implemented via Bun.Tar')
    },

    async list(_data, _glob?) {
      const B = (globalThis as any).Bun
      if (!B?.Tar) throw new Error('[RuntimeArchiveAdapter] Bun.Tarball is not available')
      throw new Error('[RuntimeArchiveAdapter] Tar listing not yet implemented via Bun.Tar')
    },

    async readFile(_data, _filePath) {
      const B = (globalThis as any).Bun
      if (!B?.Tar) throw new Error('[RuntimeArchiveAdapter] Bun.Tarball is not available')
      throw new Error('[RuntimeArchiveAdapter] Tar readFile not yet implemented via Bun.Tar')
    },
  }
}

// ============ Node.js Archive Adapter ============

/**
 * 建立 Node.js 封裝 adapter
 * @internal
 */
function createNodeArchiveAdapter(): RuntimeArchiveAdapter {
  return {
    async create(_entries, _options = {}) {
      throw new Error(
        '[RuntimeArchiveAdapter] Node.js archive creation requires external dependencies'
      )
    },
    async extract(_data, _targetDir, _options = {}) {
      throw new Error(
        '[RuntimeArchiveAdapter] Node.js archive extraction requires external dependencies'
      )
    },
    async list(_data, _glob?) {
      throw new Error(
        '[RuntimeArchiveAdapter] Node.js archive listing requires external dependencies'
      )
    },
    async readFile(_data, _filePath) {
      throw new Error(
        '[RuntimeArchiveAdapter] Node.js archive readFile requires external dependencies'
      )
    },
  }
}

// ============ Unsupported Archive Adapter ============

/**
 * 建立不支援的封裝 adapter
 * @internal
 */
function createUnsupportedArchiveAdapter(message: string): RuntimeArchiveAdapter {
  return {
    async create() {
      throw new Error(message)
    },
    async extract() {
      throw new Error(message)
    },
    async list() {
      throw new Error(message)
    },
    async readFile() {
      throw new Error(message)
    },
  }
}

// ============ Singleton ============

let archiveAdapter: RuntimeArchiveAdapter | null = null

/**
 * 取得封裝操作 adapter
 * @public
 */
export function getArchiveAdapter(): RuntimeArchiveAdapter {
  if (archiveAdapter) {
    return archiveAdapter
  }
  const kind = getRuntimeKind()
  switch (kind) {
    case 'bun':
      archiveAdapter = createBunArchiveAdapter()
      break
    case 'node':
      archiveAdapter = createNodeArchiveAdapter()
      break
    default:
      archiveAdapter = createUnsupportedArchiveAdapter(
        `[RuntimeArchiveAdapter] Archive operations unavailable in unknown runtime: ${kind}`
      )
  }
  return archiveAdapter
}

/**
 * 使用 Node.js readdir 遞迴掃描目錄（Fallback 實作）
 * @internal
 */
async function scanDirectoryNode(dir: string): Promise<Record<string, Uint8Array>> {
  // biome-ignore lint/security/noGlobalEval: hide from Vite
  const fs = await eval('import("node:fs/promises")')
  // biome-ignore lint/security/noGlobalEval: hide from Vite
  const path = await eval('import("node:path")')

  const { readdir, readFile, stat } = fs
  const { join } = path
  const entries: Record<string, Uint8Array> = {}

  async function walk(currentDir: string, base: string) {
    const files = await readdir(currentDir)
    for (const file of files) {
      const fullPath = join(currentDir, file)
      const relativePath = join(base, file)
      const s = await stat(fullPath)

      if (s.isDirectory()) {
        await walk(fullPath, relativePath)
      } else {
        entries[relativePath] = new Uint8Array(await readFile(fullPath))
      }
    }
  }

  await walk(dir, '')
  return entries
}

/**
 * 將目錄封裝為歸檔檔案
 * @public
 */
export async function archiveFromDirectory(
  dirPath: string,
  archivePath: string,
  options: ArchiveFromDirectoryOptions = {}
): Promise<Uint8Array> {
  const kind = getRuntimeKind()
  const createOptions: ArchiveCreateOptions = {
    compress: options.compress === 'gzip' ? 'gzip' : undefined,
    level: options.level,
  }

  let entries: Record<string, Uint8Array> = {}

  if (kind === 'bun') {
    const B = (globalThis as any).Bun
    const glob = new B.Glob(options.glob ?? '**/*')
    for await (const file of glob.scan(dirPath)) {
      // biome-ignore lint/security/noGlobalEval: hide from Vite
      const pathMod = await eval('import("node:path")')
      const filePath = pathMod.join(dirPath, file)
      entries[file] = new Uint8Array(await B.file(filePath).arrayBuffer())
    }
  } else {
    entries = await scanDirectoryNode(dirPath)
  }

  const adapter = getArchiveAdapter()
  const archiveData = await adapter.create(entries, createOptions)

  // biome-ignore lint/security/noGlobalEval: hide from Vite
  const fs = await eval('import("node:fs/promises")')
  await fs.writeFile(archivePath, archiveData)

  return archiveData
}
