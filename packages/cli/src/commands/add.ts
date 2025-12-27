/**
 * Add Command - Fast Add-on Installer
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { confirm, note, spinner } from '@clack/prompts'
import pc from 'picocolors'

export async function addSpectrumCommand() {
  const s = spinner()
  const cwd = process.cwd()

  note(
    pc.cyan('This command will install and configure @gravito/spectrum in your project.'),
    'Add-on: Spectrum'
  )

  const shouldContinue = await confirm({
    message: 'Proceed with installation?',
    initialValue: true,
  })

  if (!shouldContinue) return

  // 1. Detect Package Manager
  const packageManager = await detectPackageManager(cwd)

  // 2. Install Package
  s.start(`Installing @gravito/spectrum via ${packageManager}...`)
  try {
    const installCmd =
      packageManager === 'npm'
        ? ['npm', 'install', '@gravito/spectrum@beta']
        : [packageManager, 'add', '@gravito/spectrum@beta']
    const proc = Bun.spawn(installCmd, { cwd, stdout: 'inherit', stderr: 'inherit' })
    await proc.exited
    if (proc.exitCode !== 0) throw new Error('Installation failed')
    s.stop('Package installed!')
  } catch (err) {
    s.stop('Installation failed')
    console.error(pc.red(`❌ Failed to install @gravito/spectrum: ${err}`))
    return
  }

  // 3. Patch Source Code
  s.start('Configuring application bootstrap...')
  try {
    const entryPoints = ['src/bootstrap.ts', 'src/index.ts', 'src/app.ts', 'app.ts']
    let patched = false

    for (const entry of entryPoints) {
      const entryPath = path.join(cwd, entry)
      try {
        await fs.access(entryPath)
        const content = await fs.readFile(entryPath, 'utf-8')

        if (content.includes('SpectrumOrbit')) {
          s.stop('Already configured')
          console.log(pc.yellow(`⚠️ Spectrum appears to be already configured in ${entry}`))
          return
        }

        const newContent = patchBootstrap(content)
        await fs.writeFile(entryPath, newContent)
        patched = true
        s.stop(`Successfully configured ${entry}!`)
        break
      } catch (e) {}
    }

    if (!patched) {
      s.stop('Entry point not found')
      console.log(pc.yellow('⚠️ Could not find a standard entry point (src/bootstrap.ts, etc.)'))
      console.log(pc.gray('Please add SpectrumOrbit manually to your PlanetCore initialization.'))
    } else {
      note(
        `Spectrum Dashboard is now ready!
Run your app and visit: ${pc.underline('http://localhost:3000/gravito/spectrum')}`,
        '✨ Success'
      )
    }
  } catch (err) {
    s.stop('Configuration failed')
    console.error(pc.red(`❌ Failed to configure Spectrum: ${err}`))
  }
}

async function detectPackageManager(cwd: string): Promise<string> {
  try {
    await fs.access(path.join(cwd, 'bun.lockb'))
    return 'bun'
  } catch {}
  try {
    await fs.access(path.join(cwd, 'pnpm-lock.yaml'))
    return 'pnpm'
  } catch {}
  try {
    await fs.access(path.join(cwd, 'package-lock.json'))
    return 'npm'
  } catch {}
  return 'bun' // Default to bun
}

function patchBootstrap(content: string): string {
  // Add Import
  let newContent =
    `import { SpectrumOrbit } from '@gravito/spectrum'
` + content

  // Add Orbit Registration
  // We look for "new PlanetCore" and insert after it, or before .bootstrap() / .liftoff()
  if (newContent.includes('new PlanetCore')) {
    // Basic heuristic insertion
    if (newContent.includes('await core.bootstrap()')) {
      newContent = newContent.replace(
        'await core.bootstrap()',
        `// Enable Debug Dashboard
if (process.env.NODE_ENV !== 'production') {
  await core.orbit(new SpectrumOrbit())
}

await core.bootstrap()`
      )
    } else if (newContent.includes('core.liftoff()')) {
      newContent = newContent.replace(
        'core.liftoff()',
        `await core.orbit(new SpectrumOrbit())

core.liftoff()`
      )
    }
  }

  return newContent
}
