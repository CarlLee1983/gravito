#!/usr/bin/env bun

/**
 * 快速升級版號工具
 *
 * 使用方式：
 *   bun scripts/bump-version.ts <套件名稱關鍵字> [版本號|beta|patch|minor|major]
 *
 * 範例：
 *   bun scripts/bump-version.ts flux beta      -> 自動將 flux 升級到下一個 beta 版本 (例如 1.0.0-beta.2 -> 1.0.0-beta.3)
 *   bun scripts/bump-version.ts stream 2.0.0   -> 指定升級到 2.0.0
 *   bun scripts/bump-version.ts core patch     -> 1.0.0 -> 1.0.1
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PACKAGES_DIR = join(process.cwd(), 'packages')

// 顏色常數
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
}

interface PackageInfo {
  dirName: string
  pkgJsonPath: string
  name: string
  version: string
  jsonContent: any
}

// 取得所有套件資訊
async function getPackages(): Promise<PackageInfo[]> {
  const packages: PackageInfo[] = []
  const dirs = await readdir(PACKAGES_DIR)

  for (const dir of dirs) {
    const pkgPath = join(PACKAGES_DIR, dir, 'package.json')
    try {
      const content = await readFile(pkgPath, 'utf-8')
      const json = JSON.parse(content)
      packages.push({
        dirName: dir,
        pkgJsonPath: pkgPath,
        name: json.name,
        version: json.version,
        jsonContent: json,
      })
    } catch {
      // 忽略無法讀取的目錄
    }
  }
  return packages
}

// 計算新版本號
function calculateNewVersion(currentVersion: string, type: string): string | null {
  // 1. 如果使用者直接輸入 x.y.z 格式，直接回傳
  if (/^\d+\.\d+\.\d+(-\w+(\.\d+)?)?$/.test(type)) {
    return type
  }

  const versionParts = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)(-(.+))?$/)
  if (!versionParts) {
    return null
  }

  const [_, major, minor, patch, __, preRelease] = versionParts
  const maj = parseInt(major, 10)
  const min = parseInt(minor, 10)
  const pat = parseInt(patch, 10)

  if (type === 'beta' || type === 'alpha') {
    // 處理 Pre-release
    if (preRelease?.startsWith(type)) {
      // 已經是 beta.x -> beta.(x+1)
      const preParts = preRelease.split('.')
      if (preParts.length === 2 && !Number.isNaN(parseInt(preParts[1], 10))) {
        const nextNum = parseInt(preParts[1], 10) + 1
        return `${maj}.${min}.${pat}-${type}.${nextNum}`
      }
      // 只有 beta -> beta.1
      return `${maj}.${min}.${pat}-${type}.1`
    } else {
      // 從正式版或其他轉為 beta -> 版號不變(或 patch+1? 通常接在正式版後是 patch+1)
      // 這裡簡單處理：如果是正式版，轉 beta 視為 patch 升級的預發布：1.0.0 -> 1.0.1-beta.1
      // 但如果原本就是 pre-release (例如 alpha -> beta)，則維持主版號
      return `${maj}.${min}.${pat}-${type}.1`
    }
  }

  // 處理標準 SemVer
  if (preRelease) {
    // 如果是 pre-release 版本，patch/minor/major 都會移除 pre-release 後綴並根據需要升級數字
    // 例如 1.0.0-beta.1 + patch -> 1.0.0 (通常 pre-release 要轉正，直接升級到當前主版號)
    // 這裡採用簡單策略：去除 pre-release tag，並視 type 決定是否進位
    // 1.0.0-beta.1 -> patch -> 1.0.0
    if (type === 'patch') {
      return `${maj}.${min}.${pat}`
    }
    if (type === 'minor') {
      return `${maj}.${min + 1}.0`
    }
    if (type === 'major') {
      return `${maj + 1}.0.0`
    }
  } else {
    if (type === 'patch') {
      return `${maj}.${min}.${pat + 1}`
    }
    if (type === 'minor') {
      return `${maj}.${min + 1}.0`
    }
    if (type === 'major') {
      return `${maj + 1}.0.0`
    }
  }

  return null
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.log(`
${colors.bold}使用方式:${colors.reset}
  bun scripts/bump-version.ts <名稱關鍵字> <版本類型或號碼>

${colors.bold}範例:${colors.reset}
  bun scripts/bump-version.ts flux beta     (自動遞增 beta 版號)
  bun scripts/bump-version.ts stream patch  (自動遞增 patch 版號)
  bun scripts/bump-version.ts core 1.2.3    (指定版本)
`)
    return
  }

  const [keyword, versionInput] = args
  const packages = await getPackages()

  // 模糊搜尋
  const matched = packages.filter((p) => p.name.includes(keyword) || p.dirName.includes(keyword))

  if (matched.length === 0) {
    console.error(`${colors.red}❌ 找不到包含 "${keyword}" 的套件${colors.reset}`)
    process.exit(1)
  }

  if (matched.length > 1) {
    console.error(`${colors.yellow}⚠️  找到多個套件，請輸入更精確的關鍵字:${colors.reset}`)
    for (const p of matched) {
      console.log(`   - ${p.name} (${p.dirName})`)
    }
    process.exit(1)
  }

  const pkg = matched[0]
  const newVersion = calculateNewVersion(pkg.version, versionInput)

  if (!newVersion) {
    console.error(
      `${colors.red}❌ 無法計算新版本號 (當前: ${pkg.version}, 輸入: ${versionInput})${colors.reset}`
    )
    process.exit(1)
  }

  console.log(`\n📦 套件: ${colors.bold}${pkg.name}${colors.reset}`)
  console.log(`🔹 當前: ${pkg.version}`)
  console.log(`🚀 目標: ${colors.green}${newVersion}${colors.reset}`)

  // 更新檔案
  pkg.jsonContent.version = newVersion
  // 保持縮排格式 (通常是 2 或 4 空格，這裡簡單偵測或預設 2)
  // 為了安全，重新讀取原文來保留格式結尾換行比較好，但 JSON.stringify 夠用了
  await writeFile(pkg.pkgJsonPath, `${JSON.stringify(pkg.jsonContent, null, 2)}\n`) // 預設使用 4 空格縮排可能比較常見，但 package.json 常見是 2

  console.log(`\n✅ ${pkg.name} 版本已更新！`)
  console.log(`   現在您可以執行 bun scripts/publish-all.ts 來發布了。`)
}

main().catch(console.error)
