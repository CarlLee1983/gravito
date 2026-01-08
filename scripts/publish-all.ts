#!/usr/bin/env bun

/**
 * 發布所有套件到 NPM
 *
 * 使用方式：
 *   bun run scripts/publish-all.ts [--dry-run] [--skip-build] [--skip-test]
 */

import { exec, spawn } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const PACKAGES_DIR = join(process.cwd(), 'packages')
const SATELLITES_DIR = join(process.cwd(), 'satellites')
const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_BUILD = process.argv.includes('--skip-build')
const SKIP_TEST = process.argv.includes('--skip-test')

async function spawnAsync(
  command: string,
  args: string[],
  options: any = {}
): Promise<{ code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true, ...options })
    child.on('close', (code) => {
      resolve({ code: code ?? 1 })
    })
    child.on('error', (err) => {
      reject(err)
    })
  })
}

interface PackageInfo {
  name: string
  path: string
  version: string
  private: boolean
}

async function getPackagesInDir(dirPath: string): Promise<PackageInfo[]> {
  const packages: PackageInfo[] = []
  let dirs: string[] = []

  try {
    dirs = await readdir(dirPath)
  } catch (e) {
    return []
  }

  for (const dir of dirs) {
    const pkgPath = join(dirPath, dir, 'package.json')
    try {
      const content = await readFile(pkgPath, 'utf-8')
      const json = JSON.parse(content)

      packages.push({
        name: json.name,
        path: join(dirPath, dir),
        version: json.version,
        private: json.private === true,
      })
    } catch (e: any) {
      // 忽略沒有 package.json 的目錄
    }
  }

  return packages.filter((pkg) => !pkg.private)
}

async function getAllPackages(): Promise<PackageInfo[]> {
  const corePackages = await getPackagesInDir(PACKAGES_DIR)
  const satellitePackages = await getPackagesInDir(SATELLITES_DIR)

  return [...corePackages, ...satellitePackages]
}

async function checkNpmAuth(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('npm whoami')
    const username = stdout.trim()
    console.log(`✅ 已登入 NPM 為: ${username}`)
    return true
  } catch {
    console.error('❌ 未登入 NPM，請先執行: npm login')
    return false
  }
}

async function checkNpmRegistry(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('npm config get registry')
    const registry = stdout.trim()
    if (registry !== 'https://registry.npmjs.org/') {
      console.warn(`⚠️  當前 registry 為: ${registry}`)
      console.warn('   建議使用: npm config set registry https://registry.npmjs.org/')
      return false
    }
    return true
  } catch {
    return false
  }
}

async function buildPackage(pkg: PackageInfo): Promise<boolean> {
  // 檢查 package.json 是否有 build 腳本
  try {
    const pkgJsonPath = join(pkg.path, 'package.json')
    const content = await readFile(pkgJsonPath, 'utf-8')
    const json = JSON.parse(content)

    if (!json.scripts || !json.scripts.build) {
      console.log(`\n📦 ${pkg.name} 沒有 build 腳本，跳過構建`)
      return true
    }
  } catch {
    // 如果讀取失敗，繼續嘗試構建
  }

  console.log(`\n📦 構建 ${pkg.name}...`)
  try {
    await execAsync('bun run build', { cwd: pkg.path })
    console.log(`  ✅ ${pkg.name} 構建成功`)
    return true
  } catch (e: any) {
    console.error(`  ❌ ${pkg.name} 構建失敗:`, e.message)
    return false
  }
}

async function testPackage(pkg: PackageInfo): Promise<boolean> {
  // 檢查 package.json 是否有 test 腳本
  try {
    const pkgJsonPath = join(pkg.path, 'package.json')
    const content = await readFile(pkgJsonPath, 'utf-8')
    const json = JSON.parse(content)

    if (!json.scripts || !json.scripts.test) {
      console.log(`\n🧪 ${pkg.name} 沒有 test 腳本，跳過測試`)
      return true
    }
  } catch {
    // 如果讀取失敗，繼續嘗試測試
  }

  console.log(`\n🧪 測試 ${pkg.name}...`)
  try {
    await execAsync('bun run test', { cwd: pkg.path })
    console.log(`  ✅ ${pkg.name} 測試通過`)
    return true
  } catch (e: any) {
    console.error(`  ❌ ${pkg.name} 測試失敗:`, e.message)
    return false
  }
}

