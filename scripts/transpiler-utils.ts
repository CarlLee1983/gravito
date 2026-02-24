#!/usr/bin/env bun

/**
 * @fileoverview 腳本層級 Transpiler 工具庫
 *
 * 為 scripts/ 目錄下的工具腳本提供共享的 Bun.Transpiler 快取與工具函式。
 * 此模組為獨立實現，不依賴 @gravito/core 的內部 API，
 * 以避免循環依賴或複雜的包導入問題。
 *
 * 核心功能：
 * 1. ScriptTranspilerCache - 管理共享 Transpiler 實例，避免重複建立（每次約 40µs）
 * 2. scanFileImports() - 掃描單一檔案的 import 語句
 * 3. scanDirectoryImports() - 批量掃描目錄中的所有 TS/TSX 檔案
 * 4. buildImportGraph() - 建立套件的實際 import 依賴圖（代碼級別）
 *
 * 性能特性：
 * - Transpiler 實例共享（5.9x 加速）
 * - LRU 快取轉換結果（避免重複掃描相同內容）
 * - 並行掃描支援（透過 Promise.all）
 *
 * @module scripts/transpiler-utils
 */

import { join, resolve } from 'node:path'
import { Glob } from 'bun'

// ─────────────────────────────────────────────────────────────────────────────
// 型別定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 單一 import 語句的資訊
 */
export interface ImportInfo {
  /** import 的模組路徑（如 '@gravito/core'、'./utils' 等） */
  path: string
  /** import 類型：值導入、型別導入、或全部 */
  kind: 'import-statement' | 'dynamic-import' | 'require-call' | 'import-equals' | string
}

/**
 * 單一檔案的掃描結果
 */
export interface FileScanResult {
  /** 檔案絕對路徑 */
  filePath: string
  /** 檔案中所有的 import 語句 */
  imports: ImportInfo[]
  /** 掃描是否成功（失敗時 imports 為空） */
  success: boolean
  /** 失敗原因（僅在 success === false 時存在） */
  error?: string
}

/**
 * 套件層級的掃描結果
 */
export interface PackageScanResult {
  /** 套件名稱（如 '@gravito/core'） */
  packageName: string
  /** 套件根目錄 */
  packagePath: string
  /** 所有掃描的檔案結果 */
  files: FileScanResult[]
  /** 實際使用的 @gravito/* 依賴（從代碼 import 中提取） */
  actualGravitoDeps: Set<string>
  /** 所有 import 路徑（包含外部依賴） */
  allImports: Set<string>
}

/**
 * 快取條目
 */
interface CacheEntry {
  imports: ImportInfo[]
  createdAt: number
}

// ─────────────────────────────────────────────────────────────────────────────
// ScriptTranspilerCache - 腳本層級快取
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 腳本層級的 Transpiler 快取
 *
 * 管理一個共享的 Bun.Transpiler 實例（tsx loader），
 * 並快取 scanImports 結果，避免重複解析相同的檔案內容。
 *
 * @example
 * ```typescript
 * const cache = ScriptTranspilerCache.getInstance()
 * const imports = cache.scanImports(source)
 * ```
 */
export class ScriptTranspilerCache {
  private static instance: ScriptTranspilerCache | null = null

  /** 共享的 Bun.Transpiler 實例（tsx loader 支援 JSX + TypeScript） */
  private readonly tsTranspiler: Bun.Transpiler
  private readonly tsxTranspiler: Bun.Transpiler

  /** LRU 快取：檔案內容 hash → 掃描結果 */
  private readonly cache: Map<string, CacheEntry>

  /** 快取大小上限（條目數） */
  private readonly maxSize: number

  /** 快取 TTL（毫秒），預設 10 分鐘（腳本執行期間通常不超過此時間） */
  private readonly ttlMs: number

  /** 統計資訊 */
  private stats = { hits: 0, misses: 0, errors: 0 }

  private constructor(maxSize = 1024, ttlMs = 10 * 60 * 1000) {
    // 建立兩個 Transpiler：一個給 .ts，一個給 .tsx
    this.tsTranspiler = new Bun.Transpiler({ loader: 'ts', trimUnusedImports: false })
    this.tsxTranspiler = new Bun.Transpiler({ loader: 'tsx', trimUnusedImports: false })
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttlMs = ttlMs
  }

  /**
   * 取得單例實例
   */
  static getInstance(): ScriptTranspilerCache {
    ScriptTranspilerCache.instance ??= new ScriptTranspilerCache()
    return ScriptTranspilerCache.instance
  }

