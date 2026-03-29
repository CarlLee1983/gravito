#!/usr/bin/env bun

/**
 * Version Bump Script for Phase 16-19 Modified Packages
 *
 * Purpose:
 *   Bump all 38 packages modified in Phase 16-19 to their next major version,
 *   and update all peerDependency ranges referencing those packages.
 *
 * Per decisions D-06, D-07, D-08:
 *   - Only 38 packages with actual source changes get bumps
 *   - Each gets major+1 (e.g., 2.6.0 -> 3.0.0, 1.1.4 -> 2.0.0)
 *   - peerDependencies must match new ranges
 *   - workspace:* protocol stays unchanged
 *
 * Usage:
 *   bun run scripts/bump-v2-versions.ts
 */

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PACKAGES_DIR = join(process.cwd(), 'packages')

// The 38 packages modified in Phase 16-19
const BUMP_PACKAGES = [
  'astral',
  'atlas',
  'beam',
  'cli',
  'constellation',
  'core',
  'cosmos',
  'dark-matter',
  'echo',
  'flare',
  'flux',
  'forge',
  'fortify',
  'freeze',
  'graphql',
  'horizon',
  'impulse',
  'impulse-bridge',
  'launchpad',
  'luminosity',
  'monitor',
  'monolith',
  'nebula',
  'nebula-s3',
  'photon',
  'plasma',
  'prism',
  'pulsar',
  'quark',
  'quasar',
  'radiance',
  'resilience',
  'ripple',
  'sentinel',
  'signal',
  'stasis',
  'stream',
  'zenith',
]

// Colors for output
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
}

function computeNextMajor(version: string): string {
  // Handle pre-release versions like "1.0.0-beta.8" -> parseInt('1') = 1 -> 2.0.0
  const major = parseInt(version.split('.')[0], 10)
  return `${major + 1}.0.0`
}

async function phase1VersionBumps(): Promise<Map<string, string>> {
  console.log(`\n${c.bold}${c.blue}Phase 1: Version Bumps${c.reset}`)
  console.log('─'.repeat(60))

  const newVersionMap = new Map<string, string>()
  let bumpCount = 0

  for (const pkgName of BUMP_PACKAGES) {
    const pkgPath = join(PACKAGES_DIR, pkgName, 'package.json')

    try {
      const content = await readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(content) as {
        name: string
        version: string
        [key: string]: unknown
      }

      const oldVersion = pkg.version
      const newVersion = computeNextMajor(oldVersion)

      pkg.version = newVersion
      await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

      // Store mapping: @gravito/{name} -> newVersion
      const gravitoName = pkg.name as string
      newVersionMap.set(gravitoName, newVersion)

      console.log(`  ${c.green}✓${c.reset} ${gravitoName.padEnd(35)} ${oldVersion} -> ${c.green}${newVersion}${c.reset}`)
      bumpCount++
    } catch (err) {
      console.error(`  ${c.red}✗${c.reset} ${pkgName}: ${(err as Error).message}`)
    }
  }

  console.log(`\n  ${c.bold}Bumped ${bumpCount} packages${c.reset}`)
  return newVersionMap
}

async function phase2PeerDepUpdates(newVersionMap: Map<string, string>): Promise<number> {
  console.log(`\n${c.bold}${c.blue}Phase 2: peerDependency Range Updates${c.reset}`)
  console.log('─'.repeat(60))

  let updateCount = 0

  // Scan ALL package.json files in packages/
  const allDirs = await readdir(PACKAGES_DIR)

  for (const dirName of allDirs) {
    const pkgPath = join(PACKAGES_DIR, dirName, 'package.json')

    try {
      const content = await readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(content) as {
        name: string
        peerDependencies?: Record<string, string>
        [key: string]: unknown
      }

      const peerDeps = pkg.peerDependencies
      if (!peerDeps) continue

      let modified = false

      for (const [depKey, depValue] of Object.entries(peerDeps)) {
        // Skip non-gravito dependencies
        if (!depKey.startsWith('@gravito/')) continue

        // Skip workspace:* entries (D-08: internal workspace protocol stays unchanged)
        if (depValue === 'workspace:*') continue

        // Check if this dependency is in our bump list
        const newVersion = newVersionMap.get(depKey)
        if (!newVersion) continue

        // Get the new major number
        const newMajor = parseInt(newVersion.split('.')[0], 10)
        const newRange = `^${newMajor}.0.0`

        // Only update if different
        if (depValue !== newRange) {
          const oldRange = depValue
          peerDeps[depKey] = newRange
          modified = true
          updateCount++

          console.log(
            `  ${c.green}✓${c.reset} ${pkg.name.padEnd(35)} peerDep ${depKey}: ${oldRange} -> ${c.green}${newRange}${c.reset}`
          )
        }
      }

      if (modified) {
        await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
      }
    } catch {
      // Skip directories without package.json (e.g., non-package dirs)
    }
  }

  console.log(`\n  ${c.bold}Updated ${updateCount} peerDependency entries${c.reset}`)
  return updateCount
}

async function phase3Summary(bumpCount: number, peerDepCount: number): Promise<void> {
  console.log(`\n${c.bold}${c.blue}Phase 3: Summary${c.reset}`)
  console.log('─'.repeat(60))
  console.log(`  ${c.green}✓${c.reset} Packages bumped:        ${c.bold}${bumpCount}${c.reset}`)
  console.log(`  ${c.green}✓${c.reset} peerDep entries updated: ${c.bold}${peerDepCount}${c.reset}`)
  console.log(`\n  ${c.green}${c.bold}✅ Version bump complete!${c.reset}`)
  console.log(
    `\n  ${c.gray}Next steps:${c.reset}
    1. Run: ${c.bold}bun run version:check${c.reset} (should show NEW VERSION for all 38)
    2. Run: ${c.bold}bun run typecheck${c.reset} (confirm zero errors)`
  )
}

async function main(): Promise<void> {
  console.log(`${c.bold}🚀 Gravito Version Bump — Phase 16-19 Packages${c.reset}`)
  console.log(`   Bumping ${BUMP_PACKAGES.length} packages to next major version\n`)

  const newVersionMap = await phase1VersionBumps()
  const peerDepCount = await phase2PeerDepUpdates(newVersionMap)
  await phase3Summary(newVersionMap.size, peerDepCount)
}

main().catch((err) => {
  console.error(`\n${c.red}Fatal error:${c.reset}`, err)
  process.exit(1)
})