async function checkPackageExists(pkg: PackageInfo): Promise<boolean> {
  try {
    // 檢查特定版本是否存在
    const { stdout } = await execAsync(
      `npm view ${pkg.name}@${pkg.version} version 2>/dev/null || echo ""`
    )
    const publishedVersion = stdout.trim()
    if (publishedVersion === pkg.version) {
      console.log(`  ⏭️  ${pkg.name}@${pkg.version} 已存在於 NPM，跳過發布`)
      return true
    }
    return false
  } catch {
    // 套件或版本不存在，可以發布
    return false
  }
}

async function verifyNpmAuth(): Promise<boolean> {
  console.log('\n🔐 檢查 NPM 認證狀態...')

  try {
    // 檢查是否已登入
    const { stdout } = await execAsync('npm whoami')
    const username = stdout.trim()
    console.log(`✅ 已登入為: ${username}`)

    console.log('\n🌐 準備進行瀏覽器驗證...')
    console.log('   注意：發布第一個套件時，NPM 會自動打開瀏覽器進行驗證')
    console.log('   請在瀏覽器中完成驗證（指紋、Face ID 等）')
    console.log('   驗證成功後，後續套件會自動發布\n')

    return true
  } catch (e: any) {
    console.error('❌ 未登入 NPM，請先執行: npm login')
    return false
  }
}

async function publishPackage(pkg: PackageInfo): Promise<boolean> {
  const isBeta = pkg.version.includes('beta')
  const isAlpha = pkg.version.includes('alpha')
  const versionTag = isBeta ? 'beta' : isAlpha ? 'alpha' : 'latest'

  console.log(
    `\n🚀 發布 ${pkg.name}@${pkg.version}${isBeta || isAlpha ? ` (tag: ${versionTag})` : ''}...`
  )

  // 檢查是否已存在
  const exists = await checkPackageExists(pkg)
  if (exists) {
    return true // 已存在，視為成功
  }

  if (DRY_RUN) {
    console.log(
      `  🔍 [DRY RUN] 將發布 ${pkg.name}@${pkg.version}${isBeta || isAlpha ? ` (tag: ${versionTag})` : ''}`
    )
    return true
  }

  try {
    // 對於 alpha/beta 版本，使用對應的 tag
    const args = ['publish', '--access', 'public']
    if (isBeta || isAlpha) {
      args.push('--tag', versionTag)
    }

    // 增加支援瀏覽器驗證的提示
    console.log(`  💡 提示: 如果 NPM 要求驗證，請依照終端器指示操作（若有提示則會開啟瀏覽器驗證）`)

    // 使用 spawn 以支援互動模式
    const { code } = await spawnAsync('npm', args, { cwd: pkg.path })

    if (code === 0) {
      console.log(`  ✅ ${pkg.name}@${pkg.version} 發布成功`)
      return true
    } else {
      // 如果發布失敗，做最後一次確認是否是因為版本已存在（處理 npm view 的延遲或快取問題）
      const doubleCheck = await checkPackageExists(pkg)
      if (doubleCheck) {
        console.log(
          `  ⚠️  ${pkg.name}@${pkg.version} 發布失敗，但檢測到版本已存在，視為成功（跳過）。`
        )
        return true
      }

      console.error(`  ❌ ${pkg.name}@${pkg.version} 發布失敗 (碼: ${code})`)
      return false
    }
  } catch (e: any) {
    console.error(`  ❌ ${pkg.name} 發布過程發生意外錯誤:`, e.message)
    return false
  }
}

