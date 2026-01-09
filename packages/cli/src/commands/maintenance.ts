import fs from 'node:fs/promises'
import path from 'node:path'
import { note, outro, spinner } from '@clack/prompts'
import { LockGenerator, ProfileResolver } from '@gravito/scaffold'
import pc from 'picocolors'

export class MaintenanceCommand {
  async doctor() {
    const s = spinner()
    s.start('Running health check...')

    const issues: string[] = []
    const lockPath = path.resolve(process.cwd(), 'gravito.lock.json')
    let lockContent: any

    // 1. Check Lock File
    try {
      lockContent = JSON.parse(await fs.readFile(lockPath, 'utf-8'))
      s.message('✅ Lock file found')
    } catch {
      issues.push('❌ Missing or invalid gravito.lock.json')
      s.stop('Health Check Failed')
      this.report(issues)
      return
    }

    // 2. Validate Profile Matches Configs
    const profile = lockContent.profile
    s.message(`Checking configuration for profile: ${profile}...`)

    const requiredFiles = ['config/database.ts', 'config/cache.ts', 'config/queue.ts']

    if (profile === 'enterprise') {
      requiredFiles.push('config/logging.ts')
      requiredFiles.push('config/security.ts')
    }

    for (const file of requiredFiles) {
      try {
        await fs.access(path.resolve(process.cwd(), file))
      } catch {
        issues.push(`⚠️ Missing config file for ${profile}: ${file}`)
      }
    }

    // 3. Validate Dependencies in package.json
    try {
      const pkg = JSON.parse(
        await fs.readFile(path.resolve(process.cwd(), 'package.json'), 'utf-8')
      )
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }

      if (profile !== 'core' && !deps.ioredis) {
        issues.push('⚠️ Missing expected dependency "ioredis" for Scale/Enterprise profile')
      }
    } catch {
      issues.push('❌ Could not read package.json')
    }

    s.stop('Health Check Complete')
    this.report(issues)
  }

  private report(issues: string[]) {
    if (issues.length === 0) {
      outro(pc.green('All systems operational. No issues found.'))
    } else {
      note(issues.join('\n'), ' Issues Found')
      outro(pc.yellow('Please resolve the above issues.'))
      process.exit(1)
    }
  }

  async addFeature(feature: string) {
    const s = spinner()
    s.start(`Adding feature: ${feature}...`)

    const resolver = new ProfileResolver()
    if (!resolver.isValidFeature(feature)) {
      s.stop('Invalid Feature')
      console.error(pc.red(`❌ Feature "${feature}" is not recognized.`))
      return
    }

    const lockPath = path.resolve(process.cwd(), 'gravito.lock.json')
    try {
      const lockContent = JSON.parse(await fs.readFile(lockPath, 'utf-8'))
      const features = new Set(lockContent.features || [])

      if (features.has(feature)) {
        s.stop('Feature already exists')
        console.log(pc.yellow(`ℹ️ Feature "${feature}" is already installed.`))
        return
      }

      features.add(feature)
      lockContent.features = Array.from(features)

      // Regenerate lock
      const generator = new LockGenerator()

      // Resolve full config with new features
      const fullConfig = resolver.resolve(lockContent.profile, Array.from(features) as string[])
      const finalLock = generator.generate(
        lockContent.profile,
        fullConfig,
        lockContent.template,
        lockContent.version
      )

      await fs.writeFile(lockPath, finalLock)

      s.stop('Feature Added')

      note(
        `Feature "${feature}" added to gravito.lock.json.\n\nRun 'gravito upgrade --to ${lockContent.profile}' to generate a migration checklist for this feature if needed.`,
        'Success'
      )
    } catch (e) {
      s.stop('Failed')
      console.error(pc.red('Error adding feature:'), e)
    }
  }
}
