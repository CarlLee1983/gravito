import { ConfigLoader, IncrementalStrategy, JsonlLogger, SeoEngine } from '@gravito/luminosity'
import pc from 'picocolors'

/**
 * Dependencies for the `analyze` command, supporting dependency injection for testing.
 *
 * @public
 * @since 3.1.0
 */
export interface AnalyzeCommandDeps {
  ConfigLoader?: typeof ConfigLoader
  SeoEngine?: typeof SeoEngine
  IncrementalStrategy?: typeof IncrementalStrategy
}

/**
 * Analyze command options.
 *
 * @public
 * @since 3.1.0
 */
export interface AnalyzeCommandOptions {
  /** Path to the configuration file. */
  config?: string
  /** Show verbose output. */
  verbose?: boolean
}

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

/**
 * Calculate health score based on log/snapshot ratio.
 */
function calculateHealthScore(logSize: number, snapshotSize: number): number {
  if (snapshotSize === 0) return 50 // Neutral score

  const ratio = logSize / snapshotSize

  // Health score decreases as log grows relative to snapshot
  // Ideal ratio: < 0.1 (10%) = 100 points
  // Acceptable: 0.1-0.5 (10-50%) = 80-100 points
  // Warning: 0.5-1.0 (50-100%) = 50-80 points
  // Critical: > 1.0 (>100%) = 0-50 points

  if (ratio < 0.1) return 100
  if (ratio < 0.5) return Math.round(100 - (ratio - 0.1) * 50)
  if (ratio < 1.0) return Math.round(80 - (ratio - 0.5) * 60)
  return Math.max(0, Math.round(50 - (ratio - 1.0) * 50))
}

/**
 * Render a progress bar for health score.
 */
function renderHealthBar(score: number): string {
  const barLength = 10
  const filled = Math.round((score / 100) * barLength)
  const empty = barLength - filled

  const bar = '█'.repeat(filled) + '░'.repeat(empty)

  // Color based on score
  if (score >= 80) return pc.green(bar)
  if (score >= 50) return pc.yellow(bar)
  return pc.red(bar)
}

/**
 * Analyze WAL log health and provide recommendations.
 *
 * Displays statistics about:
 * - Snapshot size and entry count
 * - WAL log size
 * - Health score based on log/snapshot ratio
 * - Recommendations for optimization
 *
 * @param options - Command options
 * @param deps - Injectable dependencies for testing
 *
 * @example
 * ```bash
 * lux analyze
 * lux analyze --config=./custom-config.ts
 * lux analyze --verbose
 * ```
 *
 * @public
 * @since 3.1.0
 */
