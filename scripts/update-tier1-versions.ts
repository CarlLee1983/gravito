#!/usr/bin/env bun

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const TIER1_UPDATES = {
  '@gravito/core': { from: '^1.6.1', to: '^2.0.0' },
  '@gravito/atlas': { from: '^1.6.0', to: '^2.0.0' },
  '@gravito/stream': { from: '^2.0.2', to: '^2.1.0' },
  '@gravito/photon': { from: '^1.0.1', to: '^1.1.0' },
  '@gravito/signal': { from: '^3.0.4', to: '^3.1.0' },
  '@gravito/stasis': { from: '^3.1.1', to: '^3.2.0' },
}

interface PackageJson {
  name?: string
  version?: string
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  dependencies?: Record<string, string>
}

function updatePackageJson(filePath: string): { updated: boolean; changes: number } {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const pkg: PackageJson = JSON.parse(content)

    let changeCount = 0
    let modified = false

    // Update in dependencies
    if (pkg.dependencies) {
      for (const [pkgName, updateConfig] of Object.entries(TIER1_UPDATES)) {
        if (pkg.dependencies[pkgName] === updateConfig.from) {
          pkg.dependencies[pkgName] = updateConfig.to
          changeCount++
          modified = true
        }
      }
    }

    // Update in devDependencies
    if (pkg.devDependencies) {
      for (const [pkgName, updateConfig] of Object.entries(TIER1_UPDATES)) {
        if (pkg.devDependencies[pkgName] === updateConfig.from) {
          pkg.devDependencies[pkgName] = updateConfig.to
          changeCount++
          modified = true
        }
      }
    }

    // Update in peerDependencies
    if (pkg.peerDependencies) {
      for (const [pkgName, updateConfig] of Object.entries(TIER1_UPDATES)) {
        if (pkg.peerDependencies[pkgName] === updateConfig.from) {
          pkg.peerDependencies[pkgName] = updateConfig.to
          changeCount++
          modified = true
        }
      }
    }

    if (modified) {
      writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n')
      return { updated: true, changes: changeCount }
    }

    return { updated: false, changes: 0 }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error)
    return { updated: false, changes: 0 }
  }
}

function updateAllPackages() {
  const packagesDir = join(process.cwd(), 'packages')
  const satellitesDir = join(process.cwd(), 'satellites')

  const updatedFiles: string[] = []
  let totalChanges = 0

  // Update packages
  const packageDirs = readdirSync(packagesDir).filter((dir) => !dir.startsWith('.'))
  for (const dir of packageDirs) {
    const packageJsonPath = join(packagesDir, dir, 'package.json')
    const result = updatePackageJson(packageJsonPath)
    if (result.updated) {
      updatedFiles.push(`packages/${dir}`)
      totalChanges += result.changes
    }
  }

  // Update satellites
  const satelliteDirs = readdirSync(satellitesDir).filter((dir) => !dir.startsWith('.'))
  for (const dir of satelliteDirs) {
    const packageJsonPath = join(satellitesDir, dir, 'package.json')
    const result = updatePackageJson(packageJsonPath)
    if (result.updated) {
      updatedFiles.push(`satellites/${dir}`)
      totalChanges += result.changes
    }
  }

  console.log('\n✅ Tier 1 版本更新完成')
  console.log(`📊 更新了 ${updatedFiles.length} 個包，共 ${totalChanges} 個依賴引用`)
  if (updatedFiles.length > 0) {
    console.log('\n📋 更新的包：')
    for (const file of updatedFiles) {
      console.log(`  - ${file}`)
    }
  }
}

updateAllPackages()
