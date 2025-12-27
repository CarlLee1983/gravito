import fs from 'node:fs/promises'
import path from 'node:path'
import { cancel, intro, isCancel, note, outro, select, spinner, text } from '@clack/prompts'
import cac from 'cac'
import { downloadTemplate } from 'giget'
import pc from 'picocolors'

interface ProjectConfig {
  name: string
  template: string
  [key: string]: unknown
}

const cli = cac('gravito')

cli
  .command('schedule:run', 'Run due scheduled tasks')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .action(async (options) => {
    try {
      const entryPath = path.resolve(process.cwd(), options.entry)
      // Dynamic import of the project entry file
      const app = await import(entryPath)

      const core = app.default?.core

      if (!core) {
        console.error(
          pc.red('❌ Could not find Gravito PlanetCore instance in entry file exports.')
        )
        console.error(
          pc.gray('Ensure your src/index.ts exports the result of bootstrap() or core.liftoff()')
        )
        process.exit(1)
      }

      const scheduler = core.services.get('scheduler')
      if (!scheduler) {
        console.error(pc.yellow('⚠️ Orbit Scheduler is not installed in this planet.'))
        process.exit(1)
      }

      await scheduler.run()

      process.exit(0)
    } catch (err) {
      console.error(pc.red('Failed to run scheduler:'), err)
      process.exit(1)
    }
  })

