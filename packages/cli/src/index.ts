/**
 * @fileoverview Gravito CLI - Command Line Tool for the Gravito Ecosystem
 *
 * Provides a set of commands for project initialization, process management,
 * scheduled task execution, and maintenance utilities.
 *
 * Commands:
 * - create: Bootstrap a new Gravito project
 * - schedule:run/work: Task scheduling management
 * - dev: Optimized development workflow
 * - maintenance: System health and diagnostic tools
 */

import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { cancel, intro, isCancel, note, outro, select, spinner, text } from '@clack/prompts'
import {
  DependencyValidator,
  EnvironmentDetector,
  LockGenerator,
  ProfileResolver,
  type ProfileType,
} from '@gravito/scaffold'
import cac from 'cac'
import { downloadTemplate } from 'giget'
import pc from 'picocolors'
import { VersionChecker } from './utils/VersionChecker'
import { VersionRegistry } from './utils/VersionRegistry'

/**
 * Configuration for a new project being created.
 */
interface ProjectConfig {
  /** The name of the project. */
  name: string
  /** The template to use for scaffolding. */
  template: string
  /** Additional dynamic configuration properties. */
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

      const scheduler = core.container.make('scheduler')
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
      const entryPath = validateEntryPath(options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('❌ Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const scheduler = core.container.make('scheduler')
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
      const entryPath = validateEntryPath(options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('❌ Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const scheduler = core.container.make('scheduler')
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
  .option('--profile <profile>', 'Profile preset (core, scale, enterprise)', { default: 'core' })
  .option('--with <features>', 'Feature add-ons (comma-separated, e.g. redis,queue)', {
    default: '',
  })
  .option('--recommend', 'Auto-detect profile based on environment')
  .option('--framework <framework>', 'Frontend framework (react, vue) for static-site template')
  .action(async (name, options) => {
    console.clear()

    intro(pc.bgBlack(pc.white(' 🌌 Gravito CLI ')))

    // -1. Environment Detection
    if (options.recommend) {
      const detector = new EnvironmentDetector()
      const detection = detector.detect()

      if (detection.confidence !== 'low') {
        note(
          `Detected Environment: ${pc.cyan(detection.platform)}\nReason: ${detection.reason}\nConfidence: ${detection.confidence}`,
          'Environment Detection'
        )

        const confirmed = await select({
          message: `Recommended Profile: ${pc.green(detection.suggestedProfile)}. Use this?`,
          options: [
            { value: 'yes', label: `Yes, use ${detection.suggestedProfile}` },
            { value: 'no', label: 'No, let me choose manually' },
          ],
        })

        if (isCancel(confirmed)) {
          cancel('Operation cancelled.')
          process.exit(0)
        }

        if (confirmed === 'yes') {
          options.profile = detection.suggestedProfile
          console.log(pc.green(`✅ Using profile: ${options.profile}`))
        }
      } else {
        console.log(
          pc.yellow('⚠️ No specific environment detected. Proceeding with manual selection.')
        )
      }
    }

    const profileResolver = new ProfileResolver()

    // 0. Validate Inputs
    if (options.profile && !profileResolver.isValidProfile(options.profile)) {
      console.error(pc.red(`❌ Invalid profile: ${options.profile}`))
      console.log(pc.gray(`Available profiles: core, scale, enterprise`))
      process.exit(1)
    }

    const featureList = options.with ? options.with.split(',') : []
    const invalidFeatures = featureList.filter((f: string) => !profileResolver.isValidFeature(f))
    if (invalidFeatures.length > 0) {
      console.error(pc.red(`❌ Invalid features: ${invalidFeatures.join(', ')}`))
      console.log(pc.gray(`Available features: redis, postgres, mysql, s3, queue, monitor...`))
      process.exit(1)
    }

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
      if (options.framework) {
        framework = options.framework
      } else {
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
            {
              value: 'svelte',
              label: '🔶 Svelte',
              hint: 'Lightweight and reactive',
            },
          ],
        })

        if (isCancel(frameworkResult)) {
          cancel('Operation cancelled.')
          process.exit(0)
        }
        framework = frameworkResult as string
      }
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
      // const templateSource = `/Users/carl/Dev/Carl/gravito-core/templates/${project.template}`

      await downloadTemplate(templateSource, {
        dir: targetDir,
        force: true, // Allow overwriting empty dir
      })

      // --- Skill Injection (The Freeze Engine & Friends) ---
      const TEMPLATE_SKILLS: Record<string, string[]> = {
        'static-site': ['static-site-generator'],
        'inertia-react': ['mvc-master', 'ui-ux-pro-max', 'clean-architect'],
        basic: ['fortify-security'],
      }

      const skillsToInject = TEMPLATE_SKILLS[project.template as string] || []
      if (skillsToInject.length > 0) {
        // Try to locate local .skills if running inside monorepo
        // Root .skills is at ../../../.skills relative to packages/cli/src
        const localSkillsRoot = path.resolve(import.meta.dirname, '../../../.skills')
        const hasLocalSkills = await fs
          .access(localSkillsRoot)
          .then(() => true)
          .catch(() => false)

        for (const skill of skillsToInject) {
          const skillDest = path.join(targetDir, '.skills', skill)

          // Determine source and injection method
          let skillSource = `github:gravito-framework/gravito/.skills/${skill}#main`
          let isLocal = false

          if (hasLocalSkills) {
            const localPath = path.join(localSkillsRoot, skill)
            const exists = await fs
              .access(localPath)
              .then(() => true)
              .catch(() => false)
            if (exists) {
              skillSource = localPath
              isLocal = true
            }
          }

          try {
            if (isLocal) {
              await fs.mkdir(path.dirname(skillDest), { recursive: true })
              await fs.cp(skillSource, skillDest, { recursive: true })
            } else {
              await downloadTemplate(skillSource, {
                dir: skillDest,
                force: true,
              })
            }
          } catch (skillErr) {
            console.warn(pc.yellow(`⚠️  Failed to inject skill '${skill}':`), skillErr)
          }
        }
      }
      // ----------------------------------------------------

      // Rename stubs
      const biomeStubPath = path.join(process.cwd(), targetDir, 'biome.json.stub')
      const biomePath = path.join(process.cwd(), targetDir, 'biome.json')
      try {
        await fs.rename(biomeStubPath, biomePath)
      } catch {
        // stub might not exist
      }

      // Handle framework-specific files for static-site template
      if (project.template === 'static-site' && framework) {
        const clientDir = path.join(process.cwd(), targetDir, 'src', 'client')

        if (framework === 'react') {
          // Remove Vue and Svelte files and keep React files
          try {
            await fs.unlink(path.join(clientDir, 'app.vue.ts'))
            await fs.unlink(path.join(clientDir, 'app.svelte.ts'))
            await fs.unlink(path.join(clientDir, 'components', 'StaticLink.vue'))
            await fs.unlink(path.join(clientDir, 'components', 'StaticLink.svelte'))
            await fs.unlink(path.join(clientDir, 'components', 'Layout.vue'))
            await fs.unlink(path.join(clientDir, 'components', 'Layout.svelte'))
            await fs.unlink(path.join(clientDir, 'pages', 'Home.vue'))
            await fs.unlink(path.join(clientDir, 'pages', 'Home.svelte'))
            await fs.unlink(path.join(clientDir, 'pages', 'About.vue'))
            await fs.unlink(path.join(clientDir, 'pages', 'About.svelte'))
          } catch {
            // Files might not exist, ignore
          }

          // Remove Svelte-specific files
          try {
            await fs.unlink(path.join(process.cwd(), targetDir, 'vitest.config.ts'))
            await fs.unlink(path.join(process.cwd(), targetDir, 'svelte.config.js'))
            const testsDir = path.join(clientDir, 'components', '__tests__')
            const files = await fs.readdir(testsDir)
            for (const file of files) {
              await fs.unlink(path.join(testsDir, file))
            }
            await fs.rmdir(testsDir)
          } catch {
            // Files might not exist, ignore
          }

          // Update package.json to remove Vue/Svelte dependencies
          const pkgPath = path.join(process.cwd(), targetDir, 'package.json')
          const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
          if (pkg.dependencies) {
            delete pkg.dependencies['@inertiajs/vue3']
            delete pkg.dependencies['@inertiajs/svelte']
            delete pkg.dependencies.vue
            delete pkg.dependencies.svelte
          }
          if (pkg.devDependencies) {
            delete pkg.devDependencies['@vitejs/plugin-vue']
            delete pkg.devDependencies['@sveltejs/vite-plugin-svelte']
            delete pkg.devDependencies['svelte-check']
            delete pkg.devDependencies.vitest
            delete pkg.devDependencies['@vitest/ui']
            delete pkg.devDependencies['@testing-library/svelte']
            delete pkg.devDependencies['@testing-library/jest-dom']
            delete pkg.devDependencies.jsdom
          }
          if (pkg.scripts) {
            delete pkg.scripts.test
            delete pkg.scripts['test:ui']
          }
          await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))
        } else if (framework === 'vue') {
          // Remove React and Svelte files and keep Vue files
          try {
            await fs.unlink(path.join(clientDir, 'app.tsx'))
            await fs.unlink(path.join(clientDir, 'app.svelte.ts'))
            await fs.unlink(path.join(clientDir, 'components', 'StaticLink.tsx'))
            await fs.unlink(path.join(clientDir, 'components', 'StaticLink.svelte'))
            await fs.unlink(path.join(clientDir, 'components', 'Layout.tsx'))
            await fs.unlink(path.join(clientDir, 'components', 'Layout.svelte'))
            await fs.unlink(path.join(clientDir, 'pages', 'Home.tsx'))
            await fs.unlink(path.join(clientDir, 'pages', 'Home.svelte'))
            await fs.unlink(path.join(clientDir, 'pages', 'About.tsx'))
            await fs.unlink(path.join(clientDir, 'pages', 'About.svelte'))
          } catch {
            // Files might not exist, ignore
          }

          // Remove Svelte-specific files
          try {
            await fs.unlink(path.join(process.cwd(), targetDir, 'vitest.config.ts'))
            await fs.unlink(path.join(process.cwd(), targetDir, 'svelte.config.js'))
            const testsDir = path.join(clientDir, 'components', '__tests__')
            const files = await fs.readdir(testsDir)
            for (const file of files) {
              await fs.unlink(path.join(testsDir, file))
            }
            await fs.rmdir(testsDir)
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

          // Update package.json to remove React/Svelte dependencies and add Vue
          const pkgPath = path.join(process.cwd(), targetDir, 'package.json')
          const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
          if (pkg.dependencies) {
            delete pkg.dependencies['@inertiajs/react']
            delete pkg.dependencies['@inertiajs/svelte']
            delete pkg.dependencies.react
            delete pkg.dependencies['react-dom']
            delete pkg.dependencies.svelte
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
            delete pkg.devDependencies['@sveltejs/vite-plugin-svelte']
            delete pkg.devDependencies['svelte-check']
            delete pkg.devDependencies.vitest
            delete pkg.devDependencies['@vitest/ui']
            delete pkg.devDependencies['@testing-library/svelte']
            delete pkg.devDependencies['@testing-library/jest-dom']
            delete pkg.devDependencies.jsdom
            if (!pkg.devDependencies['@vitejs/plugin-vue']) {
              pkg.devDependencies['@vitejs/plugin-vue'] = '^5.0.0'
            }
          }
          if (pkg.scripts) {
            delete pkg.scripts.test
            delete pkg.scripts['test:ui']
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
        } else if (framework === 'svelte') {
          // Remove React and Vue files, keep only Svelte files
          try {
            await fs.unlink(path.join(clientDir, 'app.tsx'))
            await fs.unlink(path.join(clientDir, 'app.vue.ts'))
            await fs.unlink(path.join(clientDir, 'components', 'StaticLink.tsx'))
            await fs.unlink(path.join(clientDir, 'components', 'StaticLink.vue'))
            await fs.unlink(path.join(clientDir, 'components', 'Layout.tsx'))
            await fs.unlink(path.join(clientDir, 'components', 'Layout.vue'))
            await fs.unlink(path.join(clientDir, 'pages', 'Home.tsx'))
            await fs.unlink(path.join(clientDir, 'pages', 'Home.vue'))
            await fs.unlink(path.join(clientDir, 'pages', 'About.tsx'))
            await fs.unlink(path.join(clientDir, 'pages', 'About.vue'))
          } catch {
            // Files might not exist, ignore
          }

          // Rename app.svelte.ts to app.ts (Svelte entry point)
          const appSveltePath = path.join(clientDir, 'app.svelte.ts')
          const appTsPath = path.join(clientDir, 'app.ts')
          try {
            const content = await fs.readFile(appSveltePath, 'utf-8')
            await fs.writeFile(appTsPath, content)
            await fs.unlink(appSveltePath)
          } catch {
            // File might not exist, ignore
          }

          // Update package.json to remove React/Vue and add Svelte
          const pkgPath = path.join(process.cwd(), targetDir, 'package.json')
          const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
          if (pkg.dependencies) {
            delete pkg.dependencies['@inertiajs/react']
            delete pkg.dependencies['@inertiajs/vue3']
            delete pkg.dependencies.react
            delete pkg.dependencies['react-dom']
            delete pkg.dependencies.vue
            if (!pkg.dependencies['@inertiajs/svelte']) {
              pkg.dependencies['@inertiajs/svelte'] = '^1.0.0'
            }
            if (!pkg.dependencies.svelte) {
              pkg.dependencies.svelte = '^5.0.0'
            }
          }
          if (pkg.devDependencies) {
            delete pkg.devDependencies['@vitejs/plugin-react']
            delete pkg.devDependencies['@vitejs/plugin-vue']
            delete pkg.devDependencies['@types/react']
            delete pkg.devDependencies['@types/react-dom']
            if (!pkg.devDependencies['@sveltejs/vite-plugin-svelte']) {
              pkg.devDependencies['@sveltejs/vite-plugin-svelte'] = '^6.0.0'
            }
            if (!pkg.devDependencies['svelte-check']) {
              pkg.devDependencies['svelte-check'] = '^3.6.0'
            }
            if (!pkg.devDependencies.vitest) {
              pkg.devDependencies.vitest = '^3.0.0'
            }
            if (!pkg.devDependencies['@vitest/ui']) {
              pkg.devDependencies['@vitest/ui'] = '^3.0.0'
            }
            if (!pkg.devDependencies['@testing-library/svelte']) {
              pkg.devDependencies['@testing-library/svelte'] = '^5.3.0'
            }
            if (!pkg.devDependencies['@testing-library/jest-dom']) {
              pkg.devDependencies['@testing-library/jest-dom'] = '^6.6.3'
            }
            if (!pkg.devDependencies.jsdom) {
              pkg.devDependencies.jsdom = '^25.0.0'
            }
          }
          if (pkg.scripts?.typecheck) {
            pkg.scripts.typecheck = 'svelte-check --tsconfig ./tsconfig.json'
          }
          if (pkg.scripts && !pkg.scripts.test) {
            pkg.scripts.test = 'vitest'
            pkg.scripts['test:ui'] = 'vitest --ui'
          }
          await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))

          // Update vite.config.ts for Svelte
          const viteConfigPath = path.join(process.cwd(), targetDir, 'vite.config.ts')
          const viteConfig = await fs.readFile(viteConfigPath, 'utf-8')
          const svelteViteConfig = viteConfig
            .replace(
              "import react from '@vitejs/plugin-react'",
              "import { svelte } from '@sveltejs/vite-plugin-svelte'"
            )
            .replace('plugins: [react()]', 'plugins: [svelte()]')
            .replace("input: './src/client/app.tsx'", "input: './src/client/app.ts'")
          await fs.writeFile(viteConfigPath, svelteViteConfig)
        }
      }

      s.stop('Universe created!')

      // Update package.json
      const pkgPath = path.join(process.cwd(), targetDir, 'package.json')
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))

      // Update project name with a clean NPM-safe name
      pkg.name = packageName.toLowerCase().replace(/[^a-z0-9-_]/g, '-')

      // === 動態版本解析 (替換 workspace:*) ===
      s.start('載入 package 版本資訊...')
      const versionRegistry = new VersionRegistry()
      await versionRegistry.initialize()
      s.stop('版本資訊已載入')

      if (pkg.dependencies) {
        for (const dep of Object.keys(pkg.dependencies)) {
          if (pkg.dependencies[dep] === 'workspace:*') {
            const version = versionRegistry.get(dep)
            // Force lock: remove ^ or ~ prefix for @gravito/* packages
            pkg.dependencies[dep] =
              version.startsWith('^') || version.startsWith('~') ? version.slice(1) : version
          }
        }
      }

      if (pkg.devDependencies) {
        for (const dep of Object.keys(pkg.devDependencies)) {
          if (pkg.devDependencies[dep] === 'workspace:*') {
            const version = versionRegistry.get(dep)
            // Force lock: remove ^ or ~ prefix for @gravito/* packages
            pkg.devDependencies[dep] =
              version.startsWith('^') || version.startsWith('~') ? version.slice(1) : version
          }
        }
      }

      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))

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

      // Generate gravito.lock.json & Validate Dependencies
      try {
        const features = options.with ? options.with.split(',') : []
        const profileConfig = profileResolver.resolve(options.profile as ProfileType, features)

        const lockGenerator = new LockGenerator()
        const lockContent = lockGenerator.generate(
          options.profile as ProfileType,
          profileConfig,
          project.template as string,
          pkg.version || '1.0.0'
        )

        const lockPath = path.join(process.cwd(), targetDir, 'gravito.lock.json')
        await fs.writeFile(lockPath, lockContent)
        console.log(pc.green('✅ Generated gravito.lock.json'))

        // === 依賴驗證 ===
        const validator = new DependencyValidator()
        const validationResult = validator.validate(profileConfig, pkg)

        if (!validationResult.valid) {
          console.log('')
          console.log(pc.red('❌ 依賴驗證失敗:'))
          validationResult.errors.forEach((err) => {
            console.log(pc.red(`  - ${err}`))
          })

          const installCmd = DependencyValidator.suggestInstallCommand(validationResult)
          if (installCmd) {
            console.log('')
            console.log(pc.yellow('💡 建議執行:'))
            console.log(pc.cyan(`  ${installCmd}`))
          }

          console.log('')
        }

        if (validationResult.warnings.length > 0) {
          console.log('')
          console.log(pc.yellow('⚠️  警告:'))
          validationResult.warnings.forEach((warn) => {
            console.log(pc.yellow(`  - ${warn}`))
          })
          console.log('')
        }
      } catch (err) {
        console.warn(pc.yellow('⚠️ Failed to generate lock file'), err)
      }

      const frameworkNote =
        project.template === 'static-site' && framework
          ? `\nFramework: ${framework === 'react' ? '⚛️ React' : framework === 'vue' ? '🟢 Vue 3' : '🔶 Svelte'}`
          : ''

      const profileNote = `\nProfile: ${options.profile}`
      const featuresNote = options.with ? `\nFeatures: ${options.with}` : ''

      note(
        `Project: ${project.name}\nTemplate: ${project.template}${frameworkNote}${profileNote}${featuresNote}`,
        'Mission Successful'
      )

      const nextSteps =
        project.template === 'static-site'
          ? `\n  cd ${pc.cyan(targetDir)}\n  bun install\n  ${pc.yellow('# Edit .env and configure STATIC_SITE_DOMAINS')}\n  bun run dev\n\n  ${pc.gray('Available commands:')}\n  bun run lint       ${pc.gray('// Check code style')}\n  bun run typecheck  ${pc.gray('// Check types')}`
          : `\n  cd ${pc.cyan(targetDir)}\n  bun install\n  bun run dev\n\n  ${pc.gray('Available commands:')}\n  bun run lint       ${pc.gray('// Check code style')}\n  bun run typecheck  ${pc.gray('// Check types')}`

      outro(`You're all set! ${nextSteps}`)
    } catch (err: unknown) {
      s.stop('Mission Failed')
      const message = err instanceof Error ? err.message : String(err)
      console.error(pc.red(message))
      process.exit(1)
    }
  })

