#!/usr/bin/env bun

/**
 * 檢查所有套件的 typecheck 配置
 * 確保配置一致且正確
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface PackageConfig {
  name: string
  path: string
  hasTypecheck: boolean
  typecheckScript: string | null
  hasSkipLibCheck: boolean
  tsconfigSkipLibCheck: boolean | null
  issues: string[]
}

const PACKAGES_DIR = join(process.cwd(), 'packages')
const SATELLITES_DIR = join(process.cwd(), 'satellites')

async function checkPackage(packagePath: string, packageName: string): Promise<PackageConfig> {
  const issues: string[] = []
  const pkgJsonPath = join(packagePath, 'package.json')
  const tsconfigPath = join(packagePath, 'tsconfig.json')

  let hasTypecheck = false
  let typecheckScript: string | null = null
  let hasSkipLibCheck = false
  let tsconfigSkipLibCheck: boolean | null = null

  try {
    // 檢查 package.json
    const pkgContent = await readFile(pkgJsonPath, 'utf-8')
    const pkg = JSON.parse(pkgContent)

    if (pkg.scripts?.typecheck) {
      hasTypecheck = true
      typecheckScript = pkg.scripts.typecheck

      // 檢查是否使用正確的命令
      if (typecheckScript !== 'bun tsc -p tsconfig.json --noEmit --skipLibCheck') {
        issues.push(
          `⚠️  typecheck 腳本建議標準化為 'bun tsc -p tsconfig.json --noEmit --skipLibCheck'（當前: ${typecheckScript}）`
        )
      }

      // 檢查是否有 --skipLibCheck
      if (!typecheckScript.includes('--skipLibCheck')) {
        issues.push(`❌ 缺少 --skipLibCheck（需要跳過 lib 檢查以避免類型衝突）`)
        hasSkipLibCheck = false
      } else {
        hasSkipLibCheck = true
      }
    } else {
      issues.push(`⚠️  缺少 typecheck 腳本`)
    }

    // 檢查 tsconfig.json
    try {
      const tsconfigContent = await readFile(tsconfigPath, 'utf-8')
      const tsconfig = JSON.parse(tsconfigContent)

      if (tsconfig.compilerOptions?.skipLibCheck !== undefined) {
        tsconfigSkipLibCheck = tsconfig.compilerOptions.skipLibCheck
      }

      // 如果套件有類型衝突風險，建議在 tsconfig 中也設定
      if (pkg.devDependencies?.['@types/node'] && pkg.devDependencies?.['bun-types']) {
        if (tsconfigSkipLibCheck !== true) {
          issues.push(
            `⚠️  建議在 tsconfig.json 中設定 skipLibCheck: true（套件同時有 @types/node 和 bun-types）`
          )
        }
      }
    } catch {
      // tsconfig.json 不存在或無法讀取，這可能不是問題（可能繼承根目錄的）
    }
  } catch (error) {
    issues.push(`❌ 無法讀取 package.json: ${error}`)
  }

  return {
    name: packageName,
    path: packagePath,
    hasTypecheck,
    typecheckScript,
    hasSkipLibCheck,
    tsconfigSkipLibCheck,
    issues,
  }
}

async function checkAllPackages() {
  console.log('🔍 檢查所有套件的 typecheck 配置...\n')

  const packages: PackageConfig[] = []

  // 檢查 packages 目錄
  try {
    const packageDirs = await readdir(PACKAGES_DIR, { withFileTypes: true })
    for (const dir of packageDirs) {
      if (dir.isDirectory()) {
        const packagePath = join(PACKAGES_DIR, dir.name)
        const config = await checkPackage(packagePath, `@gravito/${dir.name}`)
        packages.push(config)
      }
    }
  } catch (error) {
    console.error(`❌ 無法讀取 packages 目錄: ${error}`)
  }

  // 檢查 satellites 目錄
  try {
    const satelliteDirs = await readdir(SATELLITES_DIR, { withFileTypes: true })
    for (const dir of satelliteDirs) {
      if (dir.isDirectory()) {
        const packagePath = join(SATELLITES_DIR, dir.name)
        const config = await checkPackage(packagePath, `@gravito/satellite-${dir.name}`)
        packages.push(config)
      }
    }
  } catch (error) {
    console.error(`❌ 無法讀取 satellites 目錄: ${error}`)
  }

  // 統計和報告
  const packagesWithIssues = packages.filter((pkg) => pkg.issues.length > 0)
  const packagesWithoutTypecheck = packages.filter((pkg) => !pkg.hasTypecheck)

  console.log(`📊 統計結果:`)
  console.log(`   總套件數: ${packages.length}`)
  console.log(`   有 typecheck 腳本: ${packages.filter((p) => p.hasTypecheck).length}`)
  console.log(`   有問題的套件: ${packagesWithIssues.length}`)
  console.log(`   缺少 typecheck: ${packagesWithoutTypecheck.length}\n`)

  if (packagesWithIssues.length > 0) {
    console.log('❌ 發現問題的套件:\n')
    for (const pkg of packagesWithIssues) {
      console.log(`📦 ${pkg.name}`)
      for (const issue of pkg.issues) {
        console.log(`   ${issue}`)
      }
      console.log()
    }
  }

  if (packagesWithoutTypecheck.length > 0) {
    console.log('⚠️  缺少 typecheck 腳本的套件:\n')
    for (const pkg of packagesWithoutTypecheck) {
      console.log(`   - ${pkg.name}`)
    }
    console.log()
  }

  // 檢查配置一致性
  const typecheckPatterns = new Set<string>()
  for (const pkg of packages) {
    if (pkg.typecheckScript) {
      // 標準化腳本（移除多餘空格）
      const normalized = pkg.typecheckScript.replace(/\s+/g, ' ').trim()
      typecheckPatterns.add(normalized)
    }
  }

  if (typecheckPatterns.size > 3) {
    console.log('⚠️  發現多種 typecheck 配置模式，建議統一:\n')
    for (const pattern of typecheckPatterns) {
      const count = packages.filter(
        (p) => p.typecheckScript?.replace(/\s+/g, ' ').trim() === pattern
      ).length
      console.log(`   ${pattern} (${count} 個套件)`)
    }
    console.log()
  }

  // 只檢查關鍵問題（錯誤級別），警告不阻止通過
  const criticalIssues = packages.filter((pkg) => {
    return pkg.issues.some((issue) => issue.startsWith('❌'))
  })

  // 總結
  if (criticalIssues.length === 0) {
    console.log('✅ 所有套件的 typecheck 配置都正確！')
    if (packagesWithIssues.length > 0) {
      console.log('⚠️  有一些警告，但不影響功能')
    }
    process.exit(0)
  } else {
    console.log('❌ 發現關鍵配置問題，請修正後再提交')
    process.exit(1)
  }
}

// 執行檢查
checkAllPackages().catch((error) => {
  console.error('❌ 檢查過程發生錯誤:', error)
  process.exit(1)
})
