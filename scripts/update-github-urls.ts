#!/usr/bin/env bun

/**
 * 更新所有檔案中的 GitHub URL
 *
 * 使用方法：
 * bun run scripts/update-github-urls.ts <組織名稱> <repository名稱>
 *
 * 範例：
 * bun run scripts/update-github-urls.ts gravito-org @gravito/core
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const OLD_ORG = 'CarlLee1983'
const OLD_REPO = 'gravito'
const OLD_REPO_FULL = '@gravito/core'

// 從命令列參數取得新組織和 repository 名稱
const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('❌ 請提供組織名稱和 repository 名稱')
  console.error('使用方法: bun run scripts/update-github-urls.ts <組織名稱> <repository名稱>')
  console.error('範例: bun run scripts/update-github-urls.ts gravito-org @gravito/core')
  process.exit(1)
}

const NEW_ORG = args[0]
const NEW_REPO = args[1]

console.log(`🔄 開始更新 GitHub URL...`)
console.log(`   從: github.com/${OLD_ORG}/${OLD_REPO}`)
console.log(`   到: github.com/${NEW_ORG}/${NEW_REPO}`)
console.log('')

// 需要更新的檔案類型
const FILE_EXTENSIONS = ['.json', '.ts', '.tsx', '.md', '.html', '.yml', '.yaml']
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', '.next', 'coverage', 'tmp']

// 需要更新的 URL 模式
const URL_PATTERNS = [
  {
    old: new RegExp(`github\\.com/${OLD_ORG}/${OLD_REPO}`, 'g'),
    new: `github.com/${NEW_ORG}/${NEW_REPO}`,
  },
  {
    old: new RegExp(`github\\.com/${OLD_ORG}/${OLD_REPO_FULL}`, 'g'),
    new: `github.com/${NEW_ORG}/${NEW_REPO}`,
  },
  {
    old: new RegExp(`github:${OLD_ORG}/${OLD_REPO}`, 'g'),
    new: `github:${NEW_ORG}/${NEW_REPO}`,
  },
]

let updatedFiles = 0
let totalReplacements = 0

async function shouldProcessFile(filePath: string): Promise<boolean> {
  const stats = await stat(filePath)
  if (!stats.isFile()) {
    return false
  }

  const ext = filePath.substring(filePath.lastIndexOf('.'))
  if (!FILE_EXTENSIONS.includes(ext)) {
    return false
  }

  // 檢查是否在排除目錄中
  const parts = filePath.split('/')
  for (const part of parts) {
    if (EXCLUDE_DIRS.includes(part)) {
      return false
    }
  }

  return true
}

async function processFile(filePath: string): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')
    let newContent = content
    let fileReplacements = 0

    // 應用所有 URL 模式替換
    for (const pattern of URL_PATTERNS) {
      const matches = content.match(pattern.old)
      if (matches) {
        fileReplacements += matches.length
        newContent = newContent.replace(pattern.old, pattern.new)
      }
    }

    // 如果有替換，寫回檔案
    if (fileReplacements > 0) {
      await writeFile(filePath, newContent, 'utf-8')
      updatedFiles++
      totalReplacements += fileReplacements
      console.log(`  ✅ ${filePath} (${fileReplacements} 處替換)`)
    }
  } catch (error: any) {
    console.error(`  ❌ 處理 ${filePath} 時發生錯誤:`, error.message)
  }
}

async function processDirectory(dirPath: string): Promise<void> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)

      // 跳過排除目錄
      if (EXCLUDE_DIRS.includes(entry.name)) {
        continue
      }

      if (entry.isDirectory()) {
        await processDirectory(fullPath)
      } else if (entry.isFile()) {
        if (await shouldProcessFile(fullPath)) {
          await processFile(fullPath)
        }
      }
    }
  } catch (error: any) {
    // 忽略權限錯誤等
    if (error.code !== 'EACCES' && error.code !== 'ENOENT') {
      console.error(`  ⚠️  處理目錄 ${dirPath} 時發生錯誤:`, error.message)
    }
  }
}

async function main() {
  const rootDir = process.cwd()
  console.log(`📁 掃描目錄: ${rootDir}\n`)

  await processDirectory(rootDir)

  console.log('')
  console.log('✨ 更新完成！')
  console.log(`   - 更新檔案數: ${updatedFiles}`)
  console.log(`   - 總替換次數: ${totalReplacements}`)
  console.log('')
  console.log('📋 下一步：')
  console.log('   1. 檢查變更: git diff')
  console.log(
    '   2. 確認無誤後提交: git add . && git commit -m "chore: update GitHub URLs to organization"'
  )
  console.log(
    '   3. 更新 Git remote: git remote set-url origin https://github.com/' +
      NEW_ORG +
      '/' +
      NEW_REPO +
      '.git'
  )
}

main().catch(console.error)
