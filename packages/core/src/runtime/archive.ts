/**
 * Runtime archive adapter implementations.
 *
 * @module runtime/archive
 * @since 3.2.0
 */

import { getRuntimeKind } from './detection'
import type {
  ArchiveCreateOptions,
  ArchiveFileInfo,
  ArchiveFromDirectoryOptions,
  RuntimeArchiveAdapter,
} from './types'

// ============ Utility ============

/**
 * 將 Blob/ArrayBuffer/Uint8Array 統一轉換為 Uint8Array（歸檔專用）
 * @internal
 */
async function toArchiveUint8Array(data: Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (data instanceof Uint8Array) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  return new Uint8Array(await data.arrayBuffer())
}

// ============ Bun Archive Adapter ============

/**
 * 建立 Bun 原生歸檔 adapter（使用 Bun.Tarball API）
 * @internal
 */
function createBunArchiveAdapter(): RuntimeArchiveAdapter {
  return {
    async create(entries, options = {}) {
      if (typeof Bun === 'undefined' || typeof (Bun as any).Tarball === 'undefined') {
        throw new Error('[RuntimeArchiveAdapter] Bun.Tarball is not available in this Bun version')
      }

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

      const file: unknown = files instanceof Map ? files.get(filePath) : (files as any)[filePath]
      if (!file) {
        return null
      }

      const f = file as {
        arrayBuffer: () => Promise<ArrayBuffer>
      }
      return new Uint8Array(await f.arrayBuffer())
    },
  }
}

// ============ Unsupported Archive Adapter ============

/**
 * 建立不支援的歸檔 adapter（Node.js / Deno / Unknown runtime 共用）
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
 * 取得歸檔操作 adapter（依運行時自動選擇最佳實作）
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
      archiveAdapter = createUnsupportedArchiveAdapter(
        '[RuntimeArchiveAdapter] Node.js archive support requires "tar" optional dependency. ' +
          'Install: npm install --save-optional tar'
      )
      break
    case 'deno':
      archiveAdapter = createUnsupportedArchiveAdapter(
        '[RuntimeArchiveAdapter] Deno archive support not yet implemented. Use Bun or Node.js runtime.'
      )
      break
    default:
      archiveAdapter = createUnsupportedArchiveAdapter(
        `[RuntimeArchiveAdapter] Archive support unavailable in unknown runtime. Detected: ${kind}`
      )
  }
  return archiveAdapter
}

// ============ archiveFromDirectory ============

/**
 * 驗證歸檔路徑，確保使用正確的副檔名
 * @internal
 */
function validateArchivePath(archivePath: string): void {
  if (!archivePath || archivePath.trim() === '') {
    throw new Error('[RuntimeArchiveAdapter] archivePath cannot be empty')
  }
  if (!archivePath.endsWith('.tar.gz') && !archivePath.endsWith('.tgz')) {
    throw new Error(
      `[RuntimeArchiveAdapter] archivePath must end with .tar.gz or .tgz, got: ${archivePath}`
    )
  }
}

/**
 * 使用 Bun.Glob.scan() 掃描目錄（高效能原生實作）
 * @internal
 */
async function scanDirectoryBun(
  dir: string,
  globPattern?: string
): Promise<Record<string, Uint8Array>> {
  const entries: Record<string, Uint8Array> = {}
  const pattern = globPattern ?? '**/*'
  const glob = new Bun.Glob(pattern)

  for await (const path of glob.scan({
    cwd: dir,
    dot: false,
    onlyFiles: true,
  })) {
    const fullPath = `${dir}/${path}`
    const file = Bun.file(fullPath)
    const buffer = await file.arrayBuffer()
    entries[path] = new Uint8Array(buffer)
  }

  return entries
}

/**
 * 使用 Node.js readdir 遞迴掃描目錄（Fallback 實作）
 * @internal
 */
async function scanDirectoryNode(dir: string): Promise<Record<string, Uint8Array>> {
  // biome-ignore lint/security/noGlobalEval: hide from bundlers
  const fs = await eval('import("node:fs/promises")')
  // biome-ignore lint/security/noGlobalEval: hide from bundlers
  const path = await eval('import("node:path")')
  
  const { readdir, readFile, stat } = fs
  const { join } = path
  const entries: Record<string, Uint8Array> = {}

  async function walk(currentDir: string, prefix = ''): Promise<void> {
    const items = await readdir(currentDir)
    for (const item of items) {
      const itemPath = join(currentDir, item)
      const itemStat = await stat(itemPath)

      if (itemStat.isDirectory()) {
        await walk(itemPath, `${prefix}${item}/`)
      } else {
        const relativePath = `${prefix}${item}`.replace(/\\/g, '/')
        const buffer = await readFile(itemPath)
        entries[relativePath] = new Uint8Array(buffer)
      }
    }
  }

  await walk(dir)
  return entries
}

/**
 * 將整個目錄打包為壓縮歸檔。
 *
 * 在 Bun 環境下使用 Bun.Glob.scan() 進行高效能掃描（10-100x 更快），
 * 在 Node.js 環境下使用 readdir + stat 遞迴掃描。
 *
 * @param dir - 要打包的來源目錄
 * @param archivePath - 歸檔輸出路徑（必須以 .tar.gz 或 .tgz 結尾）
 * @param options - 壓縮選項
 * @returns 歸檔二進位資料
 *
 * @example
 * ```typescript
 * const data = await archiveFromDirectory('./dist', './dist.tar.gz')
 * ```
 *
 * @public
 */
export async function archiveFromDirectory(
  dir: string,
  archivePath: string,
  options: ArchiveFromDirectoryOptions = {}
): Promise<Uint8Array> {
  validateArchivePath(archivePath)

  const kind = getRuntimeKind()
  const entries =
    kind === 'bun' ? await scanDirectoryBun(dir, options.glob) : await scanDirectoryNode(dir)

  const createOptions: ArchiveCreateOptions = {
    compress: options.compress ?? 'gzip',
    ...(options.level !== undefined ? { level: options.level } : {}),
  }

  const adapter = getArchiveAdapter()
  const archiveData = await adapter.create(entries, createOptions)

  // biome-ignore lint/security/noGlobalEval: hide from bundlers
  const { writeFile } = await eval('import("node:fs/promises")')
  await writeFile(archivePath, archiveData)

  return archiveData
}
