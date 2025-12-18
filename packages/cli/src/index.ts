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

cli.command('create [name]', 'Create a new Gravito project').action(async (name) => {
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
    template: () =>
      select({
        message: 'Pick a starting point:',
        options: [
          { value: 'basic', label: '🪐 Basic Planet (Core + Hono)', hint: 'Minimal setup' },
          { value: 'inertia-react', label: '⚛️ Inertia + React', hint: 'Full-stack SPA with Vite' },
        ],
      }),
  })

  if (isCancel(project.name) || isCancel(project.template)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }

  const s = spinner()
  s.start('Scaffolding your universe...')

  try {
    // Use giget to download from GitHub
    // Format: github:user/repo/path/to/template
    // We point to the 'templates/basic' folder in our repo
    const templateSource = `github:CarlLee1983/gravito/templates/${project.template}#main`

    await downloadTemplate(templateSource, {
      dir: project.name,
      force: true, // Allow overwriting empty dir
    })

    s.stop('Universe created!')

    // Update package.json
    const pkgPath = path.join(process.cwd(), project.name, 'package.json')
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))

    // Update project name
    pkg.name = project.name

    // Replace workspace:* with actual versions
    const gravitoVersion = '^0.3.0'
    if (pkg.dependencies) {
      for (const dep of Object.keys(pkg.dependencies)) {
        if (pkg.dependencies[dep] === 'workspace:*') {
          pkg.dependencies[dep] = gravitoVersion
        }
      }
    }

    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))

    note(`Project: ${project.name}\nTemplate: ${project.template}`, 'Mission Successful')

    outro(`You're all set! \n\n  cd ${pc.cyan(project.name)}\n  bun install\n  bun run dev`)
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
    if (!promptFn) continue
    const result = await promptFn()

    if (isCancel(result)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    results[key] = result
  }

  return results as T
}

cli.help()
cli.version('0.3.0-alpha.1')

try {
  cli.parse()
} catch (error) {
  console.error(error)
  process.exit(1)
}
