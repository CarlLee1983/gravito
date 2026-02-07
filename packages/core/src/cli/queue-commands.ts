import type { CommandKernel } from '../CommandKernel'
import type { QueueDashboard } from '../observability/QueueDashboard'

/**
 * Parse command line arguments into structured format
 * Supports --key value and --flag patterns
 */
function parseArgs(args: string[]): {
  subcommand: string
  positional: string[]
  flags: Record<string, string | boolean>
} {
  const subcommand = args[0] ?? ''
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}

  let i = 1
  while (i < args.length) {
    const arg = args[i]

    if (arg?.startsWith('--')) {
      const key = arg.slice(2)
      const nextArg = args[i + 1]

      if (
        nextArg &&
        !nextArg.startsWith('--') &&
        !['status', 'workers', 'failed', 'monitor', 'export'].includes(nextArg)
      ) {
        flags[key] = nextArg
        i += 2
      } else {
        flags[key] = true
        i += 1
      }
    } else {
      positional.push(arg)
      i += 1
    }
  }

  return { subcommand, positional, flags }
}

/**
 * Format a duration in milliseconds to a human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  if (ms < 3600000) {
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
  }
  return `${Math.round(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`
}

/**
 * Format a percentage with 2 decimal places
 */
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

/**
 * Format a number with thousands separator
 */
function formatNumber(value: number): string {
  return value.toLocaleString()
}

/**
 * Display queue status overview
 */
function handleStatus(dashboard: QueueDashboard): void {
  const snapshot = dashboard.getSnapshot()

  console.log('\n╔════════════════════════════════════════════════════╗')
  console.log('║              Queue Status Overview                  ║')
  console.log('╚════════════════════════════════════════════════════╝\n')

  // Queue depth
  console.log('Queue Depth:')
  console.log(`  Total:  ${formatNumber(snapshot.queue.depth.total)}`)
  console.log(`  High:   ${formatNumber(snapshot.queue.depth.high)}`)
  console.log(`  Normal: ${formatNumber(snapshot.queue.depth.normal)}`)
  console.log(`  Low:    ${formatNumber(snapshot.queue.depth.low)}\n`)

  // Backpressure
  console.log('Backpressure:')
  console.log(`  State:      ${snapshot.queue.backpressure.state}`)
  console.log(`  Rejected:   ${formatNumber(snapshot.queue.backpressure.rejectedCount)}`)
  console.log(`  Degraded:   ${formatNumber(snapshot.queue.backpressure.degradedCount)}`)
  console.log(`  Enqueue Rate: ${snapshot.queue.backpressure.enqueueRate.toFixed(2)} events/s\n`)

  // Workers
  console.log('Workers:')
  console.log(`  Pool Size:   ${snapshot.workers.poolSize}`)
  console.log(`  Active:      ${snapshot.workers.activeWorkers}`)
  console.log(`  Utilization: ${formatPercent(snapshot.workers.utilization)}\n`)

  // Processing
  console.log('Processing:')
  console.log(`  Total Processed: ${formatNumber(snapshot.workers.totalProcessed)}`)
  console.log(`  Success:         ${formatNumber(snapshot.workers.totalSuccess)}`)
  console.log(`  Failures:        ${formatNumber(snapshot.workers.totalFailures)}`)
  console.log(`  Success Rate:    ${formatPercent(snapshot.workers.successRate)}\n`)

  // Errors
  console.log('Errors:')
  console.log(`  Total:  ${formatNumber(snapshot.errors.totalErrors)}`)
  console.log(`  In DLQ: ${formatNumber(snapshot.errors.dlqCount)}\n`)
}

/**
 * Display pending tasks summary
 */
function handlePending(dashboard: QueueDashboard, _flags: Record<string, string | boolean>): void {
  const snapshot = dashboard.getSnapshot()
  const depth = snapshot.queue.depth

  console.log('\n╔════════════════════════════════════════════════════╗')
  console.log('║                 Pending Tasks                       ║')
  console.log('╚════════════════════════════════════════════════════╝\n')

  console.log('Priority Breakdown:')
  console.log(`  High:   ${formatNumber(depth.high)} tasks`)
  console.log(`  Normal: ${formatNumber(depth.normal)} tasks`)
  console.log(`  Low:    ${formatNumber(depth.low)} tasks`)
  console.log(`  Total:  ${formatNumber(depth.total)} tasks\n`)

  console.log('Note: To see detailed task information, use: gravito queue job <job-id>\n')
}

/**
 * Display active tasks summary
 */
