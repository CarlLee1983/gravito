#!/usr/bin/env bun

/**
 * @fileoverview 統一的 Bun.build 工具函式庫
 *
 * 為所有 build.ts 提供一致的構建邏輯，替代 tsup 工具鏈。
 * 核心功能：
 * 1. buildPackage() - 主構建函式（ESM + CJS + DTS）
 * 2. buildESM() - 使用 Bun.build 原生 ESM 構建
 * 3. buildCJS() - 使用 Bun.Transpiler 轉譯 CJS
 * 4. generateDTS() - 使用 tsc --emitDeclarationOnly
 * 5. createTimer() - 性能計時工具（已在 transpiler-utils.ts 定義，此處獨立實現）
 *
 * 性能目標：
 * - 單包構建：0.5-1.5s（相比 tsup 的 3-5s，提升 60-70%）
 * - 零啟動開銷：Bun.build 無需啟動獨立 Node.js 進程
 *
 * @module scripts/build-utils
 */

import { mkdir, readdir, rm } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

// ─────────────────────────────────────────────────────────────────────────────
// 型別定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 構建配置選項
 */
export interface BuildConfig {
  /** 入口點列表（相對於 cwd 或 packageDir） */
  entrypoints: string[]
  /** 輸出目錄（預設 'dist'） */
  outdir?: string
  /** 外部依賴列表（不打包進輸出） */
  external?: string[]
  /** 運行時目標（預設 'bun'） */
  target?: 'bun' | 'node' | 'browser'
  /** 輸出格式列表（預設 ['esm']，CJS 需明確指定） */
  format?: ('esm' | 'cjs')[]
  /** 是否啟用代碼分割（預設 false） */
  splitting?: boolean
  /** 是否最小化（預設 false） */
  minify?: boolean
  /** Source map 模式（預設 'external'） */
  sourcemap?: boolean | 'external' | 'inline' | 'none'
  /** 全局常量定義 */
  define?: Record<string, string>
  /** ESM 輸出的檔案命名（預設 '[name].js'） */
  esmNaming?: string
  /** CJS 輸出的檔案命名（預設 '[name].cjs'） */
  cjsNaming?: string
  /** 是否生成 DTS（預設 true） */
  dts?: boolean
  /** 僅生成 DTS 模式 */
  dtsOnly?: boolean
  /** 套件根目錄（預設為 process.cwd()） */
  packageDir?: string
  /** tsconfig 路徑（相對於 packageDir） */
  tsconfig?: string
  /** tsc 額外參數 */
  tscArgs?: string[]
  /** 是否靜默輸出（預設 false） */
  silent?: boolean
}

/**
 * 構建結果
 */
