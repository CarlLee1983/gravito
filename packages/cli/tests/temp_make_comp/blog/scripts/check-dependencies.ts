/**
 * 相依套件版本檢查腳本
 *
 * 檢查 package.json 中的套件是否為最新穩定版本
 * 並提供更新建議
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

interface PackageInfo {
  name: string
  current: string
  latest: string
  outdated: boolean
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function getLatestVersion(packageName: string): Promise<string | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`)
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    return data.version
  } catch {
    return null
  }
}

function parseVersion(version: string): string {
  // 移除 ^, ~, >= 等前綴
  return version.replace(/^[\^~>=<]/, '')
}

async function checkPackage(name: string, currentVersion: string): Promise<PackageInfo | null> {
  // 跳過本地連結的套件
  if (currentVersion.startsWith('link:') || currentVersion.startsWith('workspace:')) {
    return null
  }

  const current = parseVersion(currentVersion)
  const latest = await getLatestVersion(name)

  if (!latest) {
    return null
  }

  return {
    name,
    current,
    latest,
    outdated: current !== latest,
  }
}

async function main() {
  log('\n=== 相依套件版本檢查 ===\n', 'blue')

  const packageJsonPath = join(process.cwd(), 'package.json')
  const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  log(`檢查 ${Object.keys(allDependencies).length} 個套件...\n`, 'yellow')

  const results: PackageInfo[] = []
  const outdated: PackageInfo[] = []
  const upToDate: PackageInfo[] = []

  // 檢查所有套件
  for (const [name, version] of Object.entries(allDependencies)) {
    const info = await checkPackage(name, version)
    if (info) {
      results.push(info)
      if (info.outdated) {
        outdated.push(info)
      } else {
        upToDate.push(info)
      }
    }
  }

  // 顯示結果
  if (upToDate.length > 0) {
    log(`\n✓ 已是最新版本 (${upToDate.length}):`, 'green')
    upToDate.forEach((pkg) => {
      log(`  ${pkg.name}: ${pkg.current}`, 'green')
    })
  }

  if (outdated.length > 0) {
    log(`\n⚠ 需要更新 (${outdated.length}):`, 'yellow')
    outdated.forEach((pkg) => {
      log(`  ${pkg.name}: ${pkg.current} → ${pkg.latest}`, 'yellow')
    })
  }

  // 總結
  log('\n=== 檢查結果 ===', 'blue')
  log(`總計: ${results.length} 個套件`, 'blue')
  log(`最新: ${upToDate.length} 個`, 'green')
  log(`需更新: ${outdated.length} 個`, outdated.length > 0 ? 'yellow' : 'green')

  // 如果有需要更新的套件，返回非零退出碼
  if (outdated.length > 0) {
    log('\n建議執行以下命令更新套件：', 'yellow')
    log('  bun update', 'yellow')
    process.exit(1)
  } else {
    log('\n✓ 所有套件都是最新版本！', 'green')
    process.exit(0)
  }
}

main().catch((error) => {
  log(`\n錯誤: ${error.message}`, 'red')
  process.exit(1)
})