export async function analyzeCommand(
  options: AnalyzeCommandOptions = {},
  deps: AnalyzeCommandDeps = {}
) {
  try {
    const ConfigLoaderImpl = deps.ConfigLoader ?? ConfigLoader
    const SeoEngineImpl = deps.SeoEngine ?? SeoEngine
    const IncrementalStrategyImpl = deps.IncrementalStrategy ?? IncrementalStrategy

    const loader = new ConfigLoaderImpl()
    const config = await loader.load(options.config)

    if (config.mode !== 'incremental') {
      console.log(pc.yellow('\n⚠️  Analyze command is most useful in "incremental" mode.'))
      console.log(pc.dim('   Other modes do not use WAL logs.\n'))
      return
    }

    console.log(pc.dim('Initializing engine...'))
    const engine = new SeoEngineImpl(config)
    const strategy = engine.getStrategy()

    if (!(strategy instanceof IncrementalStrategyImpl)) {
      console.warn(pc.yellow('Strategy is not incremental. Analysis unavailable.'))
      return
    }

    // Access internal paths (requires config)
    if (!config.incremental) {
      console.error(pc.red('Error: Incremental config missing.'))
      process.exit(1)
    }

    const logDir = config.incremental.logDir
    const snapshotPath = `${logDir}/sitemap.snapshot.json`
    const logPath = `${logDir}/sitemap.ops.jsonl`

    // Get file sizes using the adapter
    const adapter =
      config.incremental.storage || (await import('@gravito/luminosity')).FileSystemAdapter
    const storageAdapter = new (adapter as any)()

    let snapshotSize = 0
    let snapshotExists = false
    let snapshotEntries = 0

    if (await storageAdapter.exists(snapshotPath)) {
      snapshotExists = true
      snapshotSize = await storageAdapter.size(snapshotPath)

      // Parse snapshot to count entries
      const snapshotContent = await storageAdapter.read(snapshotPath)
      try {
        const entries = JSON.parse(snapshotContent)
        snapshotEntries = Array.isArray(entries) ? entries.length : 0
      } catch {
        // Ignore parse errors
      }
    }

    let logSize = 0
    let logExists = false
    let logLineCount = 0

    if (await storageAdapter.exists(logPath)) {
      logExists = true
      logSize = await storageAdapter.size(logPath)

      // Count log lines
      const logContent = await storageAdapter.read(logPath)
      logLineCount = logContent.split('\n').filter((line) => line.trim()).length
    }

    // Calculate health score
    const healthScore = calculateHealthScore(logSize, snapshotSize)

    // Render report
    console.log('')
    console.log(pc.bold(pc.cyan('╔══════════════════════════════════════════╗')))
    console.log(pc.bold(pc.cyan('║     Luminosity Health Report             ║')))
    console.log(pc.bold(pc.cyan('╠══════════════════════════════════════════╣')))

    if (snapshotExists) {
      console.log(
        pc.cyan('║') +
          ` Snapshot Size:     ${pc.bold(formatBytes(snapshotSize).padEnd(20))}` +
          pc.cyan('║')
      )
      console.log(
        pc.cyan('║') +
          ` Snapshot Entries:  ${pc.bold(String(snapshotEntries).padEnd(20))}` +
          pc.cyan('║')
      )
    } else {
      console.log(
        pc.cyan('║') + pc.yellow(` Snapshot:          Not initialized       `) + pc.cyan('║')
      )
    }

    if (logExists) {
      console.log(
        pc.cyan('║') +
          ` WAL Log Size:      ${pc.bold(formatBytes(logSize).padEnd(20))}` +
          pc.cyan('║')
      )
      console.log(
        pc.cyan('║') +
          ` Pending Operations: ${pc.bold(String(logLineCount).padEnd(20))}` +
          pc.cyan('║')
      )
    } else {
      console.log(
        pc.cyan('║') + pc.dim(` WAL Log:           Empty                 `) + pc.cyan('║')
      )
    }

    console.log(
      pc.cyan('║') +
        ` Health Score:      ${renderHealthBar(healthScore)} ${pc.bold(`${healthScore}%`.padStart(4))}  ` +
        pc.cyan('║')
    )
    console.log(pc.bold(pc.cyan('╠══════════════════════════════════════════╣')))

    // Recommendations
    if (healthScore < 50) {
      console.log(
        pc.cyan('║') + pc.red(` ⚠️  Critical: Run 'lux compact' now       `) + pc.cyan('║')
      )
    } else if (healthScore < 80) {
      console.log(
        pc.cyan('║') + pc.yellow(` ⚠️  Warning: Consider running 'lux compact'`) + pc.cyan('║')
      )
    } else {
      console.log(
        pc.cyan('║') + pc.green(` ✅ Healthy: System running optimally    `) + pc.cyan('║')
      )
    }

    console.log(pc.bold(pc.cyan('╚══════════════════════════════════════════╝')))
    console.log('')

    // Verbose output
    if (options.verbose) {
      console.log(pc.dim('Detailed Information:'))
      console.log(pc.dim(`  Log Directory:    ${logDir}`))
      console.log(pc.dim(`  Snapshot Path:    ${snapshotPath}`))
      console.log(pc.dim(`  Log Path:         ${logPath}`))
      console.log(
        pc.dim(`  Max Log Size:     ${formatBytes(config.incremental.maxLogSize ?? 10485760)}`)
      )
      console.log('')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(pc.red('\n❌ Analysis failed:'), message)
    process.exit(1)
  }
}
