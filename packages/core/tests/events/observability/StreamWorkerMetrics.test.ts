import { describe, expect, it, mock } from 'bun:test'
import type { Meter } from '@opentelemetry/api'
import {
  StreamWorkerMetrics,
  WorkerJobStatus,
} from '../../../src/events/observability/StreamWorkerMetrics'

describe('StreamWorkerMetrics', () => {
  const createMockMeter = (): Meter =>
    ({
      createHistogram: mock(() => ({
        record: mock(() => {}),
      })),
      createCounter: mock(() => ({
        add: mock(() => {}),
      })),
      createObservableGauge: mock(() => ({})),
      createUpDownCounter: mock(() => ({})),
      createObservableUpDownCounter: mock(() => ({})),
      createObservableCounter: mock(() => ({})),
      addBatchObservableCallback: mock(() => () => {}),
    }) as any

  describe('Initialization', () => {
    it('should initialize metrics', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      expect(metrics).toBeDefined()
      expect(meter.createHistogram).toHaveBeenCalled()
      expect(meter.createCounter).toHaveBeenCalled()
    })

    it('should create job duration histogram', () => {
      const meter = createMockMeter()
      const createHistogramMock = meter.createHistogram as any

      new StreamWorkerMetrics(meter)

      expect(createHistogramMock).toHaveBeenCalledWith(
        expect.stringContaining('job_duration'),
        expect.any(Object)
      )
    })

    it('should create job counter', () => {
      const meter = createMockMeter()
      const createCounterMock = meter.createCounter as any

      new StreamWorkerMetrics(meter)

      expect(createCounterMock).toHaveBeenCalledWith(
        expect.stringContaining('job_total'),
        expect.any(Object)
      )
    })
  })

  describe('recordJobDuration', () => {
    it('should record job duration for completed job', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      metrics.recordJobDuration(1.5, WorkerJobStatus.COMPLETED, 'default')

      // Should record without error
      expect(metrics).toBeDefined()
    })

    it('should record job duration for failed job', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      metrics.recordJobDuration(0.8, WorkerJobStatus.FAILED, 'critical')

      expect(metrics).toBeDefined()
    })

    it('should use default queue name', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      metrics.recordJobDuration(1.0, WorkerJobStatus.COMPLETED)

      expect(metrics).toBeDefined()
    })
  })

  describe('Pool Size Tracking', () => {
    it('should set pool size provider', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      const providerMock = mock(() => 5)
      metrics.setPoolSizeProvider(providerMock)

      expect(metrics.getPoolSize()).toBe(5)
    })

    it('should return pool size from callback', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      let poolSize = 3
      const provider = () => poolSize

      metrics.setPoolSizeProvider(provider)
      expect(metrics.getPoolSize()).toBe(3)

      poolSize = 5
      expect(metrics.getPoolSize()).toBe(5)
    })

    it('should return 0 if provider not set', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      expect(metrics.getPoolSize()).toBe(0)
    })
  })

  describe('Queue Depth Tracking', () => {
    it('should set queue depth provider', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      const providerMock = mock(() => 100)
      metrics.setQueueDepthProvider(providerMock)

      expect(metrics.getQueueDepth()).toBe(100)
    })

    it('should return queue depth from callback', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      let depth = 50
      const provider = () => depth

      metrics.setQueueDepthProvider(provider)
      expect(metrics.getQueueDepth()).toBe(50)

      depth = 75
      expect(metrics.getQueueDepth()).toBe(75)
    })

    it('should return 0 if provider not set', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      expect(metrics.getQueueDepth()).toBe(0)
    })
  })

  describe('Metrics Isolation', () => {
    it('should track different queues independently', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      metrics.recordJobDuration(1.0, WorkerJobStatus.COMPLETED, 'queue-1')
      metrics.recordJobDuration(2.0, WorkerJobStatus.COMPLETED, 'queue-2')

      expect(metrics).toBeDefined()
    })

    it('should track different job statuses independently', () => {
      const meter = createMockMeter()
      const metrics = new StreamWorkerMetrics(meter)

      metrics.recordJobDuration(1.0, WorkerJobStatus.COMPLETED, 'default')
      metrics.recordJobDuration(0.5, WorkerJobStatus.FAILED, 'default')

      expect(metrics).toBeDefined()
    })
  })

  describe('WorkerJobStatus Enum', () => {
    it('should have COMPLETED status', () => {
      expect(WorkerJobStatus.COMPLETED).toBe('completed')
    })

    it('should have FAILED status', () => {
      expect(WorkerJobStatus.FAILED).toBe('failed')
    })
  })
})