/**
 * Execute a group of interactive prompts and return the results as a structured object.
 *
 * @param prompts - A record of prompt functions to execute.
 * @returns A promise that resolves with the results of the prompts.
 */
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
import { doctor } from './commands/doctor'
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

// --- Stub Commands ---
import { stubsInit } from './commands/stubsInit'

cli.command('stub:init', 'Initialize custom stub templates').action(() => stubsInit())

// --- Make Commands ---
const make = new MakeCommand()

cli
  .command('make:controller [name]', 'Create a new controller')
  .option('--resource', 'Generate a resource controller')
  .action((name, options) => make.run('controller', name, options))

cli
  .command('make:model [name]', 'Create a new model')
  .option('-m, --migration', 'Create a new migration file for the model')
  .option('-c, --controller', 'Create a new controller for the model')
  .option('-r, --request', 'Create a new form request for the model')
  .option('-g, --graphql', 'Create a model configured for GraphQL automation')
  .option('-a, --all', 'Create a migration, controller, and form request for the model')
  .action(async (name, options) => {
    // 1. Make the model (capturing the actual name if prompted)
    const actualName = (await make.run('model', name, options)) as string

    // 2. Handle linked generation
    if (options.all || options.migration) {
      await makeMigration(`create_${actualName.toLowerCase()}s_table`)
    }

    if (options.all || options.controller) {
      await make.run('controller', actualName, { resource: true })
    }

    if (options.all || options.request) {
      await make.run('request', `${actualName}Store`)
    }
  })

