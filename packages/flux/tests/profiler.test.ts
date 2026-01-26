import { describe, expect, it } from 'bun:test'
import { createWorkflow } from '../src'
import { WorkflowProfiler } from '../src/profiler/WorkflowProfiler'
import type { WorkflowContext } from '../src/types'

describe('WorkflowProfiler', () => {
  it('should profile a simple workflow', async () => {
    const profiler = new WorkflowProfiler()
    const workflow = createWorkflow('profile-test')
      .step('noop', (_ctx: WorkflowContext) => {})
      .build()

    const metrics = await profiler.profile(workflow, {})

    expect(metrics.durationMs).toBeGreaterThan(0)
    expect(metrics.cpuUserMs).toBeDefined()
    expect(metrics.memDeltaBytes).toBeDefined()
  })

  it('should generate recommendations', async () => {
    const profiler = new WorkflowProfiler()
    const metrics = {
      durationMs: 100,
      cpuUserMs: 10,
      cpuSysMs: 5,
      memDeltaBytes: 1024,
      cpuRatio: 0.15,
    }

    const advice = profiler.recommend(metrics)

    expect(advice.type).toBe('IO_BOUND')
    expect(advice.safeConcurrency).toBeGreaterThan(0)
    expect(advice.suggestedConcurrency).toBeDefined()
  })

  it('should identify CPU bound workflows', async () => {
    const profiler = new WorkflowProfiler()
    const metrics = {
      durationMs: 100,
      cpuUserMs: 80,
      cpuSysMs: 5,
      memDeltaBytes: 1024,
      cpuRatio: 0.85,
    }

    const advice = profiler.recommend(metrics)

    expect(advice.type).toBe('CPU_BOUND')
  })
})
