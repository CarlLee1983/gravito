import * as os from 'os'
import { FluxEngine } from '../engine/FluxEngine'
import { FluxSilentLogger } from '../logger/FluxLogger'
import type { WorkflowDefinition } from '../types'

export interface ProfileMetrics {
  durationMs: number
  cpuUserMs: number
  cpuSysMs: number
  memDeltaBytes: number
  cpuRatio: number
}

export interface ProfileRecommendation {
  type: 'IO_BOUND' | 'CPU_BOUND' | 'MEMORY_BOUND'
  safeConcurrency: number
  efficientConcurrency: number
  suggestedConcurrency: string
  reason: string
}

/**
 * Workflow Profiler
 *
 * Analyzes workflow performance characteristics to recommend
 * optimal concurrency settings for Consumer workers.
 */
export class WorkflowProfiler {
  constructor(private engine?: FluxEngine) {
    if (!this.engine) {
      // Default minimal engine for profiling (Silent)
      this.engine = new FluxEngine({
        logger: new FluxSilentLogger(),
      })
    }
  }

  /**
   * Run a profile session for a specific workflow
   */
  async profile<TInput>(
    workflow: WorkflowDefinition<TInput, any>,
    input: TInput
  ): Promise<ProfileMetrics> {
    // 1. Warmup (JIT)
    try {
      await this.engine!.execute(workflow, input)
    } catch {}

    // 2. Measure
    if (global.gc) {
      global.gc()
    }

    const startCpu = process.cpuUsage()
    const startMem = process.memoryUsage().heapUsed
    const startTime = process.hrtime.bigint()

    await this.engine!.execute(workflow, input)

    const endTime = process.hrtime.bigint()
    const endCpu = process.cpuUsage(startCpu)
    const endMem = process.memoryUsage().heapUsed

    // 3. Calculate
    const durationNs = Number(endTime - startTime)
    const durationMs = durationNs / 1_000_000
    const cpuUserMs = endCpu.user / 1000
    const cpuSysMs = endCpu.system / 1000
    const totalCpuMs = cpuUserMs + cpuSysMs
    const memDeltaBytes = Math.max(0, endMem - startMem) // Clamp to 0

    // CPU Ratio: How much % of the time was spent on CPU vs Waiting
    const cpuRatio = totalCpuMs / durationMs

    return {
      durationMs,
      cpuUserMs,
      cpuSysMs,
      memDeltaBytes,
      cpuRatio,
    }
  }

  /**
   * Generate recommendations based on metrics and current environment
   */
  recommend(
    metrics: ProfileMetrics,
    config?: { configuredConcurrency?: number }
  ): ProfileRecommendation {
    const totalMem = os.totalmem()
    const cpus = os.cpus().length

    // 1. Analyze Bottleneck Type
    let type: ProfileRecommendation['type'] = 'IO_BOUND'
    if (metrics.cpuRatio > 0.5) {
      type = 'CPU_BOUND'
    } else if (metrics.memDeltaBytes > 50 * 1024 * 1024) {
      // > 50MB per run
      type = 'MEMORY_BOUND'
    }

    // 2. Calculate Limits

    // Memory Limit: Keep 30% buffer for system, divide rest by per-workflow memory
    const safeMem = totalMem * 0.7
    // Use at least 1MB as baseline to avoid division by zero or huge numbers
    const perInstanceMem = Math.max(metrics.memDeltaBytes, 1024 * 1024)
    const maxMemConcurrency = Math.floor(safeMem / perInstanceMem)

    // CPU Limit:
    // If IO Bound (0.2% cpu), we can run many. 100% / 0.2% = 500 tasks per core.
    // We cap efficiency at a reasonable number to avoid Event Loop Lag density.
    const cpuEfficiencyFactor = 1 / Math.max(metrics.cpuRatio, 0.001) // Avoid div by 0
    const maxCpuConcurrency = Math.floor(cpus * cpuEfficiencyFactor)

    // 3. Synthesize Recommendation
    const safe = Math.min(maxMemConcurrency, 200) // Hard cap at 200 for sanity
    let efficient = Math.min(maxCpuConcurrency, 200)

    // If CPU bound, strict limit based on cores
    if (type === 'CPU_BOUND') {
      efficient = cpus // 1:1 mapping is best for CPU bound
    }

    const recommended = Math.min(safe, efficient)

    let reason = ''
    if (type === 'IO_BOUND') {
      reason = `Workflow is I/O intensive (CPU usage ${(metrics.cpuRatio * 100).toFixed(1)}%). It is safe to run high concurrency up to ${recommended}.`
    } else if (type === 'CPU_BOUND') {
      reason = `Workflow is CPU intensive. Limiting concurrency to match CPU cores (${cpus}) is recommended to prevent blocking.`
    } else {
      reason = `Workflow consumes significant memory (${(metrics.memDeltaBytes / 1024 / 1024).toFixed(1)}MB). Concurrency limited by available RAM.`
    }

    if (config?.configuredConcurrency && config.configuredConcurrency > recommended) {
      reason += ` \n⚠️ Warning: Your current setting (${config.configuredConcurrency}) exceeds the recommended limit (${recommended}).`
    }

    return {
      type,
      safeConcurrency: safe,
      efficientConcurrency: efficient,
      suggestedConcurrency: `${Math.max(1, Math.floor(recommended * 0.5))} - ${recommended}`,
      reason,
    }
  }
}
