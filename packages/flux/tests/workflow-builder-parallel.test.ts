import { describe, expect, it } from 'bun:test'
import { createWorkflow } from '../src'

describe('WorkflowBuilder - Parallel Execution API', () => {
  it('should add parallel steps with unique parallelGroup ID', () => {
    const workflow = createWorkflow('parallel-test')
      .stepParallel([
        { name: 'step1', handler: async () => {} },
        { name: 'step2', handler: async () => {} },
        { name: 'step3', handler: async () => {} },
      ])
      .build()

    expect(workflow.steps).toHaveLength(3)
    expect(workflow.steps[0].parallelGroup).toBe('parallel-0')
    expect(workflow.steps[1].parallelGroup).toBe('parallel-0')
    expect(workflow.steps[2].parallelGroup).toBe('parallel-0')
  })

  it('should support multiple parallel groups', () => {
    const workflow = createWorkflow('multi-parallel-test')
      .stepParallel([
        { name: 'group1-step1', handler: async () => {} },
        { name: 'group1-step2', handler: async () => {} },
      ])
      .step('sequential-step', async () => {})
      .stepParallel([
        { name: 'group2-step1', handler: async () => {} },
        { name: 'group2-step2', handler: async () => {} },
        { name: 'group2-step3', handler: async () => {} },
      ])
      .build()

    expect(workflow.steps).toHaveLength(6)
    expect(workflow.steps[0].parallelGroup).toBe('parallel-0')
    expect(workflow.steps[1].parallelGroup).toBe('parallel-0')
    expect(workflow.steps[2].parallelGroup).toBeUndefined()
    expect(workflow.steps[3].parallelGroup).toBe('parallel-1')
    expect(workflow.steps[4].parallelGroup).toBe('parallel-1')
    expect(workflow.steps[5].parallelGroup).toBe('parallel-1')
  })

  it('should support options for parallel steps', () => {
    const workflow = createWorkflow('parallel-options-test')
      .stepParallel([
        {
          name: 'step1',
          handler: async () => {},
          options: { retries: 5, timeout: 10000 },
        },
        {
          name: 'step2',
          handler: async () => {},
          options: { retries: 3 },
        },
      ])
      .build()

    expect(workflow.steps[0].retries).toBe(5)
    expect(workflow.steps[0].timeout).toBe(10000)
    expect(workflow.steps[1].retries).toBe(3)
    expect(workflow.steps[1].timeout).toBeUndefined()
  })

  it('should support compensate handlers in parallel steps', () => {
    const compensate1 = async () => {}
    const compensate2 = async () => {}

    const workflow = createWorkflow('parallel-compensate-test')
      .stepParallel([
        {
          name: 'step1',
          handler: async () => {},
          options: { compensate: compensate1 },
        },
        {
          name: 'step2',
          handler: async () => {},
          options: { compensate: compensate2 },
        },
      ])
      .build()

    expect(workflow.steps[0].compensate).toBe(compensate1)
    expect(workflow.steps[1].compensate).toBe(compensate2)
  })

  it('should handle empty parallel step array gracefully', () => {
    const workflow = createWorkflow('empty-parallel-test')
      .stepParallel([])
      .step('after', async () => {})
      .build()

    expect(workflow.steps.length).toBe(1)
    expect(workflow.steps[0].name).toBe('after')
  })

  it('should allow mixing sequential and parallel steps', () => {
    const workflow = createWorkflow('mixed-test')
      .step('step1', async () => {})
      .stepParallel([
        { name: 'parallel1', handler: async () => {} },
        { name: 'parallel2', handler: async () => {} },
      ])
      .step('step2', async () => {})
      .build()

    expect(workflow.steps).toHaveLength(4)
    expect(workflow.steps[0].parallelGroup).toBeUndefined()
    expect(workflow.steps[1].parallelGroup).toBe('parallel-0')
    expect(workflow.steps[2].parallelGroup).toBe('parallel-0')
    expect(workflow.steps[3].parallelGroup).toBeUndefined()
  })

  it('should preserve step order within parallel groups', () => {
    const workflow = createWorkflow('order-test')
      .stepParallel([
        { name: 'alpha', handler: async () => {} },
        { name: 'beta', handler: async () => {} },
        { name: 'gamma', handler: async () => {} },
      ])
      .build()

    expect(workflow.steps[0].name).toBe('alpha')
    expect(workflow.steps[1].name).toBe('beta')
    expect(workflow.steps[2].name).toBe('gamma')
  })
})
