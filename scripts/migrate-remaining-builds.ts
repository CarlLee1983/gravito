#!/usr/bin/env bun

/**
 * @fileoverview 剩餘 build.ts 遷移計畫工具
 *
 * 分析所有 35 個 build.ts，提取構建配置，並生成：
 * 1. 風險評估（低/中/高）
 * 2. 優先級列表
 * 3. 自動重寫低風險包（--auto-migrate 模式）
 *
 * 風險等級定義：
 * - LOW：單入口點、標準 external、無複雜後處理邏輯
 * - MEDIUM：多入口點、或有簡單的後處理（移動 .d.ts 等）
 * - HIGH：複雜後處理（forge 多目標、luminosity-cli 等）、或使用 tsup JS API
 *
 * 已完成遷移的試點包（排除在分析外）：
 * - beam、echo、ripple-client、stream、spectrum
 *
 * 使用方式：
 * ```bash
 * bun run scripts/migrate-remaining-builds.ts [--auto-migrate] [--dry-run] [--verbose]
 * ```
 *
 * 選項：
 * - `--auto-migrate`  - 自動重寫低風險包
 * - `--dry-run`       - 預覽模式（不實際修改）
 * - `--verbose`       - 顯示詳細分析
 *
 * @module scripts/migrate-remaining-builds
 */

import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

// ─────────────────────────────────────────────────────────────────────────────
// CLI 參數
// ─────────────────────────────────────────────────────────────────────────────

