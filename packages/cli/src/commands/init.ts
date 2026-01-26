/**
 * Init Command
 *
 * Interactive project initialization with architecture selection.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { cancel, intro, isCancel, note, outro, select, spinner, text } from '@clack/prompts'
import { getRuntimeAdapter } from '@gravito/core'
import { type ArchitectureType, Scaffold } from '@gravito/scaffold'
import pc from 'picocolors'

/**
 * Options for initializing a new Gravito Enterprise project.
 *
 * @public
 */
interface InitOptions {
  /** The name of the project. */
  name?: string
  /** The architecture pattern to use. */
  architecture?: ArchitectureType
  /** The package manager to use. */
  packageManager?: 'bun' | 'npm' | 'yarn' | 'pnpm'
  /** Whether to skip dependency installation. */
  skipInstall?: boolean
  /** Whether to skip git initialization. */
  skipGit?: boolean
}

/**
 * Execute the project initialization command.
 *
 * Provides an interactive flow to name the project, select an architecture,
 * and configure basic settings.
 *
 * @param options - Initialization options.
 * @returns A promise that resolves when the project is initialized.
 * @public
 */
export async function initCommand(options: InitOptions = {}) {
  console.clear()

  intro(pc.bgBlue(pc.white(' 🏗️ Gravito Enterprise Framework ')))

  // Step 1: Project name
  let projectName = options.name
  if (!projectName) {
    const nameResult = await text({
      message: '專案名稱 (Project name)?',
      placeholder: 'my-enterprise-app',
      defaultValue: 'my-enterprise-app',
      validate: (value) => {
        if (value.length === 0) {
          return '專案名稱為必填'
        }
        if (/[^a-z0-9-_]/.test(value)) {
          return '名稱只能包含小寫字母、數字、破折號和底線'
        }
        return
      },
    })

    if (isCancel(nameResult)) {
      cancel('操作已取消')
      process.exit(0)
    }

    projectName = nameResult
  }

  // Step 2: Architecture selection
  let architecture = options.architecture
  if (!architecture) {
    const archResult = await select({
      message: '選擇架構模式 (Select architecture pattern):',
      options: [
        {
          value: 'enterprise-mvc',
          label: '📦 Enterprise MVC',
          hint: 'Laravel 風格的 MVC，包含 Services 和 Repositories',
        },
        {
          value: 'clean',
          label: '🧅 Clean Architecture',
          hint: "Uncle Bob's Clean Architecture，嚴格的依賴規則",
        },
        {
          value: 'ddd',
          label: '🏛️ Domain-Driven Design (DDD)',
          hint: '完整的 DDD 架構，包含 Modules、Bounded Contexts',
        },
        {
          value: 'standalone-engine',
          label: '🚀 Standalone Engine',
          hint: '純淨的高性能引擎，無框架依賴 (Pure High-Performance Engine)',
        },
        {
          value: 'action-domain',
          label: '⚡ Action-Domain-Responder (ADR)',
          hint: 'Web 特化的設計模式，關注 Actions 與 Domain 邏輯的分離',
        },
      ],
    })

    if (isCancel(archResult)) {
      cancel('操作已取消')
      process.exit(0)
    }

    architecture = archResult as ArchitectureType
  }

  // Step 3: Package manager
  let packageManager = options.packageManager
  if (!packageManager) {
    const pmResult = await select({
      message: '選擇套件管理器 (Package manager):',
      options: [
        { value: 'bun', label: '🥟 Bun', hint: '推薦 - 最快速' },
        { value: 'npm', label: '📦 npm', hint: '標準選擇' },
        { value: 'yarn', label: '🧶 yarn', hint: 'Yarn Classic' },
        { value: 'pnpm', label: '📀 pnpm', hint: '高效磁碟使用' },
      ],
    })

    if (isCancel(pmResult)) {
      cancel('操作已取消')
      process.exit(0)
    }

    packageManager = pmResult as 'bun' | 'npm' | 'yarn' | 'pnpm'
  }

  // Step 4: Add-ons (Spectrum)
  const withSpectrum = await select({
    message: '是否安裝 Spectrum Debug Dashboard? (Enable debug dashboard?):',
    options: [
      { value: true, label: '✅ Yes', hint: '強烈推薦 - 即時監控請求與資料庫 (Recommended)' },
      { value: false, label: '❌ No', hint: '保持極簡 (Minimalist)' },
    ],
  })

  if (isCancel(withSpectrum)) {
    cancel('操作已取消')
    process.exit(0)
  }

  // Step 5: Generate project
  const s = spinner()
  s.start('正在建立專案結構...')

  const targetDir = path.resolve(process.cwd(), projectName)

  try {
    // Check if directory exists
    try {
      await fs.access(targetDir)
      // Directory exists - check if empty
      const files = await fs.readdir(targetDir)
      if (files.length > 0) {
        s.stop('目標目錄不為空')
        console.error(pc.red(`❌ 目錄 "${projectName}" 已存在且不為空`))
        process.exit(1)
      }
    } catch {
      // Directory doesn't exist - create it
      await fs.mkdir(targetDir, { recursive: true })
    }

    // Initialize scaffold
    const scaffold = new Scaffold({ verbose: false })

    const result = await scaffold.create({
      name: projectName,
      targetDir,
      architecture,
      packageManager,
      withSpectrum: withSpectrum as boolean,
      installDeps: !options.skipInstall,
      initGit: !options.skipGit,
    })

    if (!result.success) {
      s.stop('建立失敗')
      console.error(pc.red('❌ 專案建立失敗:'))
      result.errors?.forEach((err) => {
        console.error(pc.gray(`  - ${err}`))
      })
      process.exit(1)
    }

    s.stop('專案結構已建立!')

    // Step 5: Initialize git (if not skipped)
    if (!options.skipGit) {
      const gitSpinner = spinner()
      gitSpinner.start('初始化 Git 倉庫...')

      try {
        const runtime = getRuntimeAdapter()
        const proc = runtime.spawn(['git', 'init'], { cwd: targetDir })
        const exitCode = await proc.exited

        if (exitCode === 0) {
          gitSpinner.stop('Git 倉庫已初始化!')
        } else {
          gitSpinner.stop('Git 初始化跳過 (可能未安裝 git)')
        }
      } catch {
        gitSpinner.stop('Git 初始化跳過')
      }
    }

    // Step 6: Install dependencies (if not skipped)
    if (!options.skipInstall) {
      const installSpinner = spinner()
      installSpinner.start(`使用 ${packageManager} 安裝依賴...`)

      try {
        const installCmd =
          packageManager === 'npm' ? ['npm', 'install'] : [packageManager, 'install']
        const runtime = getRuntimeAdapter()
        const proc = runtime.spawn(installCmd, { cwd: targetDir })
        const exitCode = await proc.exited

        if (exitCode === 0) {
          installSpinner.stop('依賴安裝完成!')
        } else {
          installSpinner.stop('依賴安裝失敗，請手動執行 install')
        }
      } catch {
        installSpinner.stop('依賴安裝跳過')
      }
    }

    // Display architecture info
    const archLabels: Record<ArchitectureType, string> = {
      'enterprise-mvc': '📦 Enterprise MVC',
      clean: '🧅 Clean Architecture',
      ddd: '🏛️ Domain-Driven Design',
      satellite: '🛰️ Satellite Service',
      'action-domain': '⚡ Action-Domain-Responder',
      'standalone-engine': '🚀 Standalone Engine',
    }

    note(
      `專案名稱: ${pc.cyan(projectName)}
架構模式: ${pc.green(archLabels[architecture])}
套件管理器: ${pc.yellow(packageManager)}
檔案數量: ${pc.gray(result.filesCreated.length.toString())} 個`,
      '✨ 專案建立成功'
    )

    // Next steps
    const steps = [
      `cd ${pc.cyan(projectName)}`,
      options.skipInstall ? `${packageManager} install` : null,
      `${packageManager} run dev`,
    ].filter(Boolean)

    console.log('')
    console.log(pc.bold('📋 下一步:'))
    steps.forEach((step, i) => {
      console.log(pc.gray(`  ${i + 1}. ${step}`))
    })
    console.log('')

    outro(`閱讀 ${pc.underline('ARCHITECTURE.md')} 了解專案結構`)
  } catch (err: unknown) {
    s.stop('建立失敗')
    const message = err instanceof Error ? err.message : String(err)
    console.error(pc.red(`❌ ${message}`))
    process.exit(1)
  }
}

/**
 * Register init command with CLI
 */
export function registerInitCommand(cli: ReturnType<typeof import('cac').default>) {
  cli
    .command('init [name]', '建立新的 Gravito 企業級專案 (Create a new enterprise project)')
    .option('--architecture <type>', '架構模式: enterprise-mvc, clean, ddd')
    .option('--pm <manager>', '套件管理器: bun, npm, yarn, pnpm', { default: 'bun' })
    .option('--skip-install', '跳過依賴安裝')
    .option('--skip-git', '跳過 Git 初始化')
    .action(async (name, options) => {
      await initCommand({
        name,
        architecture: options.architecture as ArchitectureType,
        packageManager: options.pm,
        skipInstall: options.skipInstall,
        skipGit: options.skipGit,
      })
    })
}
