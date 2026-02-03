#!/usr/bin/env bun

/**
 * 檢查未使用的導入
 *
 * 使用方式：
 * bun run scripts/check-unused-imports.ts [--all] [--fix]
 *
 * 選項：
 * --all: 檢查所有包（默認只檢查變更的包）
 * --fix: 自動移除未使用的導入
 */

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { $ } from 'bun'

const args = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    fix: { type: 'boolean', default: false },
    concurrency: { type: 'string', default: '4' },
  },
})

/**
 * 使用 biome 檢查未使用的導入
 */
async function _checkUnusedImports(packagePath: string): Promise<{
  hasUnused: boolean
  output: string
}> {
  try {
    // biome 的 organizeImports 會移除未使用的導入
    if (args.values.fix) {
      await $`bunx biome check --write --organize-imports-enabled=true ${packagePath}`.quiet()
    }

    // 檢查是否有未使用的變數（包括導入）
    const { stdout, stderr } = await $`bunx biome check ${packagePath}`.quiet()
    const output = stdout.toString() + stderr.toString()

    // 檢查是否有未使用變數的警告/錯誤
    const hasUnused =
      output.includes('noUnusedVariables') || output.includes('unused') || output.includes('TS6133')

    return { hasUnused, output }
  } catch (e: any) {
    // biome 返回非零退出碼表示有問題
    const output = e.stdout?.toString() || e.stderr?.toString() || e.message
    return { hasUnused: true, output }
  }
}

/**
 * 使用 TypeScript 編譯器檢查未使用的導入
 */
async function checkWithTypeScript(packagePath: string): Promise<{
  hasUnused: boolean
  errors: string[]
}> {
  try {
    const { stdout, stderr } = await $`cd ${packagePath} && bun run typecheck 2>&1`.quiet()
    const output = stdout.toString() + stderr.toString()

    // 提取 TS6133 錯誤（未使用的變數/導入）
    const errors = output
      .split('\n')
      .filter(
        (line) =>
          line.includes('TS6133') || line.includes('is declared but its value is never read')
      )

    return {
      hasUnused: errors.length > 0,
      errors,
    }
  } catch (e: any) {
    const output = (e.stdout?.toString() || e.stderr?.toString() || '') as string
    const errors = output
      .split('\n')
      .filter(
        (line) =>
          line.includes('TS6133') || line.includes('is declared but its value is never read')
      )

    return {
      hasUnused: errors.length > 0,
      errors,
    }
  }
}

/**
 * 找出所有包
 */
async function getAllPackages(): Promise<string[]> {
  const packages: string[] = []
  const packageDirs = ['packages', 'satellites']

  for (const dir of packageDirs) {
    const dirPath = join(process.cwd(), dir)
    try {
      const entries = await readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          packages.push(join(dirPath, entry.name))
        }
      }
    } catch (_e) {
      // 目錄不存在，忽略
    }
  }

  return packages
}

/**
 * 找出變更的包
 * 若環境變數 CHANGED_PACKAGES_BASE 已設定（如 CI 的 origin/main），則與 HEAD 比較；否則用 HEAD~1..HEAD
 */
async function getChangedPackages(): Promise<string[]> {
  try {
    const baseRef = (process.env.CHANGED_PACKAGES_BASE ?? '').trim() || 'HEAD~1'
    const { stdout } = await $`git diff --name-only ${baseRef} HEAD`.quiet()
    const changedFiles = stdout.toString().trim().split('\n').filter(Boolean)

    const changedPackages = new Set<string>()
    const allPackages = await getAllPackages()

    for (const file of changedFiles) {
      for (const pkgPath of allPackages) {
        const relativePath = pkgPath.replace(`${process.cwd()}/`, '')
        if (file.startsWith(relativePath)) {
          changedPackages.add(pkgPath)
        }
      }
    }

    return Array.from(changedPackages)
  } catch (_e) {
    return []
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('🔍 檢查未使用的導入...\n')

  const packages = args.values.all ? await getAllPackages() : await getChangedPackages()

  if (packages.length === 0) {
    console.log('ℹ️  沒有需要檢查的包')
    process.exit(0)
  }

  const concurrency = Math.max(1, Number.parseInt(args.values.concurrency ?? '4', 10) || 4)
  const runParallel = packages.length > 3 && concurrency > 1
  console.log(`📦 檢查 ${packages.length} 個包${runParallel ? `（並行 ${concurrency}）` : ''}\n`)

  let hasIssues = false
  const results: {
    pkgPath: string
    pkgName: string
    tsResult: { hasUnused: boolean; errors: string[] }
  }[] = []

  if (runParallel) {
    for (let i = 0; i < packages.length; i += concurrency) {
      const batch = packages.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(async (pkgPath) => {
          const pkgName = pkgPath.split('/').pop() || pkgPath
          const tsResult = await checkWithTypeScript(pkgPath)
          return { pkgPath, pkgName, tsResult }
        })
      )
      results.push(...batchResults)
    }
  } else {
    for (const pkgPath of packages) {
      const pkgName = pkgPath.split('/').pop() || pkgPath
      const tsResult = await checkWithTypeScript(pkgPath)
      results.push({ pkgPath, pkgName, tsResult })
    }
  }

  for (const { pkgName, tsResult } of results) {
    if (tsResult.hasUnused) {
      hasIssues = true
      console.log(`❌ ${pkgName}: 發現未使用的導入/變數`)
      for (const error of tsResult.errors.slice(0, 5)) {
        console.log(`    ${error}`)
      }
      if (tsResult.errors.length > 5) {
        console.log(`    ... 還有 ${tsResult.errors.length - 5} 個問題`)
      }
    } else {
      console.log(`✅ ${pkgName}`)
    }
  }

  if (hasIssues) {
    console.log('\n💡 提示：使用 --fix 選項可以自動修復部分問題')
    console.log('   或使用 biome check --write --organize-imports-enabled=true')
    process.exit(1)
  } else {
    console.log('\n✅ 所有包都沒有未使用的導入')
    process.exit(0)
  }
}

main().catch((e) => {
  console.error('❌ 錯誤：', e)
  process.exit(1)
})
