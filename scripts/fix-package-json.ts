#!/usr/bin/env bun

/**
 * 修復所有套件的 package.json 問題
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PACKAGES_DIR = join(process.cwd(), 'packages')

async function fixPackageJson(pkgPath: string): Promise<boolean> {
  try {
    const content = await readFile(pkgPath, 'utf-8')
    const json = JSON.parse(content)

    if (json.private) return false

    let modified = false

    // 修復 bin 路徑（移除前綴的 ./）
    if (json.bin) {
      if (typeof json.bin === 'object') {
        for (const key in json.bin) {
          const value = json.bin[key]
          if (typeof value === 'string' && value.startsWith('./')) {
            json.bin[key] = value.substring(2)
            modified = true
          }
        }
      }
    }

    // 確保 publishConfig 存在
    if (!json.publishConfig) {
      json.publishConfig = { access: 'public' }
      modified = true
    } else if (!json.publishConfig.access) {
      json.publishConfig.access = 'public'
      modified = true
    }

    // 確保 files 欄位存在（如果沒有 dist 目錄，可能需要調整）
    if (!json.files) {
      // 檢查是否有 dist 目錄
      const distExists = await Bun.file(join(pkgPath, '..', 'dist'))
        .exists()
        .catch(() => false)
      if (distExists) {
        json.files = ['dist', 'README.md'].filter(async (f) => {
          const filePath = join(pkgPath, '..', f)
          return await Bun.file(filePath)
            .exists()
            .catch(() => false)
        })
        modified = true
      }
    }

    if (modified) {
      await writeFile(pkgPath, JSON.stringify(json, null, 2) + '\n')
      return true
    }

    return false
  } catch (e: any) {
    console.warn(`⚠️  無法處理 ${pkgPath}:`, e.message)
    return false
  }
}

async function main() {
  console.log('🔧 修復所有套件的 package.json...\n')

  const dirs = await readdir(PACKAGES_DIR)
  let fixedCount = 0

  for (const dir of dirs) {
    const pkgPath = join(PACKAGES_DIR, dir, 'package.json')
    try {
      const fixed = await fixPackageJson(pkgPath)
      if (fixed) {
        console.log(`  ✅ 修復 ${dir}`)
        fixedCount++
      }
    } catch (e: any) {
      // 忽略錯誤
    }
  }

  console.log(`\n✨ 完成！修復了 ${fixedCount} 個套件`)
  console.log('\n💡 建議執行：npm pkg fix（在每個套件目錄下）')
}

main().catch(console.error)
