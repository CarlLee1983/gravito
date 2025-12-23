/**
 * @fileoverview Tests for @gravito/flux
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { createWorkflow, FluxEngine, MemoryStorage, StateMachine } from '../src'

// ─────────────────────────────────────────────────────────────
// StateMachine Tests
// ─────────────────────────────────────────────────────────────

describe('StateMachine', () => {
  it('should start with pending status', () => {
    const sm = new StateMachine()
    expect(sm.status).toBe('pending')
  })

  it('should transition from pending to running', () => {
    const sm = new StateMachine()
    sm.transition('running')
    expect(sm.status).toBe('running')
  })

  it('should transition from running to completed', () => {
    const sm = new StateMachine()
    sm.transition('running')
    sm.transition('completed')
    expect(sm.status).toBe('completed')
  })

  it('should reject invalid transition', () => {
    const sm = new StateMachine()
    expect(() => sm.transition('completed')).toThrow()
  })

  it('should identify terminal states', () => {
    const sm = new StateMachine()
    expect(sm.isTerminal()).toBe(false)

    sm.transition('running')
    sm.transition('completed')
    expect(sm.isTerminal()).toBe(true)
  })

  it('should emit transition events', () => {
    const sm = new StateMachine()
    let eventFired = false

    sm.addEventListener('transition', () => {
      eventFired = true
    })

    sm.transition('running')
    expect(eventFired).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// WorkflowBuilder Tests
// ─────────────────────────────────────────────────────────────

describe('WorkflowBuilder', () => {
  it('should create empty workflow', () => {
    const builder = createWorkflow('test')
    expect(builder.name).toBe('test')
    expect(builder.stepCount).toBe(0)
  })

  it('should add steps', () => {
    const builder = createWorkflow('test')
      .step('step1', async () => {})
      .step('step2', async () => {})

    expect(builder.stepCount).toBe(2)
  })

  it('should build workflow definition', () => {
    const def = createWorkflow('test')
      .step('step1', async () => {})
      .build()

    expect(def.name).toBe('test')
    expect(def.steps).toHaveLength(1)
    expect(def.steps[0]?.name).toBe('step1')
  })

  it('should throw on empty workflow build', () => {
    expect(() => createWorkflow('empty').build()).toThrow()
  })

  it('should mark commit steps', () => {
    const def = createWorkflow('test')
      .step('normal', async () => {})
      .commit('commit', async () => {})
      .build()

    expect(def.steps[0]?.commit).toBe(false)
    expect(def.steps[1]?.commit).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// MemoryStorage Tests
// ─────────────────────────────────────────────────────────────

describe('MemoryStorage', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('should save and load state', async () => {
    const state = {
      id: 'test-1',
      name: 'test-workflow',
      status: 'running' as const,
      input: { foo: 'bar' },
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await storage.save(state)
    const loaded = await storage.load('test-1')

    expect(loaded).not.toBeNull()
    expect(loaded?.id).toBe('test-1')
    expect(loaded?.name).toBe('test-workflow')
  })

  it('should return null for non-existent state', async () => {
    const loaded = await storage.load('non-existent')
    expect(loaded).toBeNull()
  })

  it('should list states with filter', async () => {
    await storage.save({
      id: '1',
      name: 'workflow-a',
      status: 'completed',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await storage.save({
      id: '2',
      name: 'workflow-b',
      status: 'running',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const completed = await storage.list({ status: 'completed' })
    expect(completed).toHaveLength(1)
    expect(completed[0]?.id).toBe('1')
  })

  it('should delete state', async () => {
    await storage.save({
      id: 'delete-me',
      name: 'test',
      status: 'pending',
      input: {},
      data: {},
      currentStep: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await storage.delete('delete-me')
    expect(await storage.load('delete-me')).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────
// FluxEngine Tests
// ─────────────────────────────────────────────────────────────

describe('FluxEngine', () => {
  it('should execute simple workflow', async () => {
    const engine = new FluxEngine()

    const workflow = createWorkflow('simple')
      .input<{ value: number }>()
      .step('double', (ctx) => {
        ctx.data.result = ctx.input.value * 2
      })

    const result = await engine.execute(workflow, { value: 5 })

    expect(result.status).toBe('completed')
    expect(result.data.result).toBe(10)
  })

  it('should execute multi-step workflow', async () => {
    const engine = new FluxEngine()

    const workflow = createWorkflow('multi')
      .input<{ numbers: number[] }>()
      .step('sum', (ctx) => {
        ctx.data.sum = ctx.input.numbers.reduce((a, b) => a + b, 0)
      })
      .step('average', (ctx) => {
        ctx.data.avg = (ctx.data.sum as number) / ctx.input.numbers.length
      })

    const result = await engine.execute(workflow, { numbers: [1, 2, 3, 4, 5] })

    expect(result.status).toBe('completed')
    expect(result.data.sum).toBe(15)
    expect(result.data.avg).toBe(3)
  })

  it('should handle step failure', async () => {
    const engine = new FluxEngine({
      defaultRetries: 0,
    })

    const workflow = createWorkflow('failing').step('fail', () => {
      throw new Error('Intentional failure')
    })

    const result = await engine.execute(workflow, {})

    expect(result.status).toBe('failed')
    expect(result.error?.message).toBe('Intentional failure')
  })

  it('should track execution history', async () => {
    const engine = new FluxEngine()

    const workflow = createWorkflow('history')
      .step('step1', () => {})
      .step('step2', () => {})

    const result = await engine.execute(workflow, {})

    expect(result.history).toHaveLength(2)
    expect(result.history[0]?.status).toBe('completed')
    expect(result.history[1]?.status).toBe('completed')
  })

  it('should call event handlers', async () => {
    let stepStartCalled = false
    let workflowCompleteCalled = false

    const engine = new FluxEngine({
      on: {
        stepStart: () => {
          stepStartCalled = true
        },
        workflowComplete: () => {
          workflowCompleteCalled = true
        },
      },
    })

    const workflow = createWorkflow('events').step('test', () => {})

    await engine.execute(workflow, {})

    expect(stepStartCalled).toBe(true)
    expect(workflowCompleteCalled).toBe(true)
  })
})
