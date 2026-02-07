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
    const outputFilter = myPackages.map((pkg: unknown) => `--filter=${pkg}`).join(' ')
    console.log(outputFilter)
  } catch (error) {
    console.error('Error calculating shards:', error)
    process.exit(1)
  }
}

main()
