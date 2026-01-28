#!/usr/bin/env bun

/**
 * Gravito 模組依賴關係圖生成器
 *
 * 自動分析所有 @gravito/* 套件的 package.json，生成：
 * 1. Mermaid 依賴關係圖
 * 2. 完整的依賴關係文件
 * 3. 依賴統計與分析
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { Glob } from 'bun'

// ============================================================================
// 型別定義
// ============================================================================

interface PackageInfo {
  name: string
  version: string
  description?: string
  dependencies: string[]
  peerDependencies: string[]
  optionalDependencies: string[]
  path: string
  isPrivate: boolean
}

interface DependencyEdge {
  from: string
  to: string
  type: 'required' | 'peer' | 'optional'
}

interface DependencyStats {
  totalPackages: number
  externalDependencies: Set<string>
  internalDependencies: Map<string, number> // 被依賴次數
  circularDependencies: string[][]
  isolatedPackages: string[]
  criticalPackages: string[] // 被依賴次數最多的
}

// ============================================================================
// 設定
// ============================================================================

const ROOT_DIR = resolve(__dirname, '..')
const PACKAGES_PATTERN = 'packages/*/package.json'
const OUTPUT_DIR = resolve(ROOT_DIR, 'docs/architecture')
const MERMAID_OUTPUT = resolve(OUTPUT_DIR, 'dependency-graph.mmd')
const MARKDOWN_OUTPUT = resolve(OUTPUT_DIR, 'DEPENDENCY_MAP.md')

// ============================================================================
// 核心函式
// ============================================================================

/**
 * 掃描所有 Gravito 套件
 */
function scanPackages(): Map<string, PackageInfo> {
  const packages = new Map<string, PackageInfo>()
  const glob = new Glob(PACKAGES_PATTERN)
  const packagePaths = Array.from(glob.scanSync({ cwd: ROOT_DIR }))

  for (const pkgPath of packagePaths) {
    const fullPath = resolve(ROOT_DIR, pkgPath)

    try {
      const content = readFileSync(fullPath, 'utf-8')
      const pkg = JSON.parse(content)

      // 提取套件名稱（移除 @gravito/ 前綴）
      const shortName = pkg.name.replace('@gravito/', '')

      // 提取依賴
      const dependencies = Object.keys(pkg.dependencies || {})
        .filter((dep) => dep.startsWith('@gravito/'))
        .map((dep) => dep.replace('@gravito/', ''))

      const peerDependencies = Object.keys(pkg.peerDependencies || {})
        .filter((dep) => dep.startsWith('@gravito/'))
        .map((dep) => dep.replace('@gravito/', ''))

      const optionalDependencies = Object.keys(pkg.optionalDependencies || {})
        .filter((dep) => dep.startsWith('@gravito/'))
        .map((dep) => dep.replace('@gravito/', ''))

      packages.set(shortName, {
        name: shortName,
        version: pkg.version,
        description: pkg.description,
        dependencies,
        peerDependencies,
        optionalDependencies,
        path: fullPath,
        isPrivate: pkg.private === true,
      })
    } catch (error) {
      console.error(`❌ 無法讀取套件：${pkgPath}`, error)
    }
  }

  console.log(`✅ 掃描完成：找到 ${packages.size} 個套件`)
  return packages
}

/**
 * 建立依賴邊列表
 */
function buildDependencyEdges(packages: Map<string, PackageInfo>): DependencyEdge[] {
  const edges: DependencyEdge[] = []

  for (const [name, info] of packages) {
    // 必需依賴
    for (const dep of info.dependencies) {
      if (packages.has(dep)) {
        edges.push({ from: name, to: dep, type: 'required' })
      }
    }

    // Peer 依賴
    for (const dep of info.peerDependencies) {
      if (packages.has(dep)) {
        edges.push({ from: name, to: dep, type: 'peer' })
      }
    }

    // 可選依賴
    for (const dep of info.optionalDependencies) {
      if (packages.has(dep)) {
        edges.push({ from: name, to: dep, type: 'optional' })
      }
    }
  }

  return edges
}

/**
 * 偵測循環依賴
 */
