#!/usr/bin/env bun

/**
 * 發布前驗證工具
 * 檢查套件是否準備好發布
 */

import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const PACKAGE_NAME = process.argv[2]

if (!PACKAGE_NAME) {
  console.error('❌ 請提供套件名稱')
  console.log('使用方式: bun run scripts/validate-before-publish.ts <套件名稱>')
  console.log('例如: bun run scripts/validate-before-publish.ts core')
  process.exit(1)
}

async function checkFileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function validatePackage() {
  const pkgDir = join(process.cwd(), 'packages', PACKAGE_NAME)
  const pkgJsonPath = join(pkgDir, 'package.json')

  console.log(`🔍 驗證套件: ${PACKAGE_NAME}\n`)

  // 1. 檢查 package.json 存在
  if (!(await checkFileExists(pkgJsonPath))) {
    console.error(`❌ package.json 不存在: ${pkgJsonPath}`)
    console.log('💡 提示: 請確認套件名稱正確，並在項目根目錄執行')
    process.exit(1)
  }
  console.log('✅ package.json 存在')

  // 2. 讀取 package.json
  const content = await readFile(pkgJsonPath, 'utf-8')
  const pkg = JSON.parse(content)

  // 3. 檢查是否為 private
  if (pkg.private) {
    console.log('⚠️  套件標記為 private，不會發布')
    process.exit(0)
  }

  // 4. 檢查版本號
  console.log(`✅ 版本號: ${pkg.version}`)
  const isBeta = pkg.version.includes('beta')
  const isAlpha = pkg.version.includes('alpha')
  const tag = isBeta ? 'beta' : isAlpha ? 'alpha' : 'latest'
  console.log(`✅ 發布標籤: ${tag}`)

  // 5. 檢查 dist 目錄
  const distPath = join(pkgDir, 'dist')
  if (!(await checkFileExists(distPath))) {
    console.error('❌ dist 目錄不存在')
    console.log('💡 提示: 請先執行 bun run build')
    process.exit(1)
  }
  console.log('✅ dist 目錄存在')

  // 6. 檢查 main/module 指向的文件
  if (pkg.main) {
    const mainPath = join(pkgDir, pkg.main.replace(/^\.\//, ''))
    if (!(await checkFileExists(mainPath))) {
      console.error(`❌ main 文件不存在: ${pkg.main}`)
      process.exit(1)
    }
    console.log(`✅ main 文件存在: ${pkg.main}`)
  }

  if (pkg.module) {
    const modulePath = join(pkgDir, pkg.module.replace(/^\.\//, ''))
    if (!(await checkFileExists(modulePath))) {
      console.error(`❌ module 文件不存在: ${pkg.module}`)
      process.exit(1)
    }
    console.log(`✅ module 文件存在: ${pkg.module}`)
  }

  // 7. 檢查 bin（如果有）
  if (pkg.bin) {
    if (typeof pkg.bin === 'object') {
      for (const [key, value] of Object.entries(pkg.bin)) {
        if (typeof value === 'string') {
          const binPath = join(pkgDir, value.replace(/^\.\//, ''))
          if (!(await checkFileExists(binPath))) {
            console.error(`❌ bin[${key}] 文件不存在: ${value}`)
            process.exit(1)
          }
          console.log(`✅ bin[${key}] 文件存在: ${value}`)
        }
      }
    }
  }

  // 8. 檢查 publishConfig
  if (!pkg.publishConfig) {
    console.warn('⚠️  缺少 publishConfig，建議添加 { "access": "public" }')
  } else {
    console.log('✅ publishConfig 存在')
  }

  // 總結
  console.log('\n✨ 驗證通過！可以發布')
  console.log(`\n📋 發布命令：`)
  console.log(`   cd packages/${PACKAGE_NAME}`)
  if (tag !== 'latest') {
    console.log(`   npm publish --access public --tag ${tag}`)
  } else {
    console.log(`   npm publish --access public`)
  }
}

validatePackage().catch((error) => {
  console.error('❌ 驗證失敗:', error.message)
  process.exit(1)
})