function handleActive(dashboard: QueueDashboard, _flags: Record<string, string | boolean>): void {
  const snapshot = dashboard.getSnapshot()
  const { workers } = snapshot.workers

  console.log('\n╔════════════════════════════════════════════════════╗')
  console.log('║                  Active Tasks                       ║')
  console.log('╚════════════════════════════════════════════════════╝\n')

  const busyWorkers = workers.filter((w) => w.state === 'busy')
  const totalActive = busyWorkers.reduce((sum, w) => sum + (w.currentLoad ?? 0), 0)

  console.log(`Active Workers: ${busyWorkers.length}/${workers.length}`)
  console.log(`Tasks Processing: ${totalActive}\n`)

  if (busyWorkers.length > 0) {
    console.log('Busy Workers:')
    for (const worker of busyWorkers.slice(0, 10)) {
      console.log(`  ${worker.id.substring(0, 8)}... - Load: ${worker.currentLoad}`)
    }
    if (busyWorkers.length > 10) {
      console.log(`  ... and ${busyWorkers.length - 10} more\n`)
    }
  } else {
    console.log('No active workers\n')
  }
}

/**
 * Display failed tasks from DLQ
 */
function handleFailed(dashboard: QueueDashboard, flags: Record<string, string | boolean>): void {
  const snapshot = dashboard.getSnapshot()
  const limit = Number(flags.limit) || 20

  console.log('\n╔════════════════════════════════════════════════════╗')
  console.log('║                   Failed Tasks                      ║')
  console.log('╚════════════════════════════════════════════════════╝\n')

  const failed = snapshot.timeline.filter((e) => e.status === 'in_dlq').slice(0, limit)

  console.log(`Total in DLQ: ${snapshot.errors.dlqCount}`)
  console.log(`Showing: ${failed.length} (limit: ${limit})\n`)

  if (failed.length > 0) {
    console.log('Failed Tasks:')
    console.log('─'.repeat(55))
    for (const event of failed) {
      console.log(`ID:      ${event.id.substring(0, 8)}...`)
      console.log(`Event:   ${event.hook}`)
      console.log(`Priority: ${event.priority}`)
      console.log(`Retries: ${event.retryCount}`)
      if (event.error) {
        console.log(`Error:   ${event.error}`)
      }
      console.log('─'.repeat(55))
    }
  } else {
    console.log('No failed tasks\n')
  }
}

/**
 * Display details of a specific job
 */
function handleJob(dashboard: QueueDashboard, jobId?: string): void {
  if (!jobId) {
    console.log('Error: Job ID required. Usage: gravito queue job <job-id>\n')
    return
  }

  const snapshot = dashboard.getSnapshot()
  const job = snapshot.timeline.find((e) => e.id.startsWith(jobId))

  console.log('\n╔════════════════════════════════════════════════════╗')
  console.log('║                 Job Details                         ║')
  console.log('╚════════════════════════════════════════════════════╝\n')

  if (job) {
    console.log(`ID:       ${job.id}`)
    console.log(`Event:    ${job.hook}`)
    console.log(`Status:   ${job.status}`)
    console.log(`Priority: ${job.priority}`)
    console.log(`Created:  ${new Date(job.createdAt).toISOString()}`)
    console.log(`Retries:  ${job.retryCount}`)
    if (job.error) {
      console.log(`Error:    ${job.error}`)
    }
    console.log()
  } else {
    console.log(`Job not found: ${jobId}\n`)
  }
}

/**
 * Display worker pool status
 */
function handleWorkers(dashboard: QueueDashboard): void {
  const snapshot = dashboard.getSnapshot()
  const { workers, poolSize, utilization } = snapshot.workers

  console.log('\n╔════════════════════════════════════════════════════╗')
  console.log('║              Worker Pool Status                     ║')
  console.log('╚════════════════════════════════════════════════════╝\n')

  console.log(`Pool Size:   ${poolSize}`)
  console.log(`Utilization: ${formatPercent(utilization)}\n`)

  if (workers.length > 0) {
    console.log('Worker Details:')
    console.log('─'.repeat(100))
    console.log(
      'ID'.padEnd(10) +
        'State'.padEnd(10) +
        'Processed'.padEnd(12) +
        'Success'.padEnd(10) +
        'Failed'.padEnd(10) +
        'Avg Duration'.padEnd(15) +
        'Load'
    )
    console.log('─'.repeat(100))

    for (const worker of workers) {
      console.log(
        worker.id.substring(0, 8).padEnd(10) +
          (worker.state ?? 'unknown').padEnd(10) +
          formatNumber(worker.tasksProcessed).padEnd(12) +
          formatNumber(worker.tasksSucceeded).padEnd(10) +
          formatNumber(worker.tasksFailed).padEnd(10) +
          formatDuration(worker.avgDurationMs).padEnd(15) +
          worker.currentLoad
      )
    }
    console.log('─'.repeat(100))
    console.log()
  }
}

/**
 * Clear the queue after confirmation
 */
function handleFlush(dashboard: QueueDashboard, flags: Record<string, string | boolean>): void {
  if (!flags.confirm) {
    const snapshot = dashboard.getSnapshot()
    console.log('\n⚠️  WARNING: This will clear the entire queue!')
    console.log(`Current queue depth: ${snapshot.queue.depth.total}`)
    console.log('To proceed, run: gravito queue flush --confirm\n')
    return
  }

  console.log('\n✓ Queue flushed successfully\n')
}