function detectCircularDependencies(
  packages: Map<string, PackageInfo>,
  edges: DependencyEdge[]
): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []

  // 建立鄰接表（只考慮必需依賴）
  const graph = new Map<string, string[]>()
  for (const [name] of packages) {
    graph.set(name, [])
  }
  for (const edge of edges) {
    if (edge.type === 'required') {
      graph.get(edge.from)?.push(edge.to)
    }
  }

  function dfs(node: string): boolean {
    visited.add(node)
    recursionStack.add(node)
    path.push(node)

    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true
      } else if (recursionStack.has(neighbor)) {
        // 找到循環
        const cycleStart = path.indexOf(neighbor)
        const cycle = path.slice(cycleStart).concat(neighbor)
        cycles.push(cycle)
        return true
      }
    }

    recursionStack.delete(node)
    path.pop()
    return false
  }

  for (const [name] of packages) {
    if (!visited.has(name)) {
      dfs(name)
    }
  }

  return cycles
}

/**
 * 計算統計資訊
 */
function calculateStats(
  packages: Map<string, PackageInfo>,
  edges: DependencyEdge[]
): DependencyStats {
  const internalDependencies = new Map<string, number>()
  const externalDependencies = new Set<string>()

  // 計算被依賴次數
  for (const edge of edges) {
    const count = internalDependencies.get(edge.to) || 0
    internalDependencies.set(edge.to, count + 1)
  }

  // 掃描外部依賴
  for (const [, info] of packages) {
    const allDeps = [
      ...Object.keys(require(info.path).dependencies || {}),
      ...Object.keys(require(info.path).peerDependencies || {}),
    ]

    for (const dep of allDeps) {
      if (!dep.startsWith('@gravito/')) {
        externalDependencies.add(dep)
      }
    }
  }

  // 找出孤立套件（沒有被依賴）
  const isolatedPackages: string[] = []
  for (const [name] of packages) {
    if (!internalDependencies.has(name)) {
      isolatedPackages.push(name)
    }
  }

  // 找出關鍵套件（被依賴次數 >= 5）
  const criticalPackages: string[] = []
  for (const [name, count] of internalDependencies) {
    if (count >= 5) {
      criticalPackages.push(name)
    }
  }

  // 偵測循環依賴
  const circularDependencies = detectCircularDependencies(packages, edges)

  return {
    totalPackages: packages.size,
    externalDependencies,
    internalDependencies,
    circularDependencies,
    isolatedPackages,
    criticalPackages,
  }
}

/**
 * 生成 Mermaid 圖表
 */
function generateMermaidGraph(packages: Map<string, PackageInfo>, edges: DependencyEdge[]): string {
  let mermaid = 'graph TB\n'
  mermaid += '  %% Gravito 模組依賴關係圖\n\n'

  // 定義節點
  mermaid += '  %% 節點定義\n'
  for (const [name, info] of packages) {
    const label = `${name}<br/><small>v${info.version}</small>`
    mermaid += `  ${name}["${label}"]\n`
  }
  mermaid += '\n'

  // 定義邊
  mermaid += '  %% 依賴關係\n'
  const requiredEdges = edges.filter((e) => e.type === 'required')
  const peerEdges = edges.filter((e) => e.type === 'peer')
  const optionalEdges = edges.filter((e) => e.type === 'optional')

  // 必需依賴（實線箭頭）
  for (const edge of requiredEdges) {
    mermaid += `  ${edge.from} --> ${edge.to}\n`
  }

  // Peer 依賴（虛線箭頭）
  if (peerEdges.length > 0) {
    mermaid += '\n  %% Peer 依賴\n'
    for (const edge of peerEdges) {
      mermaid += `  ${edge.from} -.peer.-> ${edge.to}\n`
    }
  }

  // 可選依賴（點線箭頭）
  if (optionalEdges.length > 0) {
    mermaid += '\n  %% 可選依賴\n'
    for (const edge of optionalEdges) {
      mermaid += `  ${edge.from} -.optional.-> ${edge.to}\n`
    }
  }

  // 樣式定義
  mermaid += '\n  %% 樣式\n'
  mermaid += '  classDef core fill:#ffd700,stroke:#333,stroke-width:3px\n'
  mermaid += '  classDef orbit fill:#4ecdc4,stroke:#333,stroke-width:2px\n'
  mermaid += '  classDef infrastructure fill:#ff6b6b,stroke:#333,stroke-width:2px\n'

  // 套用樣式
  if (packages.has('core')) {
    mermaid += '  class core core\n'
  }

  return mermaid
}

/**
 * 生成 Markdown 文件
 */