  /**
   * 重置單例（主要用於測試）
   */
  static resetInstance(): void {
    ScriptTranspilerCache.instance = null
  }

  /**
   * 掃描原始碼中的所有 import 語句
   *
   * @param source - TypeScript/TSX 原始碼字串
   * @param isTsx - 是否為 TSX 檔案（預設 false）
   * @returns import 語句陣列，失敗時回傳空陣列
   */
  scanImports(source: string, isTsx = false): ImportInfo[] {
    // 使用簡化的快取鍵（前 200 字元 + 長度，避免大字串比較）
    const cacheKey = `${isTsx ? 'x' : 't'}:${source.length}:${source.slice(0, 200)}`

    // 嘗試快取命中
    const cached = this.cache.get(cacheKey)
    if (cached !== undefined) {
      if (Date.now() - cached.createdAt < this.ttlMs) {
        this.stats.hits++
        return cached.imports
      }
      this.cache.delete(cacheKey)
    }

    this.stats.misses++

    // 執行掃描
    try {
      const transpiler = isTsx ? this.tsxTranspiler : this.tsTranspiler
      const rawImports = transpiler.scanImports(source)
      const imports: ImportInfo[] = rawImports.map((imp) => ({
        path: imp.path,
        kind: imp.kind,
      }))

      // 淘汰舊條目
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value
        if (firstKey !== undefined) {
          this.cache.delete(firstKey)
        }
      }

      this.cache.set(cacheKey, { imports, createdAt: Date.now() })
      return imports
    } catch {
      this.stats.errors++
      return []
    }
  }

  /**
   * 取得統計資訊
   */
  getStats(): { hits: number; misses: number; errors: number; cacheSize: number } {
    return { ...this.stats, cacheSize: this.cache.size }
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, errors: 0 }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 工具函式
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 掃描單一檔案中的所有 import 語句
 *
 * 使用 Bun.file().text() 讀取檔案，並透過 TranspilerCache 解析 import。
 *
 * @param filePath - 檔案絕對路徑
 * @returns 掃描結果（含 import 陣列與錯誤資訊）
 *
 * @example
 * ```typescript
 * const result = await scanFileImports('/path/to/file.ts')
 * console.log(result.imports.filter(i => i.path.startsWith('@gravito/')))
 * ```
 */
