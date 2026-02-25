import fs from 'node:fs/promises'
import path from 'node:path'
import { note, outro, spinner } from '@clack/prompts'
import { Painter as pc } from '@gravito/chromatic'
import { LockGenerator, ProfileResolver, type ProfileType } from '@gravito/scaffold'

/**
 * Command for upgrading projects between architecture profiles.
 *
 * Manages transitions between core, scale, and enterprise profiles
 * by generating migration checklists and updating lock files.
 *
 * @example
 * ```typescript
 * const upgrade = new UpgradeCommand()
 *
 * // Upgrade from core to scale profile
 * await upgrade.run('scale')
 *
 * // Upgrade to enterprise profile
 * await upgrade.run('enterprise')
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class UpgradeCommand {
  /**
   * Run the upgrade process to a target profile.
   *
   * @param targetProfile - The profile to upgrade the project to.
   * @returns A promise that resolves when the upgrade plan is generated.
   * @public
   */
  async run(targetProfile: ProfileType) {
    const s = spinner()
    s.start('Analyzing project structure...')

    // 1. Check for lock file
    const lockPath = path.resolve(process.cwd(), 'gravito.lock.json')
    try {
      await fs.access(lockPath)
    } catch {
      s.stop('Analysis Failed')
      console.error(pc.red('❌ No gravito.lock.json found. Cannot upgrade a non-Gravito project.'))
      process.exit(1)
    }

    // 2. Read current state
    const lockContent = JSON.parse(await fs.readFile(lockPath, 'utf-8'))
    const currentProfile = lockContent.profile
    const currentFeatures = lockContent.features || []

    if (currentProfile === targetProfile) {
      s.stop('No changes needed')
      console.log(pc.green(`✅ Project is already on profile: ${targetProfile}`))
      return
    }

    s.message(`Planning upgrade from ${currentProfile} to ${targetProfile}...`)

    // 3. Resolve configs
    const resolver = new ProfileResolver()
    const targetConfig = resolver.resolve(targetProfile, currentFeatures)

    // 4. Generate Migration Checklist
    const checklist = [
      `# Migration Checklist: ${currentProfile} -> ${targetProfile}`,
      '',
      '## 📦 Dependencies',
      '- [ ] Update `package.json` dependencies:',
    ]

    if (targetProfile === 'scale' || targetProfile === 'enterprise') {
      checklist.push('  - [ ] Add `ioredis`')
      checklist.push('  - [ ] Add `pg` (if using Postgres)')
    }

    if (targetProfile === 'enterprise') {
      checklist.push('  - [ ] Add `@gravito/spectrum`')
      checklist.push('  - [ ] Add `@gravito/fortify`')
    }

    checklist.push('', '## ⚙️ Configuration Overrides')
    checklist.push(
      '> ⚠️ **Manual Action Required**: We do not overwrite your existing config files to prevent data loss.'
    )
    checklist.push('')

    const requiredConfigs = ['database', 'cache', 'queue']
    if (targetProfile === 'enterprise') {
      requiredConfigs.push('logging', 'security')
    }

    for (const config of requiredConfigs) {
      checklist.push(`- [ ] Update \`config/${config}.ts\` to match ${targetProfile} defaults.`)
      checklist.push(
        `  (Reference: node_modules/@gravito/scaffold/templates/overlays/${targetProfile}/config/${config}.ts)`
      )
    }

    if (targetProfile !== 'core') {
      checklist.push('', '## 🐳 Docker')
      checklist.push('- [ ] Allow docker-compose to orchestrate services:')
      checklist.push('  ```bash')
      checklist.push('  docker-compose up -d')
      checklist.push('  ```')
    }

    // 5. Write checklist
    await fs.writeFile('MIGRATION.md', checklist.join('\n'))

    // 6. Update Lock File
    const generator = new LockGenerator()
    const newLock = generator.generate(
      targetProfile,
      targetConfig,
      lockContent.template,
      lockContent.version
    )
    await fs.writeFile(lockPath, newLock)

    s.stop('Upgrade Plan Generated')

    note(
      `Upgrade plan written to ${pc.cyan('MIGRATION.md')}.\nLock file updated to ${targetProfile}.`,
      'Upgrade Pending'
    )

    outro('Follow the checklist in MIGRATION.md to complete the upgrade.')
  }
}
