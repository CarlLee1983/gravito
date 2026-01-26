#!/usr/bin/env bun

/**
 * 驗證受影響的包及其依賴
 *
 * 此腳本會：
 * 1. 找出變更的包
 * 2. 找出所有依賴這些包的包
 * 3. 對所有受影響的包運行 typecheck
 *
 * 使用方式：
 * bun run scripts/validate-affected-packages.ts
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { $ } from 'bun'

interface PackageInfo {
  name: string
  path: string
  dependencies: string[]
  devDependencies: string[]
}

/**
 * 讀取所有包的資訊
 */
async function getAllPackages(): Promise<Map<string, PackageInfo>> {
  const packages = new Map<string, PackageInfo>()
  const packageDirs = ['packages', 'satellites']

  for (const dir of packageDirs) {
    const dirPath = join(process.cwd(), dir)
    try {
      const entries = await readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packagePath = join(dirPath, entry.name)
          const packageJsonPath = join(packagePath, 'package.json')
          try {
            const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
            packages.set(packageJson.name, {
              name: packageJson.name,
              path: packagePath,
              dependencies: Object.keys(packageJson.dependencies || {}),
              devDependencies: Object.keys(packageJson.devDependencies || {}),
            })
          } catch (_e) {
            // 忽略沒有 package.json 的目錄
          }
        }
      }
    } catch (_e) {
      // 目錄不存在，忽略
    }
  }

  return packages
}

/**
 * 找出變更的包
 */
async function getChangedPackages(): Promise<string[]> {
  try {
    // 使用 git diff 找出變更的文件
    const { stdout } = await $`git diff --name-only HEAD~1 HEAD`.quiet()
    const changedFiles = stdout.toString().trim().split('\n').filter(Boolean)

    const changedPackages = new Set<string>()
    const allPackages = await getAllPackages()

    for (const file of changedFiles) {
      for (const [name, pkg] of allPackages) {
        if (file.startsWith(pkg.path.replace(`${process.cwd()}/`, ''))) {
          changedPackages.add(name)
        }
      }
    }

    return Array.from(changedPackages)
  } catch (_e) {
    // 如果沒有 HEAD~1（例如第一次提交），返回空數組
    return []
  }
}

/**
 * 構建依賴圖（反向：找出依賴某個包的所有包）
 */
function buildDependencyGraph(packages: Map<string, PackageInfo>): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  // 初始化所有包的依賴者集合
  for (const name of packages.keys()) {
    graph.set(name, new Set())
  }

  // 構建反向依賴圖
  for (const [name, pkg] of packages) {
    const allDeps = [...pkg.dependencies, ...pkg.devDependencies]
    for (const dep of allDeps) {
      if (dep.startsWith('@gravito/')) {
        const dependents = graph.get(dep)
        if (dependents) {
          dependents.add(name)
        }
      }
    }
  }

  return graph
}

/**
 * 找出所有受影響的包（變更的包 + 依賴它們的包）
 */
function getAffectedPackages(
  changedPackages: string[],
  dependencyGraph: Map<string, Set<string>>
): Set<string> {
  const affected = new Set<string>(changedPackages)

  // 遞歸找出所有依賴變更包的包
  const queue = [...changedPackages]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) {
      continue
    }
    visited.add(current)

    const dependents = dependencyGraph.get(current)
    if (dependents) {
      for (const dependent of dependents) {
        if (!affected.has(dependent)) {
          affected.add(dependent)
          queue.push(dependent)
        }
      }
    }
  }

  return affected
}

/**
 * 對受影響的包運行 typecheck
 */
async function typecheckPackages(packageNames: string[]): Promise<boolean> {
  if (packageNames.length === 0) {
    console.log('✅ 沒有受影響的包需要檢查')
    return true
  }

  console.log(`\n🔍 檢查 ${packageNames.length} 個受影響的包：`)
  for (const name of packageNames) {
    console.log(`  - ${name}`)
  }

  try {
    // 使用 turbo 並行運行 typecheck
    const filter = packageNames.map((name) => `--filter=${name}`).join(' ')
    await $`bunx turbo run typecheck ${filter.split(' ')}`.quiet()
    console.log('\n✅ 所有受影響的包都通過了 typecheck')
    return true
  } catch (_e) {
    console.error('\n❌ 部分包未通過 typecheck')
    return false
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('🔍 分析受影響的包...\n')

  // 1. 讀取所有包
  const allPackages = await getAllPackages()
  console.log(`📦 找到 ${allPackages.size} 個包`)

  // 2. 找出變更的包
  const changedPackages = await getChangedPackages()
  if (changedPackages.length === 0) {
    console.log('ℹ️  沒有檢測到變更的包（可能是第一次提交）')
    console.log('✅ 跳過檢查')
    process.exit(0)
  }
  console.log(`📝 變更的包：${changedPackages.join(', ')}`)

  // 3. 構建依賴圖
  const dependencyGraph = buildDependencyGraph(allPackages)

  // 4. 找出所有受影響的包
  const affectedPackages = getAffectedPackages(changedPackages, dependencyGraph)

  // 5. 運行 typecheck
  const success = await typecheckPackages(Array.from(affectedPackages))

  process.exit(success ? 0 : 1)
}

main().catch((e) => {
  console.error('❌ 錯誤：', e)
  process.exit(1)
})