export async function scanFileImports(filePath: string): Promise<FileScanResult> {
  try {
    const source = await Bun.file(filePath).text()
    const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
    const cache = ScriptTranspilerCache.getInstance()
    const imports = cache.scanImports(source, isTsx)

    return { filePath, imports, success: true }
  } catch (error) {
    return {
      filePath,
      imports: [],
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 批量掃描目錄中的所有 TypeScript 檔案
 *
 * 使用 Bun Glob 找出所有 .ts/.tsx 檔案，並並行掃描所有 import 語句。
 *
 * @param dirPath - 目錄絕對路徑
 * @param options - 掃描選項
 * @returns 所有檔案的掃描結果
 *
 * @example
 * ```typescript
 * const results = await scanDirectoryImports('/path/to/src', { concurrency: 8 })
 * ```
 */
export async function scanDirectoryImports(
  dirPath: string,
  options: {
    /** 並行掃描數量（預設 16） */
    concurrency?: number
    /** 是否包含 .d.ts 聲明檔（預設 false） */
    includeDeclarations?: boolean
  } = {}
): Promise<FileScanResult[]> {
  const { concurrency = 16, includeDeclarations = false } = options

  // 使用 Glob 找出所有 TS/TSX 檔案
  // 注意：dirPath 已經是目標目錄（如 src/），pattern 不需要再加 src/ 前綴
  const glob = new Glob('**/*.{ts,tsx}')

  const filePaths: string[] = []
  for (const file of glob.scanSync({ cwd: dirPath })) {
    // 預設排除 .d.ts 聲明檔
    if (!includeDeclarations && file.endsWith('.d.ts')) {
      continue
    }
    filePaths.push(join(dirPath, file))
  }

  // 並行掃描（批次控制並行數量）
  const results: FileScanResult[] = []
  for (let i = 0; i < filePaths.length; i += concurrency) {
    const batch = filePaths.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map((fp) => scanFileImports(fp)))
    results.push(...batchResults)
  }

  return results
}

/**
 * 從掃描結果中提取 @gravito/* 依賴
 *
 * 過濾出所有 `@gravito/` 前綴的 import，
 * 排除自身（避免 @gravito/core 導入 @gravito/core）。
 *
 * @param results - 掃描結果陣列
 * @param selfName - 自身套件名稱（用於排除）
 * @returns 實際使用的 @gravito/* 套件名稱 Set
 */
export function extractGravitoDeps(results: FileScanResult[], selfName: string): Set<string> {
  const deps = new Set<string>()

  for (const file of results) {
    for (const imp of file.imports) {
      if (imp.path.startsWith('@gravito/') && imp.path !== selfName) {
        // 只取包名，不含子路徑（如 '@gravito/core/utils' → '@gravito/core'）
        const pkgName = imp.path.split('/').slice(0, 2).join('/')
        deps.add(pkgName)
      }
    }
  }

  return deps
}

/**
 * 掃描整個套件的 import 依賴
 *
 * 組合 scanDirectoryImports + extractGravitoDeps，
 * 返回完整的套件掃描結果。
 *
 * @param packagePath - 套件根目錄（含 package.json 的目錄）
 * @param packageName - 套件名稱（從 package.json 讀取）
 * @returns 套件掃描結果
 *
 * @example
 * ```typescript
 * const result = await scanPackageDeps('/path/to/packages/core', '@gravito/core')
 * console.log(result.actualGravitoDeps)
 * ```
 */
export async function scanPackageDeps(
  packagePath: string,
  packageName: string
): Promise<PackageScanResult> {
  const srcPath = join(packagePath, 'src')

  // 嘗試掃描 src/ 目錄
  let files: FileScanResult[] = []
  try {
    files = await scanDirectoryImports(srcPath)
  } catch {
    // src/ 不存在，嘗試根目錄
    try {
      files = await scanDirectoryImports(packagePath)
    } catch {
      // 套件無可掃描的 TS 檔案
    }
  }

  const actualGravitoDeps = extractGravitoDeps(files, packageName)
  const allImports = new Set<string>()

  for (const file of files) {
    for (const imp of file.imports) {
      allImports.add(imp.path)
    }
  }

  return {
    packageName,
    packagePath,
    files,
    actualGravitoDeps,
    allImports,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 性能計時工具
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 性能計時器
 *
 * 輸出耗時統計，方便比較新舊版本的性能差異。
 *
 * @example
 * ```typescript
 * const timer = createTimer()
 * // ... 執行操作 ...
 * const elapsed = timer.elapsed()
 * console.log(timer.format(elapsed, '掃描完成'))
 * ```
 */
export function createTimer() {
  const start = performance.now()

  return {
    /**
     * 取得已過時間（毫秒）
     */
    elapsed(): number {
      return performance.now() - start
    },

    /**
     * 格式化耗時輸出
     *
     * @param ms - 耗時（毫秒）
     * @param label - 描述標籤
     * @param oldMs - 舊版本耗時（用於計算加速比，可選）
     */
    format(ms: number, label: string, oldMs?: number): string {
      const time = ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`

      if (oldMs !== undefined && oldMs > 0) {
        const speedup = (oldMs / ms).toFixed(1)
        return `${label} (${time}, 相比舊版快 ${speedup}x)`
      }

      return `${label} (${time})`
    },
  }
}

/**
 * 找出所有套件目錄（packages/ 和 satellites/）
 *
 * @param rootDir - monorepo 根目錄
 * @param includeDirs - 要掃描的子目錄（預設 ['packages', 'satellites']）
 * @returns 套件資訊陣列（路徑 + 名稱）
 */
export async function findAllPackages(
  rootDir: string,
  includeDirs = ['packages', 'satellites']
): Promise<Array<{ path: string; name: string }>> {
  const packages: Array<{ path: string; name: string }> = []

  for (const dir of includeDirs) {
    const dirPath = join(rootDir, dir)
    const glob = new Glob('*/package.json')

    try {
      for (const pkgJsonPath of glob.scanSync({ cwd: dirPath })) {
        const fullPath = join(dirPath, pkgJsonPath)
        try {
          const pkg = await Bun.file(fullPath).json()
          if (pkg.name) {
            packages.push({
              path: resolve(dirPath, pkgJsonPath, '..'),
              name: pkg.name,
            })
          }
        } catch {
          // 忽略無效的 package.json
        }
      }
    } catch {
      // 目錄不存在，忽略
    }
  }

  return packages
}