async function main() {
  console.log('🚀 Gravito 套件批次發布工具\n')

  // 檢查 NPM 登入狀態
  if (!DRY_RUN && !(await checkNpmAuth())) {
    process.exit(1)
  }

  // 檢查 registry
  await checkNpmRegistry()

  // 獲取所有需要發布的套件
  const packages = await getAllPackages()
  console.log(`\n📋 找到 ${packages.length} 個套件:`)
  packages.forEach((pkg) => {
    console.log(`  - ${pkg.name}@${pkg.version}`)
  })

  // 檢查哪些套件已存在
  console.log('\n🔍 檢查已發布的版本...')
  const packagesToPublish: PackageInfo[] = []
  const packagesSkipped: PackageInfo[] = []

  for (const pkg of packages) {
    const exists = await checkPackageExists(pkg)
    if (exists) {
      packagesSkipped.push(pkg)
    } else {
      packagesToPublish.push(pkg)
    }
  }

  console.log(`\n📊 發布計劃:`)
  console.log(`  ✅ 已存在（跳過）: ${packagesSkipped.length} 個`)
  console.log(`  🚀 需要發布: ${packagesToPublish.length} 個`)

  if (packagesToPublish.length === 0) {
    console.log('\n✨ 所有套件都已發布，無需操作！')
    return
  }

  if (DRY_RUN) {
    console.log('\n🔍 [DRY RUN 模式] 不會實際發布')
  }

  // 驗證認證（準備瀏覽器驗證）
  if (!DRY_RUN) {
    console.log('\n⚠️  即將發布套件到 NPM')
    const authVerified = await verifyNpmAuth()
    if (!authVerified) {
      console.error('\n❌ 認證檢查失敗，請重新登入後再試')
      process.exit(1)
    }

    console.log('⏳ 等待 3 秒後開始發布...')
    console.log('   第一個套件發布時會觸發瀏覽器驗證\n')
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  const results: Array<{ pkg: PackageInfo; success: boolean; skipped?: boolean }> = []

  // 先記錄跳過的套件
  packagesSkipped.forEach((pkg) => {
    results.push({ pkg, success: true, skipped: true })
  })

  // 處理需要發布的套件
  for (const pkg of packagesToPublish) {
    let success = true

    // 構建
    if (!SKIP_BUILD) {
      success = await buildPackage(pkg)
      if (!success) {
        results.push({ pkg, success: false })
        continue
      }
    }

    // 測試
    if (!SKIP_TEST) {
      success = await testPackage(pkg)
      if (!success) {
        results.push({ pkg, success: false })
        continue
      }
    }

    // 發布
    success = await publishPackage(pkg)
    results.push({ pkg, success })

    // 發布間隔，避免過於頻繁
    if (success && !DRY_RUN) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  // 總結
  console.log('\n\n📊 發布結果總結:')
  const successful = results.filter((r) => r.success && !r.skipped)
  const skipped = results.filter((r) => r.skipped)
  const failed = results.filter((r) => !r.success)

  if (skipped.length > 0) {
    console.log(`  ⏭️  已存在（跳過）: ${skipped.length}`)
    skipped.forEach((r) => {
      console.log(`     - ${r.pkg.name}@${r.pkg.version}`)
    })
  }

  console.log(`  ✅ 成功發布: ${successful.length}`)
  successful.forEach((r) => {
    console.log(`     - ${r.pkg.name}@${r.pkg.version}`)
  })

  if (failed.length > 0) {
    console.log(`  ❌ 失敗: ${failed.length}`)
    failed.forEach((r) => {
      console.log(`     - ${r.pkg.name}@${r.pkg.version}`)
    })
    console.log('\n💡 提示: 失敗的套件可能是認證問題，請手動發布或重新執行腳本')
    process.exit(1)
  }

  console.log('\n✨ 所有套件處理完成！')
}

main().catch((error) => {
  console.error('❌ 發生錯誤:', error)
  process.exit(1)
})
