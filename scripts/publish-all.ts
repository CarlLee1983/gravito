#!/usr/bin/env bun

/**
 * 發布所有套件到 NPM
 *
 * 使用方式：
 *   bun run scripts/publish-all.ts [--dry-run] [--skip-build] [--skip-test]
 *
 * 改造說明（Bun Shell 版本）：
 *   原版使用 node:child_process 的 exec/spawn + promisify 手動封裝，
 *   改造後統一使用 Bun Shell ($`...`) 原生模板字面量，帶來以下改進：
 *
 *   1. 自動參數轉義：$`cmd ${arg}` 中的變數會自動做 Shell 轉義，
 *      防止注入攻擊（原版 execAsync 直接拼接字串，存在注入風險）
 *   2. 消除 promisify 樣板：不再需要 execAsync、spawnAsync 等封裝函式
 *   3. 型別安全：ShellOutput 有完整型別，stdout/stderr/exitCode 直接可用
 *   4. cwd 支援：$.cwd() 或 $({ cwd })`` 原生設定工作目錄
 *   5. 輸出繼承：使用 .quiet() 控制，不需要傳遞 stdio 選項
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { $ } from 'bun'

const PACKAGES_DIR = join(process.cwd(), 'packages')
const SATELLITES_DIR = join(process.cwd(), 'satellites')
const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_BUILD = process.argv.includes('--skip-build')
const SKIP_TEST = process.argv.includes('--skip-test')

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
  } catch (_e) {
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
    } catch (_e: any) {
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
  // 改造說明：
  // 原版：const { stdout } = await execAsync('npm whoami')
  // Bun Shell：$`npm whoami`.text() 直接取得輸出字串，更簡潔
  try {
    // 使用 Bun Shell 自動轉義，防止 Shell 注入
    const username = await $`npm whoami`.quiet().text()
    console.log(`✅ 已登入 NPM 為: ${username.trim()}`)
    return true
  } catch {
    console.error('未登入 NPM，請先執行: npm login')
    return false
  }
}

async function checkNpmRegistry(): Promise<boolean> {
  // 改造說明：
  // 原版：execAsync('npm config get registry')
  // Bun Shell 版本使用 .text() 取得純文字輸出，等同 stdout，
  // 且 $`...` 對於空白命令不會產生 shell injection 問題。
  try {
    // 使用 Bun Shell，直接取得結果文字
    const registry = await $`npm config get registry`.quiet().text()
    if (registry.trim() !== 'https://registry.npmjs.org/') {
      console.warn(`⚠️  當前 registry 為: ${registry.trim()}`)
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
      console.log(`\n${pkg.name} 沒有 build 腳本，跳過構建`)
      return true
    }
  } catch {
    // 如果讀取失敗，繼續嘗試構建
  }

  console.log(`\n構建 ${pkg.name}...`)

  // 改造說明：
  // 原版：execAsync('bun run build', { cwd: pkg.path })
  // Bun Shell：$.cwd(pkg.path)`bun run build` 原生支援目錄切換，
  // 不需要傳遞 options 物件。
  // 另：pkg.path 為檔案系統路徑，Bun Shell 自動轉義，不存在注入風險。
  try {
    // 使用 Bun Shell 並以鏈式方法設定工作目錄
    await $`bun run build`.cwd(pkg.path).quiet()
    console.log(`  ✅ ${pkg.name} 構建成功`)
    return true
  } catch (e: any) {
    console.error(`  ${pkg.name} 構建失敗:`, e.message)
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
      console.log(`\n${pkg.name} 沒有 test 腳本，跳過測試`)
      return true
    }
  } catch {
    // 如果讀取失敗，繼續嘗試測試
  }

  console.log(`\n測試 ${pkg.name}...`)

  // 改造說明：
  // 原版：execAsync('bun run test', { cwd: pkg.path })
  // Bun Shell：$.cwd() 鏈式設定，搭配 .quiet() 抑制冗餘輸出
  try {
    // 使用 Bun Shell 並以鏈式方法設定工作目錄
    await $`bun run test`.cwd(pkg.path).quiet()
    console.log(`  ✅ ${pkg.name} 測試通過`)
    return true
  } catch (e: any) {
    console.error(`  ${pkg.name} 測試失敗:`, e.message)
    return false
  }
}

async function checkPackageExists(pkg: PackageInfo): Promise<boolean> {
  // 改造說明：
  // 原版使用字串拼接：`npm view ${pkg.name}@${pkg.version} version 2>/dev/null || echo ""`
  // 這樣的字串拼接若 pkg.name 或 pkg.version 包含 Shell 特殊字元（如空白、引號），
  // 原版有 Shell 注入風險。
  //
  // Bun Shell 版本：$`npm view ${pkg.name}@${pkg.version} version`
  // 所有插值變數均自動轉義，例如含空白的名稱會被包裝為 'foo bar'，
  // 不需要手動加引號。
  // 另：Bun Shell 不支援 2>/dev/null 重定向語法，
  // 改以 .nothrow() 讓非零退出碼不拋出例外，再檢查 exitCode。
  try {
    // 使用 Bun Shell 的自動轉義，插值變數自動防止 Shell 注入
    // .nothrow() 取代 2>/dev/null || echo ""，行為更明確且跨平台相容
    const publishedVersion = await $`npm view ${pkg.name}@${pkg.version} version`
      .quiet()
      .nothrow()
      .text()
    if (publishedVersion.trim() === pkg.version) {
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
  console.log('\n檢查 NPM 認證狀態...')

  // 改造說明：
  // 原版：execAsync('npm whoami')
  // Bun Shell：$`npm whoami`.text() 直接取得字串，不需解構 { stdout }
  try {
    // 使用 Bun Shell 直接取得使用者名稱
    const username = await $`npm whoami`.quiet().text()
    console.log(`✅ 已登入為: ${username.trim()}`)

    console.log('\n準備進行瀏覽器驗證...')
    console.log('   注意：發布第一個套件時，NPM 會自動打開瀏覽器進行驗證')
    console.log('   請在瀏覽器中完成驗證（指紋、Face ID 等）')
    console.log('   驗證成功後，後續套件會自動發布\n')

    return true
  } catch (_e: any) {
    console.error('未登入 NPM，請先執行: npm login')
    return false
  }
}

async function publishPackage(pkg: PackageInfo): Promise<boolean> {
  const isBeta = pkg.version.includes('beta')
  const isAlpha = pkg.version.includes('alpha')
  const versionTag = isBeta ? 'beta' : isAlpha ? 'alpha' : 'latest'

  console.log(
    `\n發布 ${pkg.name}@${pkg.version}${isBeta || isAlpha ? ` (tag: ${versionTag})` : ''}...`
  )

  // 檢查是否已存在
  const exists = await checkPackageExists(pkg)
  if (exists) {
    return true // 已存在，視為成功
  }

  if (DRY_RUN) {
    console.log(
      `  [DRY RUN] 將發布 ${pkg.name}@${pkg.version}${isBeta || isAlpha ? ` (tag: ${versionTag})` : ''}`
    )
    return true
  }

  // 改造說明：
  // 原版使用 spawn + Promise 封裝的 spawnAsync（20 行樣板）來繼承 stdio，
  // 以支援 NPM 互動模式（瀏覽器驗證提示）。
  //
  // Bun Shell 版本：不呼叫 .quiet()，預設就會繼承 stdio，
  // 輸出直接顯示到終端，等同 spawn 的 stdio: 'inherit' 行為。
  //
  // 關於條件參數（--tag beta/alpha）：
  // 原版透過 args 陣列動態組合，Bun Shell 使用 if/else 分支，
  // 每個分支均獨立呼叫 $``，避免條件字串拼接的可讀性問題。
  console.log(`  提示: 如果 NPM 要求驗證，請依照終端器指示操作（若有提示則會開啟瀏覽器驗證）`)

  try {
    // 增加支援瀏覽器驗證的提示
    console.log(`  💡 提示: 如果 NPM 要求驗證，請依照終端器指示操作（若有提示則會開啟瀏覽器驗證）`)

    // 使用 Bun Shell 組合 npm publish 命令並支援互動模式
    // 對於 alpha/beta 版本，使用對應的 tag
    const result =
      isBeta || isAlpha
        ? await $`npm publish --access public --tag ${versionTag}`.cwd(pkg.path).nothrow()
        : await $`npm publish --access public`.cwd(pkg.path).nothrow()

    if (result.exitCode === 0) {
      console.log(`  ✅ ${pkg.name}@${pkg.version} 發布成功`)
      return true
    } else {
      // 如果發布失敗，做最後一次確認是否是因為版本已存在（處理 npm view 的延遲或快取問題）
      const doubleCheck = await checkPackageExists(pkg)
      if (doubleCheck) {
        console.log(`  ${pkg.name}@${pkg.version} 發布失敗，但檢測到版本已存在，視為成功（跳過）。`)
        return true
      }

      console.error(`  ❌ ${pkg.name}@${pkg.version} 發布失敗 (碼: ${result.exitCode})`)
      return false
    }
  } catch (e: any) {
    console.error(`  ${pkg.name} 發布過程發生意外錯誤:`, e.message)
    return false
  }
}

async function main() {
  console.log('Gravito 套件批次發布工具\n')

  // 檢查 NPM 登入狀態
  if (!DRY_RUN && !(await checkNpmAuth())) {
    process.exit(1)
  }

  // 檢查 registry
  await checkNpmRegistry()

  // 獲取所有需要發布的套件
  const packages = await getAllPackages()
  console.log(`\n找到 ${packages.length} 個套件:`)
  packages.forEach((pkg) => {
    console.log(`  - ${pkg.name}@${pkg.version}`)
  })

  // 檢查哪些套件已存在
  console.log('\n檢查已發布的版本...')
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

  console.log(`\n發布計劃:`)
  console.log(`  已存在（跳過）: ${packagesSkipped.length} 個`)
  console.log(`  需要發布: ${packagesToPublish.length} 個`)

  if (packagesToPublish.length === 0) {
    console.log('\n所有套件都已發布，無需操作！')
    return
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN 模式] 不會實際發布')
  }

  // 驗證認證（準備瀏覽器驗證）
  if (!DRY_RUN) {
    console.log('\n即將發布套件到 NPM')
    const authVerified = await verifyNpmAuth()
    if (!authVerified) {
      console.error('\n認證檢查失敗，請重新登入後再試')
      process.exit(1)
    }

    console.log('等待 3 秒後開始發布...')
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
  console.log('\n\n發布結果總結:')
  const successful = results.filter((r) => r.success && !r.skipped)
  const skipped = results.filter((r) => r.skipped)
  const failed = results.filter((r) => !r.success)

  if (skipped.length > 0) {
    console.log(`  已存在（跳過）: ${skipped.length}`)
    skipped.forEach((r) => {
      console.log(`     - ${r.pkg.name}@${r.pkg.version}`)
    })
  }

  console.log(`  成功發布: ${successful.length}`)
  successful.forEach((r) => {
    console.log(`     - ${r.pkg.name}@${r.pkg.version}`)
  })

  if (failed.length > 0) {
    console.log(`  失敗: ${failed.length}`)
    failed.forEach((r) => {
      console.log(`     - ${r.pkg.name}@${r.pkg.version}`)
    })
    console.log('\n提示: 失敗的套件可能是認證問題，請手動發布或重新執行腳本')
    process.exit(1)
  }

  console.log('\n所有套件處理完成！')
}

main().catch((error) => {
  console.error('發生錯誤:', error)
  process.exit(1)
})