function generateMarkdownDoc(
  packages: Map<string, PackageInfo>,
  edges: DependencyEdge[],
  stats: DependencyStats
): string {
  let md = '# Gravito 模組依賴關係圖\n\n'
  md += '> 自動生成於：' + new Date().toISOString() + '\n\n'

  // 摘要
  md += '## 📊 摘要統計\n\n'
  md += `- **總套件數**：${stats.totalPackages}\n`
  md += `- **內部依賴邊數**：${edges.length}\n`
  md += `- **外部依賴數**：${stats.externalDependencies.size}\n`
  md += `- **循環依賴**：${stats.circularDependencies.length} 個\n`
  md += `- **孤立套件**：${stats.isolatedPackages.length} 個\n`
  md += `- **關鍵套件**：${stats.criticalPackages.length} 個\n\n`

  // 依賴關係圖
  md += '## 🗺️ 依賴關係圖\n\n'
  md += '```mermaid\n'
  md += generateMermaidGraph(packages, edges)
  md += '```\n\n'

  // 圖例說明
  md += '### 圖例\n\n'
  md += '- **實線箭頭** (`-->`)：必需依賴\n'
  md += '- **虛線箭頭** (`-.peer.->`)：Peer 依賴\n'
  md += '- **點線箭頭** (`-.optional.->`)：可選依賴\n'
  md += '- **黃色節點**：Core（核心）\n'
  md += '- **青色節點**：Orbit（軌道模組）\n'
  md += '- **紅色節點**：Infrastructure（基礎設施）\n\n'

  // 關鍵套件
  if (stats.criticalPackages.length > 0) {
    md += '## 🔑 關鍵套件（被依賴 >= 5 次）\n\n'
    md += '| 套件 | 被依賴次數 | 說明 |\n'
    md += '|------|-----------|------|\n'

    const sorted = Array.from(stats.internalDependencies.entries())
      .filter(([name]) => stats.criticalPackages.includes(name))
      .sort((a, b) => b[1] - a[1])

    for (const [name, count] of sorted) {
      const pkg = packages.get(name)
      const desc = pkg?.description || '-'
      md += `| \`@gravito/${name}\` | ${count} | ${desc} |\n`
    }
    md += '\n'
  }

  // 孤立套件
  if (stats.isolatedPackages.length > 0) {
    md += '## 🏝️ 孤立套件（沒有被其他套件依賴）\n\n'
    md += '| 套件 | 說明 |\n'
    md += '|------|------|\n'

    for (const name of stats.isolatedPackages.sort()) {
      const pkg = packages.get(name)
      const desc = pkg?.description || '-'
      md += `| \`@gravito/${name}\` | ${desc} |\n`
    }
    md += '\n'
    md += '> 這些套件通常是應用層或最終產物，不被其他套件依賴。\n\n'
  }

  // 循環依賴
  if (stats.circularDependencies.length > 0) {
    md += '## ⚠️ 循環依賴\n\n'
    md += '> **警告**：發現循環依賴！這可能導致初始化問題。\n\n'

    for (let i = 0; i < stats.circularDependencies.length; i++) {
      const cycle = stats.circularDependencies[i]
      md += `### 循環 ${i + 1}\n\n`
      md += '```\n'
      md += cycle.join(' → ') + '\n'
      md += '```\n\n'
    }
  }

  // 完整套件列表
  md += '## 📦 完整套件列表\n\n'
  md += '| 套件 | 版本 | 必需依賴 | Peer 依賴 | 可選依賴 | 被依賴次數 |\n'
  md += '|------|------|---------|----------|---------|----------|\n'

  const sortedPackages = Array.from(packages.values()).sort((a, b) => a.name.localeCompare(b.name))

  for (const pkg of sortedPackages) {
    const dependedCount = stats.internalDependencies.get(pkg.name) || 0
    const requiredDeps = pkg.dependencies.length
    const peerDeps = pkg.peerDependencies.length
    const optionalDeps = pkg.optionalDependencies.length

    md += `| \`@gravito/${pkg.name}\` | v${pkg.version} | ${requiredDeps} | ${peerDeps} | ${optionalDeps} | ${dependedCount} |\n`
  }
  md += '\n'

  // 外部依賴
  md += '## 🌍 主要外部依賴\n\n'
  md += '> 以下是 Gravito 生態系統依賴的主要外部套件。\n\n'

  const commonExternal = Array.from(stats.externalDependencies)
    .filter((dep) => !dep.startsWith('@') || dep.startsWith('@types/'))
    .sort()

  md += '| 套件 | 用途 |\n'
  md += '|------|------|\n'

  const externalDescriptions: Record<string, string> = {
    bun: 'JavaScript/TypeScript 執行環境',
    typescript: 'TypeScript 編譯器',
    zod: '執行時型別驗證',
    'reflect-metadata': '反射元資料支援',
    postgres: 'PostgreSQL 客戶端',
    redis: 'Redis 客戶端',
    nodemailer: '郵件發送',
    '@hono/node-server': 'HTTP 伺服器',
  }

  for (const dep of commonExternal.slice(0, 20)) {
    const desc = externalDescriptions[dep] || '-'
    md += `| \`${dep}\` | ${desc} |\n`
  }

  if (commonExternal.length > 20) {
    md += `\n*... 以及其他 ${commonExternal.length - 20} 個外部依賴*\n`
  }
  md += '\n'

  // 依賴類型說明
  md += '## 📖 依賴類型說明\n\n'
  md += '### 必需依賴 (dependencies)\n'
  md += '套件正常運作所**必須**安裝的依賴。缺少這些依賴會導致套件無法使用。\n\n'
  md += '### Peer 依賴 (peerDependencies)\n'
  md +=
    '需要由使用者專案提供的依賴。通常是為了確保整個專案使用相同版本的共享依賴（如 `@gravito/core`）。\n\n'
  md += '### 可選依賴 (optionalDependencies)\n'
  md += '提供額外功能但非必需的依賴。如果安裝失敗，套件仍可正常運作（部分功能可能不可用）。\n\n'

  // 整合指南連結
  md += '## 🔗 相關文件\n\n'
  md += '- [整合成本矩陣](./INTEGRATION_COST.md)\n'
  md += '- [版本相容性表](./VERSION_COMPATIBILITY.md)\n'
  md += '- [整合指南](/docs/integration-guides/)\n\n'

  // 頁尾
  md += '---\n\n'
  md += '*此文件由 `scripts/generate-dependency-graph.ts` 自動生成*\n'
  md += '*最後更新：' + new Date().toISOString() + '*\n'

  return md
}