cli
  .command('schedule:work', 'Run scheduler in daemon mode')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .action(async (options) => {
    try {
      const entryPath = path.resolve(process.cwd(), options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('❌ Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const scheduler = core.services.get('scheduler')
      if (!scheduler) {
        console.error(pc.yellow('⚠️ Orbit Scheduler is not installed.'))
        process.exit(1)
      }

      console.log(pc.green('🕐 Scheduler worker started'))

      const run = async () => {
        try {
          await scheduler.run()
        } catch (e) {
          console.error(pc.red('Error running schedule:'), e)
        }
      }

      // Basic loop
      while (true) {
        const now = new Date()
        const seconds = now.getSeconds()
        const delay = (60 - seconds) * 1000

        // Align to next minute
        await new Promise((resolve) => setTimeout(resolve, delay))
        await run()
      }
    } catch (err) {
      console.error(pc.red('Failed to start worker:'), err)
      process.exit(1)
    }
  })

cli
  .command('schedule:list', 'List scheduled tasks')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .action(async (options) => {
    try {
      const entryPath = path.resolve(process.cwd(), options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('❌ Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const scheduler = core.services.get('scheduler')
      if (!scheduler) {
        console.error(pc.yellow('⚠️ Orbit Scheduler is not installed.'))
        process.exit(1)
      }

      const tasks = scheduler.getTasks()

      console.log(pc.bold(`\n📅 Scheduled Tasks (${tasks.length})`))
      console.log(pc.gray('--------------------------------------------------'))

      if (tasks.length === 0) {
        console.log('No tasks scheduled.')
        process.exit(0)
      }

      console.log(
        `${pc.bold('Name'.padEnd(20))} ${pc.bold('Expression'.padEnd(15))} ${pc.bold('Timezone')}`
      )
      console.log(pc.gray('--------------------------------------------------'))

      for (const task of tasks) {
        console.log(
          `${pc.cyan(task.name.padEnd(20))} ${pc.yellow(task.expression.padEnd(15))} ${task.timezone}`
        )
      }
      console.log('')
      process.exit(0)
    } catch (err) {
      console.error(pc.red('Failed to list tasks:'), err)
      process.exit(1)
    }
  })

cli
  .command('create [name]', 'Create a new Gravito project')
  .option('--template <template>', 'Template to use (basic, inertia-react)')
  .action(async (name, options) => {
    console.clear()

    intro(pc.bgBlack(pc.white(' 🌌 Gravito CLI ')))

    const project = await group<ProjectConfig>({
      name: () => {
        if (name) {
          return Promise.resolve(name)
        }
        return text({
          message: 'What is the name of your new universe?',
          placeholder: 'my-galaxy-app',
          defaultValue: 'my-galaxy-app',
          validate: (value) => {
            if (value.length === 0) {
              return 'Name is required!'
            }
            if (/[^a-z0-9-_]/.test(value)) {
              return 'Name should only contain lowercase letters, numbers, dashes, and underscores.'
            }
            return
          },
        })
      },
      template: () => {
        if (options.template) {
          return Promise.resolve(options.template)
        }
        return select({
          message: 'Pick a starting point:',
          options: [
            {
              value: 'basic',
              label: '🚀 Singularity (Light)',
              hint: 'Ultra-fast, flat architecture for sites',
            },
            {
              value: 'inertia-react',
              label: '⚛️ Orbit App (Full-stack)',
              hint: 'Inertia + React for complex apps',
            },
            {
              value: 'static-site',
              label: '🌐 Static Site',
              hint: 'Pre-configured static site for GitHub Pages, Vercel, Netlify',
            },
          ],
        })
      },
    })

    if (isCancel(project.name) || isCancel(project.template)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    // Ask for framework if static-site template is selected
    let framework: string | null = null
    if (project.template === 'static-site') {
      const frameworkResult = await select({
        message: 'Choose your frontend framework:',
        options: [
          {
            value: 'react',
            label: '⚛️ React',
            hint: 'Recommended for most projects',
          },
          {
            value: 'vue',
            label: '🟢 Vue 3',
            hint: 'Composition API with TypeScript',
          },
        ],
      })

      if (isCancel(frameworkResult)) {
        cancel('Operation cancelled.')
        process.exit(0)
      }
      framework = frameworkResult as string
    }

    const s = spinner()
    s.start('Scaffolding your universe...')

    // Logic to handle directory vs package name
    const isCurrentDir = project.name === '.' || project.name === './'
    const targetDir = isCurrentDir ? '.' : project.name
    const packageName = isCurrentDir ? path.basename(process.cwd()) : project.name

    try {
      // Use giget to download from GitHub
      const templateSource = `github:gravito-framework/gravito/templates/${project.template}#main`

      await downloadTemplate(templateSource, {
        dir: targetDir,
        force: true, // Allow overwriting empty dir
      })

      // Handle framework-specific files for static-site template
      if (project.template === 'static-site' && framework) {
        const clientDir = path.join(process.cwd(), targetDir, 'src', 'client')

        if (framework === 'react') {
          // Remove Vue files and keep React files
          try {
            await fs.unlink(path.join(clientDir, 'app.vue.ts'))
            await fs.unlink(path.join(clientDir, 'components', 'StaticLink.vue'))
            await fs.unlink(path.join(clientDir, 'components', 'Layout.vue'))
            await fs.unlink(path.join(clientDir, 'pages', 'Home.vue'))
            await fs.unlink(path.join(clientDir, 'pages', 'About.vue'))
          } catch {
            // Files might not exist, ignore
          }

          // Update package.json to remove Vue dependencies
          const pkgPath = path.join(process.cwd(), targetDir, 'package.json')
          const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
          if (pkg.dependencies) {
            delete pkg.dependencies['@inertiajs/vue3']
            delete pkg.dependencies.vue
          }
          if (pkg.devDependencies) {
            delete pkg.devDependencies['@vitejs/plugin-vue']
          }
          await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))
        } else if (framework === 'vue') {
          // Remove React files and keep Vue files
          try {
            await fs.unlink(path.join(clientDir, 'app.tsx'))
            await fs.unlink(path.join(clientDir, 'components', 'StaticLink.tsx'))
            await fs.unlink(path.join(clientDir, 'components', 'Layout.tsx'))
            await fs.unlink(path.join(clientDir, 'pages', 'Home.tsx'))
            await fs.unlink(path.join(clientDir, 'pages', 'About.tsx'))
          } catch {
            // Files might not exist, ignore
          }

          // Copy app.vue.ts to app.ts (Vue entry point)
          const appVuePath = path.join(clientDir, 'app.vue.ts')
          const appTsPath = path.join(clientDir, 'app.ts')
          try {
            const content = await fs.readFile(appVuePath, 'utf-8')
            await fs.writeFile(appTsPath, content)
            await fs.unlink(appVuePath)
          } catch {
            // File might not exist, ignore
          }

          // Update package.json to remove React dependencies and add Vue
          const pkgPath = path.join(process.cwd(), targetDir, 'package.json')
          const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
          if (pkg.dependencies) {
            delete pkg.dependencies['@inertiajs/react']
            delete pkg.dependencies.react
            delete pkg.dependencies['react-dom']
            if (!pkg.dependencies['@inertiajs/vue3']) {
              pkg.dependencies['@inertiajs/vue3'] = '^1.0.0'
            }
            if (!pkg.dependencies.vue) {
              pkg.dependencies.vue = '^3.4.0'
            }
          }
          if (pkg.devDependencies) {
            delete pkg.devDependencies['@vitejs/plugin-react']
            delete pkg.devDependencies['@types/react']
            delete pkg.devDependencies['@types/react-dom']
            if (!pkg.devDependencies['@vitejs/plugin-vue']) {
              pkg.devDependencies['@vitejs/plugin-vue'] = '^5.0.0'
            }
          }
          await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))

          // Update vite.config.ts for Vue
          const viteConfigPath = path.join(process.cwd(), targetDir, 'vite.config.ts')
          const viteConfig = await fs.readFile(viteConfigPath, 'utf-8')
          const vueViteConfig = viteConfig
            .replace(
              "import react from '@vitejs/plugin-react'",
              "import vue from '@vitejs/plugin-vue'"
            )
            .replace('plugins: [react()]', 'plugins: [vue()]')
            .replace("input: './src/client/app.tsx'", "input: './src/client/app.ts'")
          await fs.writeFile(viteConfigPath, vueViteConfig)
        }
      }

      s.stop('Universe created!')

      // Update package.json
      const pkgPath = path.join(process.cwd(), targetDir, 'package.json')
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))

      // Update project name with a clean NPM-safe name
      pkg.name = packageName.toLowerCase().replace(/[^a-z0-9-_]/g, '-')

      // Replace workspace:* with actual versions
      const versionMap: Record<string, string> = {
        'gravito-core': '^1.0.0-beta.1',
        '@gravito/beam': '^1.0.0-alpha.1',
        '@gravito/prism': '^1.0.0-beta.1',
        '@gravito/stasis': '^1.0.0-beta.1',
        default: '^1.0.0-alpha.1', // Fallback for other orbits still in alpha
      }

      if (pkg.dependencies) {
        for (const dep of Object.keys(pkg.dependencies)) {
          if (pkg.dependencies[dep] === 'workspace:*') {
            pkg.dependencies[dep] = versionMap[dep] || versionMap.default
          }
        }
      }

      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))

      // Create .env file from env.example for static-site template
      if (project.template === 'static-site') {
        const envExamplePath = path.join(process.cwd(), targetDir, 'env.example')
        const envPath = path.join(process.cwd(), targetDir, '.env')
        try {
          const envExample = await fs.readFile(envExamplePath, 'utf-8')
          await fs.writeFile(envPath, envExample)
          console.log(pc.green('✅ Created .env file from env.example'))
        } catch {
          // env.example might not exist, that's okay
        }
      }

      const frameworkNote =
        project.template === 'static-site' && framework
          ? `\nFramework: ${framework === 'react' ? '⚛️ React' : '🟢 Vue 3'}`
          : ''

      note(
        `Project: ${project.name}\nTemplate: ${project.template}${frameworkNote}`,
        'Mission Successful'
      )

      const nextSteps =
        project.template === 'static-site'
          ? `\n  cd ${pc.cyan(project.name)}\n  bun install\n  ${pc.yellow('# Edit .env and configure STATIC_SITE_DOMAINS')}\n  bun run dev`
          : `\n  cd ${pc.cyan(project.name)}\n  bun install\n  bun run dev`

      outro(`You're all set! ${nextSteps}`)
    } catch (err: unknown) {
      s.stop('Mission Failed')
      const message = err instanceof Error ? err.message : String(err)
      console.error(pc.red(message))
      process.exit(1)
    }
  })