cli
  .command('make:middleware [name]', 'Create a new middleware')
  .action((name) => make.run('middleware', name))

cli
  .command('make:request [name]', 'Create a new form request class')
  .action((name) => make.run('request', name))

cli
  .command('make:command [name]', 'Create a new custom CLI command')
  .option('--command <command>', 'The signature of the command (e.g. app:greet)')
  .action((name, options) => make.run('command', name, options))

cli
  .command('make:satellite [name]', 'Create a new Gravito Satellite (Plugin)')
  .option('--internal', 'Create as an internal official satellite in satellites/ directory')
  .action((name, options) => make.run('satellite', name, options))

// --- Tinker ---
cli.command('tinker', 'Interact with your application').action(() => tinker())

// --- Doctor/Health ---
cli
  .command('doctor', 'Run Gravito health checks and diagnostics')
  .option('--fix', 'Attempt to automatically repair detected issues')
  .action((options) => doctor({ fix: Boolean(options.fix) }))

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
  .command('make:migration [name]', 'Create a new migration file')
  .action((name) => makeMigration(name))

cli
  .command('make:seeder [name]', 'Create a new seeder file')
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

// --- Event DLQ Commands ---
import { EventDLQCommand } from './commands/EventDLQCommand'

/**
 * 驗證進入點檔案路徑安全性
 * 確保路徑在專案目錄內，防止路徑遍歷攻擊
 *
 * @param entryFile - 進入點檔案相對路徑
 * @throws Error 如果路徑無效或試圖逃脫專案目錄
 * @returns 驗證後的絕對路徑
 */
