#!/usr/bin/env bun
import { parseArgs } from 'node:util'
import { $ } from 'bun'

const args = parseArgs({
  options: {
    shard: { type: 'string' }, // 1-based index
    total: { type: 'string' },
    filter: { type: 'string', default: '' }, // Base filter
  },
})

const shardIndex = parseInt(args.values.shard || '1', 10) - 1
const totalShards = parseInt(args.values.total || '1', 10)
const baseFilter = args.values.filter

function getPackageWeight(pkgName: string): number {
  // Assign weights based on known package complexity
  // Large core packages with many tests get higher weights
  const weights: Record<string, number> = {
    '@gravito/core': 100, // 64 tests
    '@gravito/atlas': 90, // Large ORM package
    '@gravito/photon': 80, // HTTP engine
    '@gravito/graphql': 70, // 29 tests
    '@gravito/flux': 70, // Complex package
    '@gravito/signal': 60, // 18 tests
    '@gravito/stream': 60,
    '@gravito/astral': 50, // 8 tests
    '@gravito/monolith': 50,
    '@gravito/enterprise': 40,
    '@gravito/luminosity': 40,
    '@gravito/prism': 40,
  }
  return weights[pkgName as string] || 10 // Default weight for other packages
}

async function main() {
  // Construct turbo command to get dry run json
  const filterArgs = baseFilter ? ['--filter', baseFilter] : ['--filter', './packages/*']

  // Use 'build' to discover packages because almost every package has a build script or is part of the graph
  const cmd = ['bunx', 'turbo', 'run', 'build', ...filterArgs, '--dry=json']

  try {
    const { stdout } = await $`${cmd}`.quiet()
    const output = stdout.toString().trim()

    // Turbo might output some logs before json, find the json start
    // Find the first '{' that looks like the start of the JSON object
    const jsonStart = output.indexOf('{')
    if (jsonStart === -1) {
      console.error('Failed to parse turbo output: No JSON start found')
      console.error('Output:', output)
      process.exit(1)
    }

    const jsonStr = output.slice(jsonStart)
    const turboPlan = JSON.parse(jsonStr)

    const tasks = turboPlan.tasks || []

    // Extract unique packages with weights
    const packages = Array.from(new Set(tasks.map((t: any) => t.package)))
      .map((pkg: string) => ({ name: pkg, weight: getPackageWeight(pkg) }))
      .sort((a, b) => b.weight - a.weight) // Sort by weight descending

    if (packages.length === 0) {
      // No tasks/packages to run
      return
    }

    // Sharding logic: distribute packages to shards based on weight (greedy algorithm)
    // Assign each package to the shard with lowest total weight
    const shardWeights: number[] = Array(totalShards).fill(0)
    const shardPackages: string[][] = Array(totalShards)
      .fill(null)
      .map(() => [])

    for (const pkg of packages) {
      // Find shard with minimum weight
      let minShardIdx = 0
      let minWeight = shardWeights[0]
      for (let i = 1; i < totalShards; i++) {
        if (shardWeights[i] < minWeight) {
          minWeight = shardWeights[i]
          minShardIdx = i
        }
      }
      // Assign to this shard
      shardPackages[minShardIdx].push(pkg.name)
      shardWeights[minShardIdx] += pkg.weight
    }

    const myPackages = shardPackages[shardIndex]
    if (myPackages.length === 0) {
      return
    }

    // Construct output filter
    const outputFilter = myPackages.map((pkg: string) => `--filter=${pkg}`).join(' ')
    console.log(outputFilter)
  } catch (error) {
    console.error('Error calculating shards:', error)
    process.exit(1)
  }
}

main()
