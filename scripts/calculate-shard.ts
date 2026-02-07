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

async function main() {
  // Construct turbo command to get dry run json
  // We verify against test:integration to get the full list of packages that MIGHT need integration tests
  // Ideally we should use a task that exists in all packages, like 'typecheck' or 'build' to get ALL packages.
  // But 'test:integration' is the bottleneck we care about.
  // Let's use 'build' to ensure we capture all packages, as some might not have test:integration
  // but we still want to shard their unit tests/typechecks.
  const filterArgs = baseFilter ? ['--filter', baseFilter] : ['--filter', './packages/*']

  // Use 'build' to discover packages because almost every package has a build script or is part of the graph
  const cmd = ['bunx', 'turbo', 'run', 'build', ...filterArgs, '--dry=json']

  try {
    const { stdout } = await $`${cmd}`.quiet()
    const output = stdout.toString()

    // Turbo might output some logs before json, find the json start
    const jsonStart = output.indexOf('{')
    if (jsonStart === -1) {
      console.error('Failed to parse turbo output: No JSON start found')
      process.exit(1)
    }

    const jsonStr = output.slice(jsonStart)
    const turboPlan = JSON.parse(jsonStr)

    const tasks = turboPlan.tasks || []

    // Extract unique packages
    const packages = Array.from(new Set(tasks.map((t: any) => t.package))).sort()

    if (packages.length === 0) {
      // No tasks/packages to run
      return
    }

    // Sharding logic: simple modulo based on sorted package names (deterministic)
    const myPackages = packages.filter((_, index) => index % totalShards === shardIndex)

    if (myPackages.length === 0) {
      return
    }

    // Construct output filter
    const outputFilter = myPackages.map((pkg) => `--filter=${pkg}`).join(' ')
    console.log(outputFilter)
  } catch (error) {
    console.error('Error calculating shards:', error)
    process.exit(1)
  }
}

main()