const args = parseArgs({
  options: {
    'auto-migrate': { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
  },
  allowPositionals: false,
})

const autoMigrate = args.values['auto-migrate'] ?? false
const dryRun = args.values['dry-run'] ?? false
const isVerbose = args.values.verbose ?? false

// ─────────────────────────────────────────────────────────────────────────────
// 型別定義
// ─────────────────────────────────────────────────────────────────────────────

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'ALREADY_MIGRATED' | 'SKIP'

type BuildTool = 'tsup' | 'bun_build' | 'mixed' | 'build_utils'

/**
 * 從 build.ts 提取的構建配置
 */
interface ExtractedConfig {
  /** 套件名稱 */
  packageName: string
  /** 套件目錄 */
  packageDir: string
  /** 使用的構建工具 */
  tool: BuildTool
  /** 入口點列表 */
  entrypoints: string[]
  /** 輸出格式 */
  formats: ('esm' | 'cjs')[]
  /** 外部依賴 */
  external: string[]
  /** 運行時目標 */
  target: string
  /** 特殊配置特徵 */
  features: string[]
  /** 原始 build.ts 內容（前 50 行） */
  rawPreview: string
}

/**
 * 風險評估結果
 */
interface RiskAssessment {
  /** 套件名稱 */
  packageName: string
  /** 風險等級 */
  risk: RiskLevel
  /** 風險原因 */
  reasons: string[]
  /** 提取到的配置 */
  config: ExtractedConfig
  /** 建議遷移方案描述 */
  migrationPlan?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 已遷移的試點包（排除）
// ─────────────────────────────────────────────────────────────────────────────

const PILOT_PACKAGES = new Set(['beam', 'echo', 'ripple-client', 'stream', 'spectrum'])

// ─────────────────────────────────────────────────────────────────────────────
// 分析工具
// ─────────────────────────────────────────────────────────────────────────────

const ROOT_DIR = resolve(import.meta.dirname, '..')

/**
 * 判斷 build.ts 使用的工具
 */
function detectBuildTool(content: string): BuildTool {
  const hasBuildUtils = content.includes('build-utils')
  const hasTsupImport = content.includes("from 'tsup'") || content.includes('tsup')
  const hasBunBuild = content.includes('Bun.build') || content.includes("from 'bun'")

  if (hasBuildUtils) {
    return 'build_utils'
  }
  if (hasTsupImport && hasBunBuild) {
    return 'mixed'
  }
  if (hasTsupImport) {
    return 'tsup'
  }
  if (hasBunBuild) {
    return 'bun_build'
  }
  return 'tsup' // 預設
}

/**
 * 從 build.ts 內容提取入口點
 */
function extractEntrypoints(content: string): string[] {
  const entries: string[] = []

  // 匹配 Bun.build entrypoints 陣列
  const bunBuildMatch = content.match(/entrypoints:\s*\[([\s\S]*?)\]/m)
  if (bunBuildMatch) {
    const matches = bunBuildMatch[1].matchAll(/['"]([^'"]+\.ts[x]?)['"]/g)
    for (const m of matches) {
      entries.push(m[1])
    }
  }

  // 匹配 tsup 入口點（命令行形式）
  const tsupEntryMatch = content.match(
    /tsup['\s,]+(['"][^'"]+\.ts['"]\s*(?:,\s*['"][^'"]+\.ts['"])*)/m
  )
  if (tsupEntryMatch && entries.length === 0) {
    const matches = tsupEntryMatch[1].matchAll(/['"]([^'"]+\.ts[x]?)['"]/g)
    for (const m of matches) {
      entries.push(m[1])
    }
  }

  // 匹配 entry[] 陣列（tsup JS API）
  const entryMatch = content.match(/entry:\s*\[([\s\S]*?)\]/m)
  if (entryMatch && entries.length === 0) {
    const matches = entryMatch[1].matchAll(/['"]([^'"]+\.ts[x]?)['"]/g)
    for (const m of matches) {
      entries.push(m[1])
    }
  }

  return entries.length > 0 ? entries : ['src/index.ts']
}

/**
 * 從 build.ts 內容提取外部依賴
 */
function extractExternal(content: string): string[] {
  const external: string[] = []

  // 匹配 external: [...]（Bun.build 格式）
  const externalArrayMatch = content.match(/external:\s*\[([\s\S]*?)\]/m)
  if (externalArrayMatch) {
    const matches = externalArrayMatch[1].matchAll(/['"]([^'"]+)['"]/g)
    for (const m of matches) {
      external.push(m[1])
    }
  }

  // 匹配 --external key,val（tsup 命令行格式）
  const externalCliMatches = content.matchAll(/['"]--external['"]\s*,\s*['"]([^'"]+)['"]/g)
  for (const m of externalCliMatches) {
    // 處理逗號分隔的多個依賴
    const deps = m[1].split(',').map((d) => d.trim())
    external.push(...deps)
  }

  return [...new Set(external)] // 去重
}

/**
 * 從 build.ts 內容提取格式
 */
function extractFormats(content: string): ('esm' | 'cjs')[] {
  if (
    content.includes("'esm,cjs'") ||
    content.includes('"esm,cjs"') ||
    content.includes("format: ['esm', 'cjs']")
  ) {
    return ['esm', 'cjs']
  }
  if (content.includes("'cjs'") || content.includes('"cjs"')) {
    return ['esm', 'cjs']
  }
  return ['esm']
}

/**
 * 從 build.ts 內容提取目標平台
 */
function extractTarget(content: string): string {
  if (content.includes("target: 'browser'") || content.includes('target: "browser"')) {
    return 'browser'
  }
  if (content.includes("target: 'node'") || content.includes('target: "node"')) {
    return 'node'
  }
  return 'bun'
}

/**
 * 偵測特殊配置特徵
 */
function detectFeatures(content: string): string[] {
  const features: string[] = []

  if (content.includes('tsconfig.build.json')) {
    features.push('tsconfig.build.json')
  }
  if (content.includes('engine/index.ts')) {
    features.push('multi-target:engine')
  }
  if (content.includes("target: 'browser'")) {
    features.push('browser-target')
  }
  if (content.includes('copyDtsFiles') || content.includes('moveFilesToRoot')) {
    features.push('complex-dts-post-process')
  }
  if (content.includes('components/index.tsx') || content.includes('vue/index.ts')) {
    features.push('multi-target:ui')
  }
  if (content.includes('spawn') && content.includes('tsup')) {
    features.push('tsup-spawn')
  }
  if (content.includes("from 'tsup'")) {
    features.push('tsup-js-api')
  }
  if (content.includes('naming:')) {
    features.push('custom-naming')
  }
  if ((content.match(/Bun\.build\(/g) || []).length > 1) {
    features.push('multiple-bun-builds')
  }
  if (content.includes('execSync')) {
    features.push('node-child-process')
  }
  if (content.includes('$`')) {
    features.push('bun-shell')
  }

  return features
}

/**
 * 評估風險等級
 */
function assessRisk(config: ExtractedConfig): {
  risk: RiskLevel
  reasons: string[]
  migrationPlan?: string
} {
  const reasons: string[] = []

  // 已使用 build-utils（已遷移）
  if (config.tool === 'build_utils') {
    return { risk: 'ALREADY_MIGRATED', reasons: ['已使用 build-utils.ts'] }
  }

  // 高風險特徵
  const highRiskFeatures = [
    'complex-dts-post-process',
    'multi-target:engine',
    'multi-target:ui',
    'multiple-bun-builds',
  ]
  const hasHighRisk = config.features.some((f) => highRiskFeatures.includes(f))

  if (hasHighRisk) {
    for (const f of config.features.filter((feat) => highRiskFeatures.includes(feat))) {
      reasons.push(`高風險特徵: ${f}`)
    }
    return { risk: 'HIGH', reasons, migrationPlan: '需要手動處理後處理邏輯，不建議自動遷移' }
  }

  // 中風險特徵
  const mediumRiskFeatures = ['tsup-js-api', 'browser-target', 'custom-naming']
  const hasMediumRisk = config.features.some((f) => mediumRiskFeatures.includes(f))
  const hasMultipleEntries = config.entrypoints.length > 2

  if (hasMediumRisk || hasMultipleEntries) {
    if (hasMediumRisk) {
      for (const f of config.features.filter((feat) => mediumRiskFeatures.includes(feat))) {
        reasons.push(`中風險特徵: ${f}`)
      }
    }
    if (hasMultipleEntries) {
      reasons.push(`多入口點 (${config.entrypoints.length} 個)`)
    }
    return {
      risk: 'MEDIUM',
      reasons,
      migrationPlan: '可自動遷移，但需要人工驗證輸出正確性',
    }
  }

  // 低風險
  reasons.push('單入口點，標準 external，tsup-spawn 模式')
  return {
    risk: 'LOW',
    reasons,
    migrationPlan: '可完全自動遷移，使用 buildPackage({ esm+cjs })',
  }
}

/**
 * 分析單一套件的 build.ts
 */
async function analyzePackage(pkgDir: string): Promise<RiskAssessment | null> {
  const buildTsPath = join(pkgDir, 'build.ts')

  // 讀取 build.ts
  const buildTsFile = Bun.file(buildTsPath)
  if (!(await buildTsFile.exists())) {
    return null
  }

  const content = await buildTsFile.text()
  const lines = content.split('\n')
  const rawPreview = lines.slice(0, 50).join('\n')

  // 讀取 package.json
  let packageName = pkgDir.split('/').pop() ?? 'unknown'
  try {
    const pkgJson = await Bun.file(join(pkgDir, 'package.json')).json()
    packageName = pkgJson.name ?? packageName
  } catch {
    // 使用目錄名
  }

  const config: ExtractedConfig = {
    packageName,
    packageDir: pkgDir,
    tool: detectBuildTool(content),
    entrypoints: extractEntrypoints(content),
    formats: extractFormats(content),
    external: extractExternal(content),
    target: extractTarget(content),
    features: detectFeatures(content),
    rawPreview,
  }

  const { risk, reasons, migrationPlan } = assessRisk(config)

  return { packageName, risk, reasons, config, migrationPlan }
}

// ─────────────────────────────────────────────────────────────────────────────
// 自動遷移（低風險包）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 生成遷移後的 build.ts 內容
 */
function generateMigratedBuildTs(config: ExtractedConfig): string {
  const _packageShortName = config.packageName.replace('@gravito/', '')
  const formatList = config.formats.map((f) => `'${f}'`).join(', ')
  const externalList =
    config.external.length > 0 ? config.external.map((e) => `    '${e}'`).join(',\n') : ''

  return `#!/usr/bin/env bun

/**
 * ${config.packageName} 構建腳本
 *
 * 使用統一的 buildPackage() 函式，替代舊版 ${config.tool === 'tsup' ? 'spawn tsup' : 'Bun.build 分離呼叫'} 方式。
 * 格式：${config.formats.join(' + ')}
 */

import { buildPackage, isDtsOnlyMode, printBuildSummary } from '../../scripts/build-utils.ts'

const dtsOnly = isDtsOnlyMode()

console.log(dtsOnly ? '生成 ${config.packageName} 型別宣告...' : '構建 ${config.packageName}...')

const result = await buildPackage({
  entrypoints: [${config.entrypoints.map((e) => `'${e}'`).join(', ')}],
  outdir: 'dist',
  format: [${formatList}],
  target: '${config.target}',
  splitting: false,
  minify: false,
  sourcemap: 'external',
${externalList ? `  external: [\n${externalList},\n  ],\n` : '  external: [],\n'}  dts: true,
  dtsOnly,
  silent: false,
})

printBuildSummary(result, '${config.packageName}')

if (!result.success) {
  process.exit(1)
}
`
}

/**
 * 自動遷移低風險套件
 */
async function autoMigratePackage(assessment: RiskAssessment): Promise<boolean> {
  if (assessment.risk !== 'LOW') {
    return false
  }

  const buildTsPath = join(assessment.config.packageDir, 'build.ts')
  const newContent = generateMigratedBuildTs(assessment.config)

  if (dryRun) {
    console.log(`  [DRY RUN] 將重寫 ${buildTsPath}`)
    if (isVerbose) {
      console.log('  --- 新內容預覽 ---')
      console.log(
        newContent
          .split('\n')
          .slice(0, 20)
          .map((l) => `  ${l}`)
          .join('\n')
      )
      console.log('  ...')
    }
    return true
  }

  await Bun.write(buildTsPath, newContent)
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// 主程式
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== build.ts 遷移計畫分析工具 ===')
console.log(`模式: ${autoMigrate ? (dryRun ? '自動遷移 (預覽)' : '自動遷移') : '僅分析'}`)
console.log('')

// 收集所有套件目錄
const packagesDir = resolve(ROOT_DIR, 'packages')
const satellitesDir = resolve(ROOT_DIR, 'satellites')

const allPackageDirs: string[] = []
for (const baseDir of [packagesDir, satellitesDir]) {
  try {
    const entries = await readdir(baseDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        allPackageDirs.push(join(baseDir, entry.name))
      }
    }
  } catch {
    // 目錄不存在
  }
}

// 分析所有套件
const assessments: RiskAssessment[] = []

for (const pkgDir of allPackageDirs) {
  const pkgName = pkgDir.split('/').pop() ?? ''

  // 跳過試點包
  if (PILOT_PACKAGES.has(pkgName)) {
    continue
  }

  const result = await analyzePackage(pkgDir)
  if (result) {
    assessments.push(result)
  }
}

// 按風險等級分組
const migrated = assessments.filter((a) => a.risk === 'ALREADY_MIGRATED')
const lowRisk = assessments.filter((a) => a.risk === 'LOW')
const mediumRisk = assessments.filter((a) => a.risk === 'MEDIUM')
const highRisk = assessments.filter((a) => a.risk === 'HIGH')
const _skipped = assessments.filter((a) => a.risk === 'SKIP')

// ─────────────────────────────────────────────────────────────────────────────
// 輸出報告
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== 遷移計畫報告 ===')
console.log('')
console.log('摘要')
console.log('─────────────────────────────────────────')
console.log(`已分析套件:       ${assessments.length}`)
console.log(`試點包（已遷移）: ${PILOT_PACKAGES.size}`)
console.log(`已使用 build-utils: ${migrated.length}`)
console.log(`低風險（可自動）: ${lowRisk.length}`)
console.log(`中風險（需驗證）: ${mediumRisk.length}`)
console.log(`高風險（手動處理）: ${highRisk.length}`)
console.log('')

// 低風險包列表
if (lowRisk.length > 0) {
  console.log('LOW RISK - 建議優先自動遷移')
  console.log('─────────────────────────────────────────')
  for (const a of lowRisk) {
    const toolLabel = a.config.tool === 'tsup' ? '[tsup]' : '[bun]'
    const formatLabel = a.config.formats.join('+')
    const entryLabel =
      a.config.entrypoints.length > 1
        ? `${a.config.entrypoints.length} entries`
        : a.config.entrypoints[0]
    console.log(
      `  ${a.packageName.padEnd(35)} ${toolLabel.padEnd(8)} ${formatLabel.padEnd(10)} ${entryLabel}`
    )
  }
  console.log('')
}

// 中風險包列表
if (mediumRisk.length > 0) {
  console.log('MEDIUM RISK - 手動驗證後遷移')
  console.log('─────────────────────────────────────────')
  for (const a of mediumRisk) {
    console.log(`  ${a.packageName.padEnd(35)} 原因: ${a.reasons.slice(0, 2).join(', ')}`)
    if (isVerbose) {
      console.log(`    遷移方案: ${a.migrationPlan}`)
      console.log(`    特徵: ${a.config.features.join(', ')}`)
    }
  }
  console.log('')
}

// 高風險包列表
if (highRisk.length > 0) {
  console.log('HIGH RISK - 需要人工處理')
  console.log('─────────────────────────────────────────')
  for (const a of highRisk) {
    console.log(`  ${a.packageName.padEnd(35)} 原因: ${a.reasons.slice(0, 2).join(', ')}`)
    if (isVerbose) {
      console.log(`    遷移方案: ${a.migrationPlan}`)
      console.log(`    特徵: ${a.config.features.join(', ')}`)
    }
  }
  console.log('')
}

// 優先級遷移順序建議
console.log('建議遷移順序')
console.log('─────────────────────────────────────────')
console.log('Phase 1 (立即，已完成): beam, echo, ripple-client, stream, spectrum')

if (lowRisk.length > 0) {
  const phase2Names = lowRisk.map((a) => a.packageName.replace('@gravito/', '')).slice(0, 10)
  console.log(`Phase 2 (低風險，可批量): ${phase2Names.join(', ')}`)
  if (lowRisk.length > 10) {
    console.log(`  ... 另有 ${lowRisk.length - 10} 個低風險套件`)
  }
}

if (mediumRisk.length > 0) {
  const phase3Names = mediumRisk.map((a) => a.packageName.replace('@gravito/', ''))
  console.log(`Phase 3 (中風險，逐一驗證): ${phase3Names.join(', ')}`)
}

if (highRisk.length > 0) {
  const phase4Names = highRisk.map((a) => a.packageName.replace('@gravito/', ''))
  console.log(`Phase 4 (高風險，人工): ${phase4Names.join(', ')}`)
}

console.log('')

// 自動遷移低風險包
if (autoMigrate) {
  console.log(`--- ${dryRun ? '預覽' : '執行'}自動遷移（低風險包）---`)
  let successCount = 0
  let failCount = 0

  for (const assessment of lowRisk) {
    process.stdout.write(`  遷移 ${assessment.packageName} ... `)
    const success = await autoMigratePackage(assessment)
    if (success) {
      console.log(dryRun ? '(會重寫)' : 'OK')
      successCount++
    } else {
      console.log('SKIP')
      failCount++
    }
  }

  console.log('')
  console.log(`自動遷移完成: ${successCount} 個成功, ${failCount} 個跳過`)

  if (!dryRun && successCount > 0) {
    console.log('')
    console.log('接下來請執行:')
    console.log('  bun run scripts/validate-build-migration.ts --no-build')
    console.log('  # 或對遷移後的包重新構建：')
    console.log('  bun run build')
  }
} else {
  console.log('提示: 使用 --auto-migrate 自動重寫低風險套件')
  console.log('      使用 --auto-migrate --dry-run 預覽變更')
}
