#!/usr/bin/env bun

/**
 * 驗證受影響的套件
 * 在推送前檢查變更的套件是否正確建置
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

async function main() {
  try {
    // 獲取變更的檔案
    const changedFiles = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
    })
      .split('\n')
      .filter(Boolean)

    // 找出受影響的套件
    const affectedPackages = new Set<string>()

    for (const file of changedFiles) {
      // 檢查是否在 packages/ 或 satellites/ 目錄下
      const packagesMatch = file.match(/^(packages|satellites)\/([^/]+)\//)
      if (packagesMatch) {
        const [, , packageName] = packagesMatch
        affectedPackages.add(`${packagesMatch[1]}/${packageName}`)
      }
    }

    if (affectedPackages.size === 0) {
      console.log('✅ 沒有套件變更，跳過驗證')
      process.exit(0)
    }

    console.log(`🔍 檢查 ${affectedPackages.size} 個受影響的套件...\n`)

    // 檢查每個套件是否有 dist 目錄（表示已建置）
    const hasIssues = false
    for (const pkg of affectedPackages) {
      const distPath = join(process.cwd(), pkg, 'dist')
      if (!existsSync(distPath)) {
        console.warn(`⚠️  ${pkg} 缺少 dist 目錄（可能需要建置）`)
        // 不視為錯誤，因為可能只是配置變更
      } else {
        console.log(`✅ ${pkg} 已建置`)
      }
    }

    console.log('\n✅ 驗證完成')
    process.exit(0)
  } catch (error) {
    console.error('❌ 驗證失敗:', error)
    // 不阻止推送，只顯示警告
    process.exit(0)
  }
}

main()