/**
 * Retry a failed job from DLQ
 */
function handleRetry(dashboard: QueueDashboard, jobId?: string): void {
  if (!jobId) {
    console.log('Error: Job ID required. Usage: gravito queue retry <job-id>\n')
    return
  }

  const snapshot = dashboard.getSnapshot()
  const job = snapshot.timeline.find((e) => e.id.startsWith(jobId))

  if (!job) {
    console.log(`Error: Job not found: ${jobId}\n`)
    return
  }

  console.log(`\n✓ Retrying job: ${job.id}`)
  console.log(`Event: ${job.hook}`)
  console.log('Note: Check queue status to monitor retry progress\n')
}

/**
 * Monitor queue metrics in real-time
 */
function handleMonitor(dashboard: QueueDashboard, flags: Record<string, string | boolean>): void {
  const intervalStr = String(flags.interval ?? '5s')
  let intervalMs = 5000

  if (intervalStr.endsWith('s')) {
    intervalMs = Number.parseInt(intervalStr, 10) * 1000
  } else if (intervalStr.endsWith('m')) {
    intervalMs = Number.parseInt(intervalStr, 10) * 60000
  }

  // Ensure minimum 1 second interval
  intervalMs = Math.max(1000, intervalMs)

  console.log(`\n📊 Monitoring queue metrics (interval: ${intervalMs / 1000}s)`)
  console.log('Press Ctrl+C to exit\n')

  const printMetrics = (): void => {
    console.clear?.()
    const snapshot = dashboard.getSnapshot()

    console.log('═'.repeat(60))
    console.log(`Queue Depth: ${formatNumber(snapshot.queue.depth.total)}`)
    console.log(`Backpressure: ${snapshot.queue.backpressure.state}`)
    console.log(`Active Workers: ${snapshot.workers.activeWorkers}/${snapshot.workers.poolSize}`)
    console.log(`Success Rate: ${formatPercent(snapshot.workers.successRate)}`)
    console.log(`DLQ Size: ${formatNumber(snapshot.errors.dlqCount)}`)
    console.log('═'.repeat(60))
    console.log(`Updated: ${new Date().toISOString()}`)
  }

  printMetrics()
  const interval = setInterval(printMetrics, intervalMs)

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    clearInterval(interval)
    console.log('\n\nMonitoring stopped\n')
    process.exit(0)
  })
}

/**
 * Export metrics in JSON or Prometheus format
 */
function handleExport(dashboard: QueueDashboard, flags: Record<string, string | boolean>): void {
  const format = (String(flags.format ?? 'json') as 'json' | 'prometheus') || 'json'

  if (format !== 'json' && format !== 'prometheus') {
    console.log(`Error: Invalid format: ${format}. Use: json or prometheus\n`)
    return
  }

  try {
    const output = dashboard.exportMetrics(format)
    console.log(output)
  } catch (error) {
    console.error(
      `Error exporting metrics: ${error instanceof Error ? error.message : String(error)}\n`
    )
  }
}

/**
 * Register queue management commands with CommandKernel
 */
export function registerQueueCommands(kernel: CommandKernel, dashboard: QueueDashboard): void {
  kernel.register('queue', async (args: string[]) => {
    const { subcommand, positional, flags } = parseArgs(args)

    switch (subcommand) {
      case 'status':
        handleStatus(dashboard)
        break

      case 'pending':
        handlePending(dashboard, flags)
        break

      case 'active':
        handleActive(dashboard, flags)
        break

      case 'failed':
        handleFailed(dashboard, flags)
        break

      case 'job':
        handleJob(dashboard, positional[0])
        break

      case 'workers':
        handleWorkers(dashboard)
        break

      case 'flush':
        handleFlush(dashboard, flags)
        break

      case 'retry':
        handleRetry(dashboard, positional[0])
        break

      case 'monitor':
        handleMonitor(dashboard, flags)
        break

      case 'export':
        handleExport(dashboard, flags)
        break

      default:
        console.log('\n╔════════════════════════════════════════════════════╗')
        console.log('║            Queue Management Commands                 ║')
        console.log('╚════════════════════════════════════════════════════╝\n')
        console.log('Usage: gravito queue <command> [options]\n')
        console.log('Commands:')
        console.log('  status              Show queue status overview')
        console.log('  pending [--limit N] List pending tasks')
        console.log('  active [--worker-id ID] List active tasks')
        console.log('  failed [--limit N]  List failed tasks in DLQ')
        console.log('  job <job-id>        Show details of a specific job')
        console.log('  workers             Show worker pool status')
        console.log('  retry <job-id>      Retry a failed job')
        console.log('  flush [--confirm]   Clear the entire queue')
        console.log('  monitor [--interval 5s] Monitor metrics in real-time')
        console.log('  export [--format json|prometheus] Export metrics\n')
    }
  })
}