function validateEntryPath(entryFile: string): string {
  const projectRoot = process.cwd()
  const resolved = path.resolve(projectRoot, entryFile)

  // 確保路徑在專案目錄內
  if (!resolved.startsWith(projectRoot)) {
    throw new Error(`Entry file must be within the project directory. Attempted path: ${resolved}`)
  }

  // 驗證檔案存在
  if (!existsSync(resolved)) {
    throw new Error(`Entry file not found: ${resolved}`)
  }

  // 驗證檔案副檔名
  const ext = path.extname(resolved)
  if (!['.ts', '.js', '.mts', '.mjs'].includes(ext)) {
    throw new Error(`Invalid entry file type: ${ext}. Supported types: .ts, .js, .mts, .mjs`)
  }

  return resolved
}

cli
  .command('event:dlq:list', 'List Dead Letter Queue entries')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .option('--event <name>', 'Filter by event name')
  .option('--status <status>', 'Filter by status (pending, requeued, resolved, abandoned)')
  .option('--from <date>', 'Filter by start date (ISO format)')
  .option('--to <date>', 'Filter by end date (ISO format)')
  .option('--limit <n>', 'Limit results (default: 100)')
  .option('--offset <n>', 'Offset for pagination')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const entryPath = validateEntryPath(options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const dlqManager = core.container.make('dlqManager')
      if (!dlqManager) {
        console.error(pc.yellow('DeadLetterQueueManager is not available.'))
        process.exit(1)
      }

      const cmd = new EventDLQCommand(dlqManager)
      await cmd.list(
        {
          eventName: options.event,
          status: options.status,
          from: options.from ? new Date(options.from) : undefined,
          to: options.to ? new Date(options.to) : undefined,
          limit: options.limit ? Number.parseInt(options.limit, 10) : undefined,
          offset: options.offset ? Number.parseInt(options.offset, 10) : undefined,
        },
        { json: options.json }
      )
    } catch (err) {
      console.error(pc.red('Failed to list DLQ entries:'), err)
      process.exit(1)
    }
  })

