#!/usr/bin/env bun

/**
 * 版本檢查工具
 *
 * 用途：
 *   在發布流程前執行，檢查是否有「修改了程式碼但忘記升級版號」的情況。
 *   原理是檢查本地 package.json 的版本是否已經存在於 NPM Registry。
 *   如果本地版本已存在，則標記為 "⚠️ EXISTS"，暗示您可能需要升級版號。
 *
 * 使用方式：
 *   bun scripts/check-versions.ts
 */

import { exec } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const PACKAGES_DIR = join(process.cwd(), 'packages')

interface PackageStatus {
  name: string
  path: string
  localVersion: string
  remoteVersion: string | null // null means not published or error
  existsOnRemote: boolean
  private: boolean
}

// 顏色常數
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
}

async function getPackageStatus(dirName: string): Promise<PackageStatus | null> {
  const pkgPath = join(PACKAGES_DIR, dirName)
  const pkgJsonPath = join(pkgPath, 'package.json')

  try {
    const content = await readFile(pkgJsonPath, 'utf-8')
    const json = JSON.parse(content)

    if (json.private) {
      return {
        name: json.name,
        path: pkgPath,
        localVersion: json.version,
        remoteVersion: null,
        existsOnRemote: false,
        private: true,
      }
    }

    const localVersion = json.version
    let existsOnRemote = false
    let remoteVersion = null

    try {
      // 檢查本地版本是否已存在於 NPM
      // npm view <pkg>@<version> version
      // 如果成功回傳版本號，表示已存在
      const { stdout } = await execAsync(`npm view ${json.name}@${localVersion} version`, {
        encoding: 'utf-8',
      })
      if (stdout.trim() === localVersion) {
        existsOnRemote = true
      }
    } catch {
      // 404 Not Found 代表未發布，這是好消息（代表是新版本）
      existsOnRemote = false
    }

    // 另外獲取最新的版本供參考
    try {
      // 加上 --json 避免非 json 輸出干擾，但 npm view output 很單純，直接取 stdout 即可
      // 這裡只取 latest 做參考
      const { stdout: latest } = await execAsync(`npm view ${json.name} dist-tags.latest`, {
        encoding: 'utf-8',
      })
      remoteVersion = latest.trim()
    } catch {
      // 全新套件可能沒有 latest
    }

    return {
      name: json.name,
      path: pkgPath,
      localVersion,
      remoteVersion,
      existsOnRemote,
      private: false,
    }
  } catch {
    // console.warn(`無法讀取 ${dirName}: ${e.message}`);
    return null
  }
}

async function main() {
  console.log(`${colors.bold}🔍 Gravito 套件版本健康度檢查...${colors.reset}\n`)

  // 檢查 NPM 登入
  try {
    await execAsync('npm whoami')
  } catch {
    console.warn(
      `${colors.yellow}⚠️  警告: 未登入 NPM。檢查結果可能不準確（私有套件可能無法檢測）。${colors.reset}\n`
    )
  }

  const dirs = await readdir(PACKAGES_DIR)
  const checkPromises = dirs.map((dir) => getPackageStatus(dir))
  const rawResults = await Promise.all(checkPromises)

  // 過濾掉無效或 private 的
  const results = rawResults.filter((p): p is PackageStatus => p !== null && !p.private)

  // 排序：先列出有問題的 (EXISTS)，再列出正常的 (NEW)
  results.sort((a, b) => {
    if (a.existsOnRemote === b.existsOnRemote) return a.name.localeCompare(b.name)
    return a.existsOnRemote ? -1 : 1 // Exists first
  })

  console.log(
    `${colors.bold}${'PACKAGE'.padEnd(35)} ${'LOCAL'.padEnd(15)} ${'STATUS'.padEnd(20)} ${'ACTION REQUIRED'}${colors.reset}`
  )
  console.log('─'.repeat(90))

  let attentionCount = 0

  for (const pkg of results) {
    const isNew = !pkg.existsOnRemote

    let statusStr = ''
    let actionStr = ''
    let rowColor = colors.reset

    if (isNew) {
      statusStr = `${colors.green}✨ NEW VERSION${colors.reset}`
      actionStr = `${colors.green}Ready to Publish${colors.reset}`
    } else {
      statusStr = `${colors.yellow}⚠️  EXISTS${colors.reset}`
      actionStr = `${colors.gray}No Change / Forgot Bump?${colors.reset}`
      rowColor = colors.yellow
      attentionCount++
    }

    // 特殊標示：如果本地版本比 remote latest 還舊，那很怪
    // 這裡暫不實作複雜比較，專注於 "同版本是否已存在"

    console.log(
      `${rowColor}${pkg.name.padEnd(35)}${colors.reset} ` +
        `${pkg.localVersion.padEnd(15)} ` +
        `${statusStr.padEnd(29)} ` + // escape codes add length invisible to padding, manual adjustment might be needed if strict align
        `${actionStr}`
    )
  }

  console.log('─'.repeat(90))
  console.log(`\n📊 掃描完成: ${results.length} 個公開套件`)

  if (attentionCount > 0) {
    console.log(
      `${colors.yellow}⚠️  發現 ${attentionCount} 個套件的本地版本已存在於 NPM。${colors.reset}`
    )
    console.log(
      `   如果您最近修改過這些套件的程式碼，請務必${colors.bold}更新 package.json 版本號${colors.reset}，否則變更將不會被發布。`
    )
  } else {
    console.log(`${colors.green}✅ 所有版本狀態看起來都很健康！${colors.reset}`)
  }
}

main().catch(console.error)