async function group<T extends Record<string, unknown>>(
  prompts: Record<string, () => Promise<unknown>>
): Promise<T> {
  const results: Record<string, unknown> = {}

  for (const key of Object.keys(prompts)) {
    const promptFn = prompts[key]
    if (!promptFn) {
      continue
    }
    const result = await promptFn()

    if (isCancel(result)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    results[key] = result
  }

  return results as T
}

import { addSpectrumCommand } from './commands/add'
import { registerInitCommand } from './commands/init'
import { MakeCommand } from './commands/MakeCommand'
import { routeCache, routeClear } from './commands/routeCache'
import { routeList } from './commands/routeList'
import { tinker } from './commands/tinker'

// ... (existing imports)

// --- Init Command (Enterprise Framework) ---
registerInitCommand(cli)

// --- Add-on Commands ---
cli
  .command('add:spectrum', 'Add Spectrum debug dashboard to current project')
  .action(() => addSpectrumCommand())

// --- Make Commands ---
const make = new MakeCommand()

cli
  .command('make:controller <name>', 'Create a new controller')
  .action((name) => make.run('controller', name))

cli.command('make:model <name>', 'Create a new model').action((name) => make.run('model', name))

cli
  .command('make:middleware <name>', 'Create a new middleware')
  .action((name) => make.run('middleware', name))

// --- Tinker ---
cli.command('tinker', 'Interact with your application').action(() => tinker())

// --- Route List ---
cli
  .command('route:list', 'List all registered routes')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .action((options) => routeList(options))

// --- Route Cache ---
cli
  .command('route:cache', 'Cache named routes manifest')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .option('--output <file>', 'Output file (default: bootstrap/cache/routes.json)')
  .action((options) => routeCache(options))

cli
  .command('route:clear', 'Clear cached routes manifest')
  .option('--output <file>', 'Output file (default: bootstrap/cache/routes.json)')
  .action((options) => routeClear(options))

// --- Database Commands ---
import { dbDeploy, dbSeed, makeMigration, migrate, migrateStatus } from './commands/database'

cli
  .command('make:migration <name>', 'Create a new migration file')
  .action((name) => makeMigration(name))

cli
  .command('make:seeder <name>', 'Create a new seeder file')
  .action((name) => make.run('seeder', name))

cli
  .command('migrate', 'Run database migrations')
  .option('--fresh', 'Drop all tables and re-run migrations')
  .action((options) => migrate(options))

cli.command('migrate:status', 'Show migration status').action(() => migrateStatus())

cli
  .command('db:seed', 'Seed the database')
  .option('--class <name>', 'Run a specific seeder class')
  .action((options) => dbSeed(options))

cli
  .command('db:deploy', 'Deploy database (health check + migrations)')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .option('--no-migrations', 'Skip migrations')
  .option('--seeds', 'Run seeds (requires app-provided seed functions)')
  .option('--skip-health-check', 'Skip post-deploy health check')
  .option('--no-validate', 'Skip pre-deploy health check')
  .action((options) => dbDeploy(options))

import { schemaLock, schemaRefresh } from './commands/database'

cli
  .command('db:schema:lock', 'Generate schema lock file by scanning models')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .option('--output <file>', 'Output lock file path (default: .schema-lock.json)')
  .action((options) => schemaLock({ entry: options.entry, lockPath: options.output }))

cli
  .command('db:schema:refresh', 'Refresh schema cache (invalidate all)')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .action((options) => schemaRefresh(options))

// --- Fortify Commands ---
import { type FortifyStack, installFortify } from './commands/fortify'

cli
  .command('fortify:install', 'Install Fortify authentication scaffolding')
  .option('--stack <stack>', 'View stack: html, react, vue (default: html)', { default: 'html' })
  .option('--force', 'Overwrite existing files')
  .action(async (options) => {
    const validStacks = ['html', 'react', 'vue']
    if (!validStacks.includes(options.stack)) {
      console.error(
        pc.red(`Invalid stack: ${options.stack}. Valid options: ${validStacks.join(', ')}`)
      )
      process.exit(1)
    }
    await installFortify({
      stack: options.stack as FortifyStack,
      force: options.force ?? false,
    })
  })

cli.help()

cli.version('1.0.0-beta.4')

try {
  cli.parse()
} catch (error) {
  console.error(error)
  process.exit(1)
}