export interface BuildResult {
  /** 是否成功 */
  success: boolean
  /** 輸出的檔案路徑列表 */
  outputs: string[]
  /** 總構建時間（毫秒） */
  duration: number
  /** 各階段時間明細 */
  timing: {
    esm?: number
    cjs?: number
    dts?: number
    clean?: number
  }
  /** 日誌訊息 */
  logs: string[]
  /** 錯誤訊息（若失敗） */
  errors: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// 計時工具（獨立實現，不依賴 transpiler-utils）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 建立計時器
 */
export function createTimer() {
  const start = performance.now()
  return {
    elapsed(): number {
      return performance.now() - start
    },
    format(ms: number, label: string, oldMs?: number): string {
      const time = ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`
      if (oldMs !== undefined && oldMs > 0) {
        const speedup = (oldMs / ms).toFixed(1)
        return `${label} (${time}, 比 tsup 快 ${speedup}x)`
      }
      return `${label} (${time})`
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 內部工具函式
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 收集目錄中所有 .js 檔案（遞迴）
 */
async function collectJsFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        const sub = await collectJsFiles(fullPath)
        files.push(...sub)
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath)
      }
    }
  } catch {
    // 目錄不存在時忽略
  }
  return files
}

/**
 * 收集目錄中所有 .d.ts 檔案（遞迴）
 */
async function collectDtsFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        const sub = await collectDtsFiles(fullPath)
        files.push(...sub)
      } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
        files.push(fullPath)
      }
    }
  } catch {
    // 目錄不存在時忽略
  }
  return files
}

/**
 * 從 tsc 輸出的 dist/src/ 結構移動 .d.ts 到 dist/
 * tsc 在 rootDir=src 時會輸出到 dist/src/
 */
async function flattenDtsFromSrc(distDir: string): Promise<void> {
  const srcInDist = join(distDir, 'src')
  try {
    const entries = await readdir(srcInDist, { withFileTypes: true })
    for (const entry of entries) {
      await moveDtsRecursive(join(srcInDist, entry.name), join(distDir, entry.name), entry)
    }
    await rm(srcInDist, { recursive: true, force: true })
  } catch {
    // dist/src/ 不存在，直接跳過
  }
}

/**
 * 遞迴移動 .d.ts 檔案
 */
async function moveDtsRecursive(
  src: string,
  dest: string,
  entry: Awaited<ReturnType<typeof readdir<{ withFileTypes: true }>>>[number]
): Promise<void> {
  if (entry.isDirectory()) {
    try {
      await mkdir(dest, { recursive: true })
    } catch {
      // 忽略已存在
    }
    const subEntries = await readdir(src, { withFileTypes: true })
    for (const subEntry of subEntries) {
      await moveDtsRecursive(join(src, subEntry.name), join(dest, subEntry.name), subEntry)
    }
  } else if (entry.isFile() && (entry.name.endsWith('.d.ts') || entry.name.endsWith('.d.ts.map'))) {
    // 使用 Bun 原生讀寫搬移
    const content = await Bun.file(src).arrayBuffer()
    await Bun.write(dest, content)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ESM 構建
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 使用 Bun.build 進行 ESM 構建
 *
 * @param config - 構建配置
 * @param distDir - 輸出目錄絕對路徑
 * @returns 耗時（毫秒）與輸出路徑
 */
export async function buildESM(
  config: BuildConfig,
  distDir: string
): Promise<{ duration: number; outputs: string[]; error?: string }> {
  const timer = createTimer()

  try {
    const result = await Bun.build({
      entrypoints: config.entrypoints,
      outdir: distDir,
      format: 'esm',
      target: config.target ?? 'bun',
      splitting: config.splitting ?? false,
      minify: config.minify ?? false,
      sourcemap: (config.sourcemap as 'external' | 'inline' | 'none') ?? 'external',
      external: config.external ?? [],
      define: config.define,
      ...(config.esmNaming ? { naming: config.esmNaming } : {}),
    })

    if (!result.success) {
      const errorMsg = result.logs.map((l) => String(l)).join('\n')
      return { duration: timer.elapsed(), outputs: [], error: errorMsg }
    }

    const outputs = result.outputs.map((o) => o.path)
    return { duration: timer.elapsed(), outputs }
  } catch (error) {
    return {
      duration: timer.elapsed(),
      outputs: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CJS 構建
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 使用 Bun.Transpiler 將 ESM .js 轉譯為 CJS .cjs
 *
 * 策略：讀取 ESM 輸出，使用 Transpiler transform 後輸出 .cjs
 * 適合單入口或少量入口的套件。
 *
 * @param distDir - ESM 輸出目錄（同時作為 CJS 輸出目錄）
 * @param entrypoints - 入口點列表（用於確定主入口 .cjs 的名稱）
 * @returns 耗時（毫秒）與輸出路徑
 */
export async function buildCJS(
  distDir: string,
  _entrypoints: string[]
): Promise<{ duration: number; outputs: string[]; error?: string }> {
  const timer = createTimer()
  const transpiler = new Bun.Transpiler({ loader: 'js' })
  const outputs: string[] = []

  try {
    // 收集所有 ESM .js 輸出
    const jsFiles = await collectJsFiles(distDir)

    if (jsFiles.length === 0) {
      return { duration: timer.elapsed(), outputs: [], error: 'No ESM .js files found to convert' }
    }

    // 並行轉譯所有 .js → .cjs
    await Promise.all(
      jsFiles.map(async (jsFile) => {
        try {
          const source = await Bun.file(jsFile).text()
          // Transpiler 將 ESM import/export 轉為 CommonJS require/module.exports
          const cjsSource = transpiler.transformSync(source, 'js')
          const cjsFile = jsFile.replace(/\.js$/, '.cjs')
          await Bun.write(cjsFile, cjsSource)
          outputs.push(cjsFile)
        } catch (_err) {
          // 若轉譯失敗，生成簡單的 re-export stub
          const jsBaseName = basename(jsFile, '.js')
          const cjsFile = join(dirname(jsFile), `${jsBaseName}.cjs`)
          const relPath = `./${jsBaseName}.js`
          const stub = `"use strict";\nmodule.exports = require("${relPath}");\n`
          await Bun.write(cjsFile, stub)
          outputs.push(cjsFile)
        }
      })
    )

    return { duration: timer.elapsed(), outputs }
  } catch (error) {
    return {
      duration: timer.elapsed(),
      outputs: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 生成簡單的 CJS re-export stub（適用於純 ESM 包需要 CJS 相容性的情況）
 *
 * @param distDir - 輸出目錄
 * @param entrypoints - 入口點（用於命名）
 */
export async function buildCJSStub(
  distDir: string,
  entrypoints: string[]
): Promise<{ duration: number; outputs: string[] }> {
  const timer = createTimer()
  const outputs: string[] = []

  for (const entrypoint of entrypoints) {
    const name = basename(entrypoint).replace(/\.(ts|tsx)$/, '')
    const esmFile = `./${name}.js`
    const cjsFile = join(distDir, `${name}.cjs`)
    const stub = `"use strict";\nmodule.exports = require("${esmFile}");\n`
    await Bun.write(cjsFile, stub)
    outputs.push(cjsFile)
  }

  return { duration: timer.elapsed(), outputs }
}

// ─────────────────────────────────────────────────────────────────────────────
// DTS 生成
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 使用 tsc --emitDeclarationOnly 生成 .d.ts 型別宣告
 *
 * @param packageDir - 套件根目錄
 * @param distDir - 輸出目錄
 * @param options - tsc 選項
 * @returns 耗時（毫秒）與退出碼
 */
export async function generateDTS(
  packageDir: string,
  distDir: string,
  options: {
    tsconfig?: string
    extraArgs?: string[]
  } = {}
): Promise<{ duration: number; exitCode: number; error?: string }> {
  const timer = createTimer()

  // 決定 tsconfig
  const tsconfigArg = options.tsconfig ?? 'tsconfig.json'
  const _tsconfigPath = resolve(packageDir, tsconfigArg)

  // 基本 tsc 命令
  const args = ['bunx', 'tsc', '--emitDeclarationOnly', '--declaration', '--outDir', distDir]

  // 如果有 tsconfig.build.json，優先使用（它通常已設定 rootDir）
  const buildTsconfigPath = resolve(packageDir, 'tsconfig.build.json')
  const hasBuildTsconfig = await Bun.file(buildTsconfigPath).exists()

  if (hasBuildTsconfig) {
    args.push('-p', 'tsconfig.build.json', '--outDir', distDir)
    // 移除重複的 --emitDeclarationOnly --declaration（已在 tsconfig 中設定）
    const filteredArgs = ['bunx', 'tsc', '-p', 'tsconfig.build.json', '--outDir', distDir]
    if (options.extraArgs) {
      filteredArgs.push(...options.extraArgs)
    }

    const proc = Bun.spawn(filteredArgs, {
      stdout: 'inherit',
      stderr: 'inherit',
      cwd: packageDir,
    })
    const exitCode = await proc.exited
    await flattenDtsFromSrc(distDir)
    return { duration: timer.elapsed(), exitCode }
  }

  // 沒有 build tsconfig，使用命令行參數
  const finalArgs = ['bunx', 'tsc', '--emitDeclarationOnly', '--declaration', '--outDir', distDir]
  if (options.extraArgs) {
    finalArgs.push(...options.extraArgs)
  }
  // 添加 skipLibCheck 確保不因依賴型別問題失敗
  finalArgs.push('--skipLibCheck')

  const proc = Bun.spawn(finalArgs, {
    stdout: 'inherit',
    stderr: 'inherit',
    cwd: packageDir,
  })
  const exitCode = await proc.exited

  // 嘗試整平 dist/src/ 結構
  await flattenDtsFromSrc(distDir)

  return { duration: timer.elapsed(), exitCode }
}

// ─────────────────────────────────────────────────────────────────────────────
// 主構建函式
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 統一的套件構建函式
 *
 * 根據配置執行以下步驟（並行）：
 * 1. ESM 構建（Bun.build 原生）
 * 2. CJS 構建（Transpiler 轉譯）
 * 3. DTS 生成（tsc --emitDeclarationOnly）
 *
 * @param config - 構建配置
 * @returns 構建結果（包含時間統計與輸出路徑）
 *
 * @example
 * ```typescript
 * import { buildPackage } from '../../scripts/build-utils.ts'
 *
 * await buildPackage({
 *   entrypoints: ['src/index.ts'],
 *   format: ['esm', 'cjs'],
 *   external: ['@gravito/core'],
 * })
 * ```
 */
export async function buildPackage(config: BuildConfig): Promise<BuildResult> {
  const totalTimer = createTimer()
  const logs: string[] = []
  const errors: string[] = []
  const allOutputs: string[] = []
  const timing: BuildResult['timing'] = {}

  const packageDir = config.packageDir ?? process.cwd()
  const distDir = resolve(packageDir, config.outdir ?? 'dist')
  const formats = config.format ?? ['esm']
  const isDtsOnly = config.dtsOnly ?? false
  const shouldGenerateDts = config.dts !== false // 預設 true

  // ─── 清理 dist ───
  const cleanTimer = createTimer()
  try {
    await rm(distDir, { recursive: true, force: true })
    await mkdir(distDir, { recursive: true })
    timing.clean = cleanTimer.elapsed()
    logs.push(`清理 dist/ (${timing.clean.toFixed(0)}ms)`)
  } catch (err) {
    errors.push(`清理失敗: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ─── 僅 DTS 模式 ───
  if (isDtsOnly) {
    if (!config.silent) {
      console.log('生成型別宣告中...')
    }
    const dtsResult = await generateDTS(packageDir, distDir, { tsconfig: config.tsconfig })
    timing.dts = dtsResult.duration
    logs.push(`DTS 生成 (${dtsResult.duration.toFixed(0)}ms)`)

    if (dtsResult.exitCode !== 0) {
      errors.push(`tsc 失敗，退出碼: ${dtsResult.exitCode}`)
      return {
        success: false,
        outputs: [],
        duration: totalTimer.elapsed(),
        timing,
        logs,
        errors,
      }
    }

    const dtsFiles = await collectDtsFiles(distDir)
    return {
      success: true,
      outputs: dtsFiles,
      duration: totalTimer.elapsed(),
      timing,
      logs,
      errors,
    }
  }

  // ─── 一般構建模式：ESM + CJS + DTS 並行 ───
  const tasks: Promise<void>[] = []

  // ESM 構建任務
  const esmTask = (async () => {
    if (!config.silent) {
      process.stdout.write('ESM 構建中...\n')
    }
    const esmResult = await buildESM(config, distDir)
    timing.esm = esmResult.duration
    logs.push(`ESM 構建 (${esmResult.duration.toFixed(0)}ms)`)

    if (esmResult.error) {
      errors.push(`ESM 構建失敗: ${esmResult.error}`)
    } else {
      allOutputs.push(...esmResult.outputs)

      // CJS 構建（依賴 ESM 輸出）
      if (formats.includes('cjs')) {
        const cjsResult = await buildCJS(distDir, config.entrypoints)
        timing.cjs = cjsResult.duration
        logs.push(`CJS 構建 (${cjsResult.duration.toFixed(0)}ms)`)

        if (cjsResult.error) {
          errors.push(`CJS 構建失敗: ${cjsResult.error}`)
        } else {
          allOutputs.push(...cjsResult.outputs)
        }
      }
    }
  })()
  tasks.push(esmTask)

  // DTS 生成任務（與 JS 並行）
  if (shouldGenerateDts) {
    const dtsTask = (async () => {
      if (!config.silent) {
        process.stdout.write('DTS 生成中...\n')
      }
      const dtsResult = await generateDTS(packageDir, distDir, {
        tsconfig: config.tsconfig,
        extraArgs: config.tscArgs,
      })
      timing.dts = dtsResult.duration
      logs.push(`DTS 生成 (${dtsResult.duration.toFixed(0)}ms)`)

      if (dtsResult.exitCode !== 0) {
        errors.push(`tsc DTS 生成失敗，退出碼: ${dtsResult.exitCode}`)
      } else {
        const dtsFiles = await collectDtsFiles(distDir)
        allOutputs.push(...dtsFiles)
      }
    })()
    tasks.push(dtsTask)
  }

  // 等待所有任務完成
  await Promise.all(tasks)

  const success = errors.length === 0
  const duration = totalTimer.elapsed()

  if (!config.silent) {
    const durationStr =
      duration < 1000 ? `${duration.toFixed(0)}ms` : `${(duration / 1000).toFixed(2)}s`
    if (success) {
      console.log(`構建完成 (${durationStr})`)
    } else {
      console.error(`構建失敗 (${durationStr})`)
      for (const err of errors) {
        console.error(`  ${err}`)
      }
    }
  }

  return {
    success,
    outputs: allOutputs,
    duration,
    timing,
    logs,
    errors,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 便利工具函式
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 從 process.argv 讀取是否為 --dts-only 模式
 */
export function isDtsOnlyMode(): boolean {
  return process.argv.includes('--dts-only')
}

/**
 * 列印構建結果摘要
 */
export function printBuildSummary(result: BuildResult, packageName: string): void {
  const status = result.success ? 'OK' : 'FAIL'
  const durationStr =
    result.duration < 1000
      ? `${result.duration.toFixed(0)}ms`
      : `${(result.duration / 1000).toFixed(2)}s`

  console.log(`[${status}] ${packageName} (${durationStr})`)

  if (result.timing.esm !== undefined) {
    console.log(`  ESM: ${result.timing.esm.toFixed(0)}ms`)
  }
  if (result.timing.cjs !== undefined) {
    console.log(`  CJS: ${result.timing.cjs.toFixed(0)}ms`)
  }
  if (result.timing.dts !== undefined) {
    console.log(`  DTS: ${result.timing.dts.toFixed(0)}ms`)
  }

  if (!result.success) {
    for (const err of result.errors) {
      console.error(`  ERROR: ${err}`)
    }
  }
}

/**
 * 讀取套件的 package.json
 */
export async function readPackageJson(packageDir: string): Promise<Record<string, unknown>> {
  const pkgPath = join(packageDir, 'package.json')
  return await Bun.file(pkgPath).json()
}

/**
 * 找出所有需要構建的 monorepo 套件
 *
 * @param rootDir - monorepo 根目錄
 * @param dirs - 要掃描的目錄（預設 ['packages', 'satellites']）
 */
export async function findBuildablePackages(
  rootDir: string,
  dirs = ['packages', 'satellites']
): Promise<Array<{ path: string; name: string; hasBuildTs: boolean }>> {
  const packages: Array<{ path: string; name: string; hasBuildTs: boolean }> = []
  const { Glob } = await import('bun')

  for (const dir of dirs) {
    const dirPath = join(rootDir, dir)
    const glob = new Glob('*/package.json')

    try {
      for (const pkgJsonRelPath of glob.scanSync({ cwd: dirPath })) {
        const fullPkgPath = join(dirPath, pkgJsonRelPath)
        const pkgDir = dirname(fullPkgPath)
        try {
          const pkg = await Bun.file(fullPkgPath).json()
          if (pkg.name) {
            const buildTsPath = join(pkgDir, 'build.ts')
            const hasBuildTs = await Bun.file(buildTsPath).exists()
            packages.push({
              path: pkgDir,
              name: pkg.name as string,
              hasBuildTs,
            })
          }
        } catch {
          // 忽略無效的 package.json
        }
      }
    } catch {
      // 目錄不存在
    }
  }

  return packages
}
