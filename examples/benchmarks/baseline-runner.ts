#!/usr/bin/env bun

/**
 * Benchmark Runner - Core Path First
 *
 * Tests the simplest GET / route across all frameworks
 *
 * Usage:
 *   bun run examples/benchmarks/baseline-runner.ts
 */

import { join } from 'node:path'
import { spawn } from 'bun'

// Benchmark configuration
const WARMUP_DURATION = '5s'
const TEST_DURATION = '30s'
const CONNECTIONS = 100
const _REQUESTS_PER_SECOND = 0 // 0 = unlimited

interface BenchmarkTarget {
  name: string
  port: number
  serverFile: string
  color: string
}

const targets: BenchmarkTarget[] = [
  {
    name: 'Bun Native',
    port: 3003,
    serverFile: 'bun-native.ts',
    color: '\x1b[36m', // Cyan
  },
  {
    name: 'Gravito Engine',
    port: 3000,
    serverFile: 'gravito-baseline.ts',
    color: '\x1b[35m', // Magenta
  },
  {
    name: 'Hono',
    port: 3001,
    serverFile: 'hono-baseline.ts',
    color: '\x1b[33m', // Yellow
  },
  {
    name: 'Elysia',
    port: 3002,
    serverFile: 'elysia-baseline.ts',
    color: '\x1b[32m', // Green
  },
]

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

interface BenchmarkResult {
  name: string
  requestsPerSec: number
  latencyP50: number
  latencyP95: number
  latencyP99: number
  totalRequests: number
  errors: number
}

async function waitForServer(port: number, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/`)
      if (response.ok) {
        return true
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return false
}

async function runBenchmark(target: BenchmarkTarget): Promise<BenchmarkResult | null> {
  console.log(`\n${BOLD}${target.color}━━━ Testing ${target.name} ━━━${RESET}`)

  // Start server
  const serverPath = join(import.meta.dir, 'servers', target.serverFile)
  console.log(`Starting server: ${serverPath}`)

  const server = spawn(['bun', 'run', serverPath], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  // Wait for server to be ready
  console.log(`Waiting for server on port ${target.port}...`)
  const ready = await waitForServer(target.port)

  if (!ready) {
    console.error(`❌ Server failed to start on port ${target.port}`)
    server.kill()
    return null
  }

  console.log(`✓ Server ready`)

  // Warmup
  console.log(`Warming up (${WARMUP_DURATION})...`)
  const warmup = spawn([
    'oha',
    '-z',
    WARMUP_DURATION,
    '-c',
    String(CONNECTIONS),
    '--no-tui',
    `http://localhost:${target.port}/`,
  ])
  await warmup.exited

  // Run actual benchmark
  console.log(`Running benchmark (${TEST_DURATION})...`)
  const benchmark = spawn(
    [
      'oha',
      '-z',
      TEST_DURATION,
      '-c',
      String(CONNECTIONS),
      '--no-tui',
      '--output-format',
      'json',
      `http://localhost:${target.port}/`,
    ],
    {
      stdout: 'pipe',
    }
  )

  await benchmark.exited

  // Parse results
  const output = await new Response(benchmark.stdout).text()

  // Kill server
  server.kill()

  try {
    const data = JSON.parse(output)

    return {
      name: target.name,
      requestsPerSec: data.summary.requestsPerSec,
      latencyP50: data.latencyPercentiles.p50,
      latencyP95: data.latencyPercentiles.p95,
      latencyP99: data.latencyPercentiles.p99,
      totalRequests: (Object.values(data.statusCodeDistribution) as number[]).reduce(
        (a, b) => a + b,
        0
      ),
      errors: (Object.values(data.errorDistribution || {}) as number[]).reduce((a, b) => a + b, 0),
    }
  } catch (error) {
    console.error(`Failed to parse benchmark results:`, error)
    console.error(`Output:`, output)
    return null
  }
}

