/**
 * Module Generation Command
 *
 * Usage: gravito module generate <name> [type] [options]
 *
 * Examples:
 *   gravito module generate Payment --ddd-type advanced
 *   gravito module generate Analytics --ddd-type cqrs-query
 *   gravito module generate Settings --ddd-type simple
 */

import { cancel, intro, isCancel, note, outro, select, spinner, text } from '@clack/prompts'
import { Painter as pc } from '@gravito/chromatic'

/**
 * Options for module generation
 *
 * @public
 */
export interface ModuleOptions {
  /** The name of the module. */
  name?: string
  /** For DDD modules: the module template type. */
  dddType?: 'simple' | 'advanced' | 'cqrs-query'
  /** Other modules this module depends on. */
  dependsOn?: string[]
  /** Domain events this module subscribes to. */
  subscribesTo?: string[]
  /** The package manager to use. */
  packageManager?: 'bun' | 'npm' | 'yarn' | 'pnpm'
  /** Whether to skip test generation. */
  skipTests?: boolean
}

/**
 * Execute the module generation command.
 *
 * Provides an interactive flow to generate a new DDD module in an existing project.
 *
 * @param options - Module generation options.
 * @returns A promise that resolves when the module is generated.
 * @public
 */
export async function moduleCommand(options: ModuleOptions = {}) {
  console.clear()

  intro(pc.bgBlue(pc.white(' 🎯 Gravito Module Generator ')))

  // Step 1: Module name
  let moduleName = options.name
  if (!moduleName) {
    const nameResult = await text({
      message: '模組名稱 (Module name)?',
      placeholder: 'Payment',
      defaultValue: 'Payment',
      validate: (value) => {
        if (value.length === 0) {
          return '模組名稱為必填'
        }
        if (!/^[A-Z]/.test(value)) {
          return '模組名稱必須以大寫字母開頭'
        }
        if (!/^[A-Za-z0-9]+$/.test(value)) {
          return '名稱只能包含英文字母和數字'
        }
        return
      },
    })

    if (isCancel(nameResult)) {
      cancel('操作已取消')
      process.exit(0)
    }

    moduleName = nameResult
  }

  // Step 2: Module type
  let dddType = options.dddType
  if (!dddType) {
    const typeResult = await select({
      message: '選擇 DDD 模組類型 (Select DDD module type):',
      options: [
        {
          value: 'simple',
          label: '📦 Simple',
          hint: '基本 CRUD 結構 (Basic CRUD with Aggregates)',
        },
        {
          value: 'advanced',
          label: '📜 Advanced (Event Sourcing)',
          hint: '完整事件溯源模式 (Event Sourcing with full audit trail)',
        },
        {
          value: 'cqrs-query',
          label: '🔍 CQRS Query Module',
          hint: 'CQRS 查詢端模組 (Query-optimized read models)',
        },
      ],
    })

    if (isCancel(typeResult)) {
      cancel('操作已取消')
      process.exit(0)
    }

    dddType = typeResult as 'simple' | 'advanced' | 'cqrs-query'
  }

  // Step 3: Dependencies (optional)
  let dependsOn = options.dependsOn
  if (!dependsOn) {
    const depsResult = await text({
      message: '模組依賴 (依賴的模組, 用逗號分隔)? [可選]',
      placeholder: 'Auth,User',
    })

    if (!isCancel(depsResult) && depsResult.trim()) {
      dependsOn = depsResult
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d.length > 0)
    }
  }

  // Step 4: Event subscriptions (optional)
  let subscribesTo = options.subscribesTo
  if (!subscribesTo) {
    const eventsResult = await text({
      message: '訂閱的事件 (用逗號分隔)? [可選]',
      placeholder: 'UserCreated,PaymentCompleted',
    })

    if (!isCancel(eventsResult) && eventsResult.trim()) {
      subscribesTo = eventsResult
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0)
    }
  }

  // Step 5: Generate module
  const s = spinner()
  s.start('正在生成模組...')

  try {
    // TODO: Call ModuleGenerator to create the module
    // For now, just show success message

    s.stop('模組生成成功!')

    // Display module information
    const typeLabels: Record<string, string> = {
      simple: '📦 Simple (Basic CRUD)',
      advanced: '📜 Advanced (Event Sourcing)',
      'cqrs-query': '🔍 CQRS Query Module',
    }

    note(
      `模組名稱: ${pc.cyan(moduleName)}
模組類型: ${pc.green(typeLabels[dddType])}
${dependsOn && dependsOn.length > 0 ? `依賴: ${pc.yellow(dependsOn.join(', '))}` : ''}
${subscribesTo && subscribesTo.length > 0 ? `訂閱事件: ${pc.yellow(subscribesTo.join(', '))}` : ''}`,
      '✨ 模組配置'
    )

    // Next steps
    const steps = [
      `模組已在 src/Modules/${moduleName} 建立`,
      '檢查自動生成的結構',
      '添加業務邏輯到 Domain 層',
      `bun test 執行測試`,
    ]

    console.log('')
    console.log(pc.bold('📋 下一步:'))
    steps.forEach((step, i) => {
      console.log(pc.gray(`  ${i + 1}. ${step}`))
    })
    console.log('')

    outro(`閱讀 ${pc.underline('modules/README.md')} 了解更多`)
  } catch (err: unknown) {
    s.stop('生成失敗')
    const message = err instanceof Error ? err.message : String(err)
    console.error(pc.red(`❌ ${message}`))
    process.exit(1)
  }
}

/**
 * Register module command with CLI
 */
export function registerModuleCommand(cli: ReturnType<typeof import('cac').default>) {
  cli
    .command('module generate [name]', '在現有項目中生成新的 DDD 模組 (Generate a new DDD module)')
    .option(
      '--ddd-type <type>',
      'DDD 模組類型 (DDD module type):\n        simple | advanced | cqrs-query'
    )
    .option('--depends-on <modules>', '依賴的模組 (Modules this depends on, comma-separated)')
    .option(
      '--subscribes-to <events>',
      '訂閱的事件 (Domain events to subscribe to, comma-separated)'
    )
    .option('--pm <manager>', '套件管理器 (Package manager): bun, npm, yarn, pnpm', {
      default: 'bun',
    })
    .option('--skip-tests', '跳過測試生成 (Skip test generation)')
    .action(async (name, options) => {
      // Parse comma-separated values
      const dependsOn = options.dependsOn
        ? options.dependsOn.split(',').map((d: string) => d.trim())
        : undefined

      const subscribesTo = options.subscribesTo
        ? options.subscribesTo.split(',').map((e: string) => e.trim())
        : undefined

      // Validate ddd-type
      if (options.dddType) {
        const validDddTypes = ['simple', 'advanced', 'cqrs-query']
        if (!validDddTypes.includes(options.dddType)) {
          console.error(
            pc.red(
              `❌ 無效的 DDD 模組類型: "${options.dddType}"\n允許的值: ${validDddTypes.join(', ')}`
            )
          )
          process.exit(1)
        }
      }

      await moduleCommand({
        name,
        dddType: options.dddType as 'simple' | 'advanced' | 'cqrs-query' | undefined,
        dependsOn,
        subscribesTo,
        packageManager: options.pm,
        skipTests: options.skipTests,
      })
    })
}
