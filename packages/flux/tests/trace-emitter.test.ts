import { describe, expect, it, jest } from 'bun:test'
import { TraceEmitter } from '../src/engine/TraceEmitter'
import type { FluxTraceEvent, FluxTraceSink, WorkflowContext } from '../src/types'

describe('TraceEmitter', () => {
  const createMockContext = (overrides: Partial<WorkflowContext> = {}): WorkflowContext => ({
    id: 'wf-123',
    name: 'test-workflow',
    input: { orderId: '456' },
    data: { step1Result: 'done' },
    status: 'running',
    currentStep: 0,
    history: [],
    version: 1,
    ...overrides,
  })

  const createMockSink = (): FluxTraceSink & { events: FluxTraceEvent[] } => {
    const events: FluxTraceEvent[] = []
    return {
      events,
      emit: jest.fn(async (event: FluxTraceEvent) => {
        events.push(event)
      }),
    }
  }

  describe('constructor', () => {
    it('should create without a sink', () => {
      const emitter = new TraceEmitter()
      expect(emitter).toBeDefined()
    })

    it('should create with a sink', () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      expect(emitter).toBeDefined()
    })
  })

  describe('emit', () => {
    it('should emit event to sink', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)

      const event: FluxTraceEvent = {
        type: 'workflow:start',
        timestamp: Date.now(),
        workflowId: 'wf-1',
        workflowName: 'test',
        status: 'running',
      }

      await emitter.emit(event)
      expect(sink.emit).toHaveBeenCalledWith(event)
      expect(sink.events).toHaveLength(1)
    })

    it('should silently handle missing sink', async () => {
      const emitter = new TraceEmitter()

      // 不應拋出錯誤
      await emitter.emit({
        type: 'workflow:start',
        timestamp: Date.now(),
        workflowId: 'wf-1',
        workflowName: 'test',
        status: 'running',
      })
    })

    it('should silently catch sink errors', async () => {
      const errorSink: FluxTraceSink = {
        emit: jest.fn(() => {
          throw new Error('Sink failure')
        }),
      }
      const emitter = new TraceEmitter(errorSink)

      // 不應拋出錯誤
      await emitter.emit({
        type: 'workflow:start',
        timestamp: Date.now(),
        workflowId: 'wf-1',
        workflowName: 'test',
        status: 'running',
      })
    })
  })

  describe('workflowStart', () => {
    it('should emit workflow:start event', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext()

      await emitter.workflowStart(ctx)

      expect(sink.events).toHaveLength(1)
      const event = sink.events[0]
      expect(event.type).toBe('workflow:start')
      expect(event.workflowId).toBe('wf-123')
      expect(event.workflowName).toBe('test-workflow')
      expect(event.status).toBe('running')
      expect(event.input).toEqual({ orderId: '456' })
      expect(event.timestamp).toBeGreaterThan(0)
    })
  })

  describe('workflowComplete', () => {
    it('should emit workflow:complete event with duration', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext({ status: 'completed' })

      await emitter.workflowComplete(ctx, 1500)

      expect(sink.events).toHaveLength(1)
      const event = sink.events[0]
      expect(event.type).toBe('workflow:complete')
      expect(event.workflowId).toBe('wf-123')
      expect(event.status).toBe('completed')
      expect(event.duration).toBe(1500)
      expect(event.data).toEqual({ step1Result: 'done' })
    })
  })

  describe('workflowError', () => {
    it('should emit workflow:error event with error message', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext({ status: 'failed' })
      const error = new Error('Database connection failed')

      await emitter.workflowError(ctx, error, 2000)

      expect(sink.events).toHaveLength(1)
      const event = sink.events[0]
      expect(event.type).toBe('workflow:error')
      expect(event.workflowId).toBe('wf-123')
      expect(event.workflowName).toBe('test-workflow')
      expect(event.status).toBe('failed')
      expect(event.duration).toBe(2000)
      expect(event.error).toBe('Database connection failed')
    })

    it('should handle error with empty message', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext()

      await emitter.workflowError(ctx, new Error(''), 100)

      const event = sink.events[0]
      expect(event.error).toBe('')
    })
  })

  describe('stepStart', () => {
    it('should emit step:start event', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext()

      await emitter.stepStart(ctx, 'validate-order', 0, false)

      const event = sink.events[0]
      expect(event.type).toBe('step:start')
      expect(event.stepName).toBe('validate-order')
      expect(event.stepIndex).toBe(0)
      expect(event.commit).toBe(false)
      expect(event.status).toBe('running')
    })

    it('should mark commit steps', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext()

      await emitter.stepStart(ctx, 'send-notification', 2, true)

      const event = sink.events[0]
      expect(event.commit).toBe(true)
    })
  })

  describe('stepComplete', () => {
    it('should emit step:complete event with duration', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext()

      await emitter.stepComplete(ctx, 'process-payment', 1, {
        success: true,
        duration: 350,
      })

      const event = sink.events[0]
      expect(event.type).toBe('step:complete')
      expect(event.stepName).toBe('process-payment')
      expect(event.stepIndex).toBe(1)
      expect(event.duration).toBe(350)
      expect(event.status).toBe('completed')
    })
  })

  describe('stepError', () => {
    it('should emit step:error event with error info', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext()

      await emitter.stepError(ctx, 'charge-card', 2, {
        success: false,
        error: new Error('Insufficient funds'),
        duration: 500,
      })

      const event = sink.events[0]
      expect(event.type).toBe('step:error')
      expect(event.stepName).toBe('charge-card')
      expect(event.stepIndex).toBe(2)
      expect(event.duration).toBe(500)
      expect(event.error).toBe('Insufficient funds')
      expect(event.status).toBe('failed')
    })

    it('should handle step error without error object', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext()

      await emitter.stepError(ctx, 'step', 0, {
        success: false,
        duration: 100,
      })

      const event = sink.events[0]
      expect(event.error).toBeUndefined()
    })
  })

  describe('stepSuspended', () => {
    it('should emit step:suspend event with signal name', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext()

      await emitter.stepSuspended(ctx, 'approval-gate', 1, 'manager-approval')

      const event = sink.events[0]
      expect(event.type).toBe('step:suspend')
      expect(event.stepName).toBe('approval-gate')
      expect(event.stepIndex).toBe(1)
      expect(event.meta).toEqual({ signal: 'manager-approval' })
    })
  })

  describe('stepCompensate', () => {
    it('should emit step:compensate event', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext()

      await emitter.stepCompensate(ctx, 'reserve-inventory', 0)

      const event = sink.events[0]
      expect(event.type).toBe('step:compensate')
      expect(event.stepName).toBe('reserve-inventory')
      expect(event.stepIndex).toBe(0)
      expect(event.status).toBe('compensated')
    })
  })

  describe('full workflow lifecycle trace', () => {
    it('should trace a complete workflow execution', async () => {
      const sink = createMockSink()
      const emitter = new TraceEmitter(sink)
      const ctx = createMockContext()

      await emitter.workflowStart(ctx)
      await emitter.stepStart(ctx, 'step1', 0, false)
      await emitter.stepComplete(ctx, 'step1', 0, { success: true, duration: 100 })
      await emitter.stepStart(ctx, 'step2', 1, true)
      await emitter.stepComplete(ctx, 'step2', 1, { success: true, duration: 200 })
      await emitter.workflowComplete(ctx, 300)

      expect(sink.events).toHaveLength(6)
      expect(sink.events.map((e) => e.type)).toEqual([
        'workflow:start',
        'step:start',
        'step:complete',
        'step:start',
        'step:complete',
        'workflow:complete',
      ])
    })
  })
})