function printResults(results: BenchmarkResult[]) {
  console.log(`\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)
  console.log(`${BOLD}                    BENCHMARK RESULTS                          ${RESET}`)
  console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`)

  // Sort by RPS descending
  const sorted = [...results].sort((a, b) => b.requestsPerSec - a.requestsPerSec)

  const baseline = sorted[0]?.requestsPerSec

  console.log(
    `${'Framework'.padEnd(20)} ${'RPS'.padStart(12)} ${'vs Best'.padStart(10)} ${'p50 (ms)'.padStart(10)} ${'p95 (ms)'.padStart(10)} ${'p99 (ms)'.padStart(10)}`
  )
  console.log('─'.repeat(82))

  for (const result of sorted) {
    const target = targets.find((t) => t.name === result.name)!
    const percentage = ((result.requestsPerSec / baseline - 1) * 100).toFixed(1)
    const percentageStr = percentage === '0.0' ? 'baseline' : `${percentage}%`

    const rps = result.requestsPerSec.toLocaleString('en-US', { maximumFractionDigits: 0 })
    const p50 = (result.latencyP50 * 1000).toFixed(2)
    const p95 = (result.latencyP95 * 1000).toFixed(2)
    const p99 = (result.latencyP99 * 1000).toFixed(2)

    console.log(
      `${target.color}${result.name.padEnd(20)}${RESET} ` +
        `${rps.padStart(12)} ` +
        `${percentageStr.padStart(10)} ` +
        `${p50.padStart(10)} ` +
        `${p95.padStart(10)} ` +
        `${p99.padStart(10)}`
    )
  }

  console.log(`\n${'─'.repeat(82)}`)

  // Calculate Gravito vs Hono
  const gravito = results.find((r) => r.name === 'Gravito Engine')
  const hono = results.find((r) => r.name === 'Hono')

  if (gravito && hono) {
    const diff = ((gravito.requestsPerSec / hono.requestsPerSec - 1) * 100).toFixed(1)
    const symbol = Number(diff) >= 0 ? '✓' : '✗'
    const color = Number(diff) >= 20 ? '\x1b[32m' : Number(diff) >= 0 ? '\x1b[33m' : '\x1b[31m'

    console.log(`\n${BOLD}Gravito vs Hono:${RESET} ${color}${symbol} ${diff}%${RESET}`)

    if (Number(diff) >= 20) {
      console.log(
        `${BOLD}\x1b[32m🎉 TARGET ACHIEVED! Gravito is ${diff}% faster than Hono!${RESET}`
      )
    } else if (Number(diff) >= 0) {
      console.log(`${BOLD}\x1b[33m⚠️  Close but not yet at +20% target (currently ${diff}%)${RESET}`)
    } else {
      console.log(`${BOLD}\x1b[31m❌ Gravito is slower than Hono. Optimization needed.${RESET}`)
    }
  }

  // Calculate Gravito vs Native
  const native = results.find((r) => r.name === 'Bun Native')
  if (gravito && native) {
    const overhead = ((1 - gravito.requestsPerSec / native.requestsPerSec) * 100).toFixed(1)
    console.log(`${BOLD}Framework Overhead:${RESET} ${overhead}% slower than native Bun.serve`)
  }

  console.log(`\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`)
}

async function main() {
  console.log(`${BOLD}Gravito Engine - Baseline Benchmark${RESET}`)
  console.log(`Testing: GET / (simplest static route)`)
  console.log(`Duration: ${TEST_DURATION} (after ${WARMUP_DURATION} warmup)`)
  console.log(`Connections: ${CONNECTIONS}`)
  console.log(`Tool: oha\n`)

  const results: BenchmarkResult[] = []

  for (const target of targets) {
    const result = await runBenchmark(target)
    if (result) {
      results.push(result)
    }

    // Wait a bit between tests
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  if (results.length > 0) {
    printResults(results)

    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputPath = join(import.meta.dir, 'results', `baseline-${timestamp}.json`)
    await Bun.write(outputPath, JSON.stringify(results, null, 2))
    console.log(`Results saved to: ${outputPath}`)
  } else {
    console.error('No benchmark results collected')
    process.exit(1)
  }
}

main().catch(console.error)
