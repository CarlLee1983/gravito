#!/usr/bin/env bun

/**
 * 驗證所有套件使用 bunx tsc 執行 typecheck
 * 確保本地環境與 CI 環境一致
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { $ } from 'bun'

const PACKAGES_DIR = join(process.cwd(), 'packages')

interface PackageInfo {
  name: string
  path: string
  typecheckScript: string | null
}

async function findPackagesWithTypecheck(): Promise<PackageInfo[]> {
  const packages: PackageInfo[] = []

  // 檢查 packages 目錄
  try {
    const packageDirs = await readdir(PACKAGES_DIR, { withFileTypes: true })
    for (const dir of packageDirs) {
      if (dir.isDirectory()) {
        const packagePath = join(PACKAGES_DIR, dir.name)
        const pkgJsonPath = join(packagePath, 'package.json')
        try {
          const pkgContent = await readFile(pkgJsonPath, 'utf-8')
          const pkg = JSON.parse(pkgContent)
          if (pkg.scripts?.typecheck) {
            packages.push({
              name: `@gravito/${dir.name}`,
              path: packagePath,
              typecheckScript: pkg.scripts.typecheck,
            })
          }
        } catch {
          // 忽略無法讀取的 package.json
        }
      }
    }
  } catch (error) {
    console.error(`❌ 無法讀取 packages 目錄: ${error}`)
  }

  return packages
}

async function verifyPackageTypecheck(
  pkg: PackageInfo
): Promise<{ success: boolean; error?: string }> {
  console.log(`🔍 驗證 ${pkg.name}...`)

  try {
    // 使用 bun 執行 tsc（與 CI 環境一致）
    const result = await $`cd ${pkg.path} && bun tsc --noEmit --skipLibCheck`.quiet()
    if (result.exitCode === 0) {
      console.log(`  ✅ ${pkg.name} typecheck 通過`)
      return { success: true }
    } else {
      const error = `typecheck 失敗 (exit code: ${result.exitCode})`
      console.error(`  ❌ ${pkg.name}: ${error}`)
      return { success: false, error }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`  ❌ ${pkg.name}: ${errorMsg}`)
    return { success: false, error: errorMsg }
  }
}

async function main() {
  console.log('🚀 開始驗證所有套件的 typecheck（使用 bunx，與 CI 環境一致）...\n')

  const packages = await findPackagesWithTypecheck()
  console.log(`📦 找到 ${packages.length} 個有 typecheck 腳本的套件\n`)

  const results = await Promise.all(packages.map((pkg) => verifyPackageTypecheck(pkg)))

  const failed = results.filter((r) => !r.success)
  const passed = results.filter((r) => r.success)

  console.log(`\n📊 驗證結果:`)
  console.log(`   ✅ 通過: ${passed.length}`)
  console.log(`   ❌ 失敗: ${failed.length}`)

  if (failed.length > 0) {
    console.log(`\n❌ 以下套件的 typecheck 失敗:`)
    for (let i = 0; i < packages.length; i++) {
      if (!results[i].success) {
        console.log(`   - ${packages[i].name}: ${results[i].error}`)
      }
    }
    console.log(`\n💡 提示: 請確保使用 'bun tsc --noEmit --skipLibCheck' 執行 typecheck`)
    process.exit(1)
  } else {
    console.log(`\n✅ 所有套件的 typecheck 都通過！`)
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('❌ 驗證過程發生錯誤:', error)
  process.exit(1)
})