cli
  .command('event:dlq:show <id>', 'Show details of a DLQ entry')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .option('--json', 'Output in JSON format')
  .action(async (id, options) => {
    try {
      const entryPath = validateEntryPath(options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const dlqManager = core.container.make('dlqManager')
      if (!dlqManager) {
        console.error(pc.yellow('DeadLetterQueueManager is not available.'))
        process.exit(1)
      }

      const cmd = new EventDLQCommand(dlqManager)
      await cmd.show(id, { json: options.json })
    } catch (err) {
      console.error(pc.red('Failed to show DLQ entry:'), err)
      process.exit(1)
    }
  })

cli
  .command('event:dlq:requeue <id>', 'Requeue a DLQ entry')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .action(async (id, options) => {
    try {
      const entryPath = validateEntryPath(options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const dlqManager = core.container.make('dlqManager')
      if (!dlqManager) {
        console.error(pc.yellow('DeadLetterQueueManager is not available.'))
        process.exit(1)
      }

      const cmd = new EventDLQCommand(dlqManager)
      await cmd.requeue(id)
    } catch (err) {
      console.error(pc.red('Failed to requeue DLQ entry:'), err)
      process.exit(1)
    }
  })

cli
  .command('event:dlq:requeue-all', 'Requeue all DLQ entries matching filter')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .option('--event <name>', 'Filter by event name')
  .option('--status <status>', 'Filter by status')
  .action(async (options) => {
    try {
      const entryPath = validateEntryPath(options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const dlqManager = core.container.make('dlqManager')
      if (!dlqManager) {
        console.error(pc.yellow('DeadLetterQueueManager is not available.'))
        process.exit(1)
      }

      const cmd = new EventDLQCommand(dlqManager)
      await cmd.requeueAll({
        eventName: options.event,
        status: options.status,
      })
    } catch (err) {
      console.error(pc.red('Failed to requeue DLQ entries:'), err)
      process.exit(1)
    }
  })

cli
  .command('event:dlq:stats', 'Show DLQ statistics')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const entryPath = validateEntryPath(options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const dlqManager = core.container.make('dlqManager')
      if (!dlqManager) {
        console.error(pc.yellow('DeadLetterQueueManager is not available.'))
        process.exit(1)
      }

      const cmd = new EventDLQCommand(dlqManager)
      await cmd.stats({ json: options.json })
    } catch (err) {
      console.error(pc.red('Failed to get DLQ stats:'), err)
      process.exit(1)
    }
  })

cli
  .command('event:dlq:resolve <id>', 'Mark a DLQ entry as resolved')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .option('--notes <notes>', 'Resolution notes')
  .action(async (id, options) => {
    try {
      const entryPath = validateEntryPath(options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const dlqManager = core.container.make('dlqManager')
      if (!dlqManager) {
        console.error(pc.yellow('DeadLetterQueueManager is not available.'))
        process.exit(1)
      }

      const cmd = new EventDLQCommand(dlqManager)
      await cmd.resolve(id, options.notes)
    } catch (err) {
      console.error(pc.red('Failed to resolve DLQ entry:'), err)
      process.exit(1)
    }
  })

cli
  .command('event:dlq:abandon <id>', 'Abandon a DLQ entry (stop retrying)')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .option('--reason <reason>', 'Abandon reason')
  .action(async (id, options) => {
    try {
      const entryPath = validateEntryPath(options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const dlqManager = core.container.make('dlqManager')
      if (!dlqManager) {
        console.error(pc.yellow('DeadLetterQueueManager is not available.'))
        process.exit(1)
      }

      const cmd = new EventDLQCommand(dlqManager)
      await cmd.abandon(id, options.reason)
    } catch (err) {
      console.error(pc.red('Failed to abandon DLQ entry:'), err)
      process.exit(1)
    }
  })

cli
  .command('event:dlq:delete <id>', 'Delete a DLQ entry')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .action(async (id, options) => {
    try {
      const entryPath = validateEntryPath(options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const dlqManager = core.container.make('dlqManager')
      if (!dlqManager) {
        console.error(pc.yellow('DeadLetterQueueManager is not available.'))
        process.exit(1)
      }

      const cmd = new EventDLQCommand(dlqManager)
      await cmd.delete(id)
    } catch (err) {
      console.error(pc.red('Failed to delete DLQ entry:'), err)
      process.exit(1)
    }
  })

cli
  .command('event:dlq:clear', 'Clear all DLQ entries')
  .option('--entry <file>', 'Entry file (default: src/index.ts)', { default: 'src/index.ts' })
  .option('--event <name>', 'Filter by event name')
  .option('--force', 'Skip confirmation')
  .action(async (options) => {
    try {
      const entryPath = validateEntryPath(options.entry)
      const app = await import(entryPath)
      const core = app.default?.core

      if (!core) {
        console.error(pc.red('Could not find Gravito PlanetCore instance.'))
        process.exit(1)
      }

      const dlqManager = core.container.make('dlqManager')
      if (!dlqManager) {
        console.error(pc.yellow('DeadLetterQueueManager is not available.'))
        process.exit(1)
      }

      const cmd = new EventDLQCommand(dlqManager)
      await cmd.deleteAll({ eventName: options.event }, options.force)
    } catch (err) {
      console.error(pc.red('Failed to clear DLQ:'), err)
      process.exit(1)
    }
  })

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

import { UpgradeCommand } from './commands/upgrade'

cli
  .command('upgrade', 'Upgrade project to a different profile')
  .option('--to <profile>', 'Target profile (core, scale, enterprise)')
  .action(async (options) => {
    if (!options.to) {
      console.error(pc.red('Missing required argument: --to <profile>'))
      process.exit(1)
    }
    const cmd = new UpgradeCommand()
    await cmd.run(options.to as ProfileType)
  })

import { MaintenanceCommand } from './commands/maintenance'

// doctor 命令已在上方註冊 (line 879-882)，此處移除重複註冊

cli.command('add <feature>', 'Add a feature to the project').action(async (feature) => {
  const cmd = new MaintenanceCommand()
  await cmd.addFeature(feature)
})

cli.command('dev', 'Start development server with health checks').action(async () => {
  // 1. Run Doctor Check
  const maintenance = new MaintenanceCommand()
  // We suppress the output of doctor unless it fails
  // Actually, doctor exits process if it fails, so this is safe.
  await maintenance.doctor()

  // 2. Start Vite
  const { spawn } = await import('node:child_process')
  const devProcess = spawn('bun', ['run', 'vite'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }, // Ensure colors
  })

  devProcess.on('error', (err) => {
    console.error(pc.red('Failed to start dev server:'), err)
  })
})

cli.help()

cli.version('3.2.0')

/**
 * Dynamically loads and registers third-party plugins.
 *
 * Scans the project's package.json for explicit plugin definitions in the `gravito.plugins`
 * field or automatically detects dependencies starting with `gravito-plugin-`.
 * Each plugin must export a `register` function to hook into the CLI instance.
 *
 * @param cli - The CAC CLI instance to register commands to.
 * @throws {Error} Silently fails on parsing errors or missing packages to ensure core stability.
 *
 * @example
 * ```typescript
 * // In package.json
 * { "gravito": { "plugins": ["./my-local-plugin.ts"] } }
 * ```
 */
async function loadPlugins(cli: any) {
  try {
    const cwd = process.cwd()
    const pkgPath = path.join(cwd, 'package.json')

    if (!existsSync(pkgPath)) {
      return
    }

    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
    const plugins: string[] = []

    // 1. Load from explicit gravito.plugins configuration
    if (pkg.gravito?.plugins && Array.isArray(pkg.gravito.plugins)) {
      plugins.push(...pkg.gravito.plugins)
    }

    // 2. Auto-detect dependencies starting with gravito-plugin-
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    for (const dep of Object.keys(deps)) {
      if (dep.startsWith('gravito-plugin-') && !plugins.includes(dep)) {
        plugins.push(dep)
      }
    }

    if (plugins.length === 0) {
      return
    }

    for (const pluginName of plugins) {
      try {
        // Attempt to load from project node_modules or local path
        const pluginPath = pluginName.startsWith('.') ? path.resolve(cwd, pluginName) : pluginName

        const plugin = await import(pluginPath)

        // Support both ES Module default export and named export
        const registerFn = plugin.default?.register || plugin.register

        if (typeof registerFn === 'function') {
          await registerFn(cli)
        } else {
          console.warn(
            pc.yellow(`⚠️  Plugin '${pluginName}' does not export a valid register function`)
          )
        }
      } catch (err) {
        console.warn(pc.yellow(`⚠️  Failed to load plugin '${pluginName}':`), err)
      }
    }
  } catch (_err) {
    // Silent fail to ensure CLI remains usable
  }
}

/**
 * Entry point for CLI execution.
 *
 * Performs non-blocking version checks, loads dynamic plugins, and parses
 * command line arguments to trigger actions.
 */
async function main() {
  // 版本檢查 (非阻塞)
  try {
    const checker = new VersionChecker()
    const result = await checker.check()
    checker.showUpgradeMessage(result)
  } catch {
    // 靜默失敗，不影響 CLI 使用
  }

  // 加載外掛
  await loadPlugins(cli)

  // 啟動 CLI
  try {
    cli.parse()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

main()
