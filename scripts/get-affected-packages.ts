#!/usr/bin/env bun

/**
 * 取得受影響的包並輸出 Turbo filter 參數
 *
 * 此腳本會：
 * 1. 找出變更的包
 * 2. 找出所有依賴這些包的包
 * 3. 輸出 Turbo filter 參數或路徑
 *
 * 使用方式：
 * bun run scripts/get-affected-packages.ts [--base <ref>] [--mode <build|test|typecheck|lint>] [--output-paths]
 *
 * 選項：
 * --base: 比較的基準 ref（默認 HEAD~1）
 * --mode: 輸出模式（默認 build）
 *   - build: Turbo filter 參數（用於 turbo run build）
 *   - test: Turbo filter 參數（用於 turbo run test）
 *   - typecheck: Turbo filter 參數（用於 turbo run typecheck）
 *   - lint: Turbo filter 參數（用於 turbo run lint）
 * --output-paths: 輸出文件路徑而不是 filter 參數（用於 biome check）
 *
 * 範例：
 * bun run scripts/get-affected-packages.ts --base origin/main --mode build
 * # 輸出：--filter=@gravito/core --filter=@gravito/photon
 *
 * bun run scripts/get-affected-packages.ts --base origin/main --mode lint --output-paths
 * # 輸出：packages/core/src packages/photon/src
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { $ } from 'bun'

interface PackageInfo {
  name: string
  path: string
  srcPath: string
  dependencies: string[]
  devDependencies: string[]
}

const args = parseArgs({
  options: {
    base: { type: 'string', default: 'HEAD~1' },
    mode: { type: 'string', default: 'build' },
    'output-paths': { type: 'boolean', default: false },
  },
})

const BASE_REF = args.values.base
const OUTPUT_PATHS = args.values['output-paths']

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
              srcPath: join(packagePath, 'src'),
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
async function getChangedPackages(allPackages: Map<string, PackageInfo>): Promise<string[]> {
  try {
    const { stdout, exitCode } = await $`git diff --name-only ${BASE_REF} HEAD`.quiet().nothrow()
    if (exitCode !== 0) {
      console.warn(`⚠️  git diff failed with exit code ${exitCode}. BASE_REF=${BASE_REF}`)
      return []
    }
    const changedFiles = stdout.toString().trim().split('\n').filter(Boolean)

    const changedPackages = new Set<string>()

    for (const file of changedFiles) {
      for (const [name, pkg] of allPackages) {
        if (file.startsWith(pkg.path.replace(`${process.cwd()}/`, ''))) {
          changedPackages.add(name)
        }
      }
    }

    return Array.from(changedPackages)
  } catch (_e) {
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
 * 輸出 Turbo filter 參數
 */
function outputTurboFilters(packageNames: string[]): string {
  if (packageNames.length === 0) {
    return ''
  }

  return packageNames.map((name) => `--filter=${name}`).join(' ')
}

/**
 * 輸出檔案路徑
 */
function outputPaths(packageNames: string[], packages: Map<string, PackageInfo>): string {
  if (packageNames.length === 0) {
    return ''
  }

  const paths: string[] = []
  for (const name of packageNames) {
    const pkg = packages.get(name)
    if (pkg) {
      paths.push(pkg.srcPath.replace(`${process.cwd()}/`, ''))
    }
  }

  return paths.join(' ')
}

/**
 * 主函數
 */
async function main() {
  // 讀取所有包
  const allPackages = await getAllPackages()

  // 找出變更的包
  const changedPackages = await getChangedPackages(allPackages)

  if (changedPackages.length === 0) {
    // 沒有變更的包，輸出空字符串
    process.exit(0)
  }

  // 構建依賴圖
  const dependencyGraph = buildDependencyGraph(allPackages)

  // 找出所有受影響的包
  const affectedPackages = getAffectedPackages(changedPackages, dependencyGraph)

  // 輸出結果
  if (OUTPUT_PATHS) {
    const output = outputPaths(Array.from(affectedPackages), allPackages)
    if (output) {
      console.log(output)
    }
  } else {
    const output = outputTurboFilters(Array.from(affectedPackages))
    if (output) {
      console.log(output)
    }
  }

  process.exit(0)
}

main().catch((e) => {
  console.error('❌ 錯誤：', e)
  process.exit(1)
})