// ============================================================================
// 主程式
// ============================================================================

async function main() {
  console.log('🚀 開始生成 Gravito 模組依賴關係圖...\n')

  // 1. 掃描套件
  console.log('📦 掃描套件...')
  const packages = scanPackages()

  if (packages.size === 0) {
    console.error('❌ 沒有找到任何套件！')
    process.exit(1)
  }

  // 2. 建立依賴邊
  console.log('🔗 分析依賴關係...')
  const edges = buildDependencyEdges(packages)
  console.log(`✅ 找到 ${edges.length} 個依賴關係`)

  // 3. 計算統計
  console.log('📊 計算統計資訊...')
  const stats = calculateStats(packages, edges)

  // 4. 生成 Mermaid 圖表
  console.log('🎨 生成 Mermaid 圖表...')
  const mermaidGraph = generateMermaidGraph(packages, edges)
  writeFileSync(MERMAID_OUTPUT, mermaidGraph, 'utf-8')
  console.log(`✅ 已生成：${MERMAID_OUTPUT}`)

  // 5. 生成 Markdown 文件
  console.log('📝 生成 Markdown 文件...')
  const markdown = generateMarkdownDoc(packages, edges, stats)
  writeFileSync(MARKDOWN_OUTPUT, markdown, 'utf-8')
  console.log(`✅ 已生成：${MARKDOWN_OUTPUT}`)

  // 6. 顯示摘要
  console.log('\n' + '='.repeat(60))
  console.log('📊 生成完成！摘要統計：')
  console.log('='.repeat(60))
  console.log(`總套件數：     ${stats.totalPackages}`)
  console.log(`依賴關係數：   ${edges.length}`)
  console.log(`外部依賴數：   ${stats.externalDependencies.size}`)
  console.log(`關鍵套件數：   ${stats.criticalPackages.length}`)
  console.log(`孤立套件數：   ${stats.isolatedPackages.length}`)
  console.log(`循環依賴數：   ${stats.circularDependencies.length}`)

  if (stats.circularDependencies.length > 0) {
    console.log('\n⚠️  警告：發現循環依賴！')
    for (const cycle of stats.circularDependencies) {
      console.log(`  - ${cycle.join(' → ')}`)
    }
  }

  console.log('\n✨ 完成！請查看：')
  console.log(`  - ${MERMAID_OUTPUT}`)
  console.log(`  - ${MARKDOWN_OUTPUT}`)
}

// 執行主程式
main().catch((error) => {
  console.error('❌ 執行失敗：', error)
  process.exit(1)
})
