import fs from 'node:fs/promises'
import path from 'node:path'
import { confirm, isCancel } from '@clack/prompts'
import { Painter as pc } from '@gravito/chromatic'

/**
 * 初始化自定義 stubs 目錄
 *
 * 將預設 stubs 複製到專案根目錄，允許使用者自定義模板
 */
export async function stubsInit() {
  const cwd = process.cwd()
  const targetDir = path.join(cwd, 'stubs')

  // 尋找 CLI stubs 來源目錄
  const sourceDir = await findStubsSource()

  if (!sourceDir) {
    console.log(pc.red('❌ 無法找到預設 stubs 目錄'))
    console.log(pc.gray('   請確認 CLI 安裝正確'))
    return
  }

  // 檢查目標目錄是否已存在
  try {
    await fs.access(targetDir)
    console.log(pc.yellow('⚠️  stubs/ 目錄已存在'))

    const shouldOverwrite = await confirm({
      message: '是否覆蓋現有的 stubs?',
      initialValue: false,
    })

    if (isCancel(shouldOverwrite) || !shouldOverwrite) {
      console.log(pc.gray('操作已取消'))
      return
    }
  } catch {
    // 目錄不存在，繼續
  }

  // 複製 stubs
  try {
    await fs.cp(sourceDir, targetDir, { recursive: true })

    console.log(pc.green('✅ Stubs 初始化成功'))
    console.log(pc.gray(`\n  目錄: ${targetDir}`))
    console.log(pc.gray('  您現在可以自定義 stub 模板'))
    console.log('')
    console.log(pc.bold('可用的 stubs:'))

    const files = await fs.readdir(targetDir)
    files.forEach((file) => {
      console.log(pc.gray(`  - ${file}`))
    })

    console.log('')
    console.log(pc.cyan('💡 提示:'))
    console.log(pc.gray('  - 修改 stubs 後，執行 gravito make:* 命令會使用您的自定義模板'))
    console.log(pc.gray('  - 刪除 stubs/ 目錄可恢復使用 CLI 預設模板'))
  } catch (err) {
    console.log(pc.red('❌ 複製 stubs 失敗'))
    console.error(err)
  }
}

/**
 * 尋找 CLI stubs 來源目錄
 */
async function findStubsSource(): Promise<string | null> {
  const possiblePaths = [
    // 開發模式 (monorepo)
    path.resolve(__dirname, '../../stubs'),
    // 生產模式 (全域安裝)
    path.resolve(__dirname, '../stubs'),
    // Monorepo 模式
    path.resolve(__dirname, '../../../cli/stubs'),
  ]

  for (const stubPath of possiblePaths) {
    try {
      await fs.access(stubPath)
      return stubPath
    } catch {}
  }

  return null
}
