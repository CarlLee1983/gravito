import { bench, describe } from 'vitest'
import { LogBuffer } from '../src/bridges/LogBuffer'
import { LogSampler } from '../src/utils/LogSampler'
import { ProtobufSerializer } from '../src/utils/Serializer'

describe('LogBuffer Add Operation', () => {
  const mockRedis = {
    pipeline: () => ({
      publish: () => ({}),
      lpush: () => ({}),
      ltrim: () => ({}),
      exec: async () => [],
    }),
  } as any

  const sampleLog = {
    level: 'info' as const,
    message: 'Job completed successfully',
    jobId: 'job-123',
    timestamp: new Date().toISOString(),
    context: { foo: 'bar' },
  }

  const defaultBuffer = new LogBuffer(mockRedis, 'test:', {
    batchSize: 10000,
    flushInterval: 100000,
  })

  const protobufBuffer = new LogBuffer(mockRedis, 'test:', {
    batchSize: 10000,
    flushInterval: 100000,
    serializer: new ProtobufSerializer(),
  })

  const samplingBuffer = new LogBuffer(mockRedis, 'test:', {
    batchSize: 10000,
    flushInterval: 100000,
    sampler: new LogSampler({ rate: 0.1, threshold: 0 }),
  })

  bench('LogBuffer.add - Default (JSON)', () => {
    defaultBuffer.add(sampleLog)
  })

  bench('LogBuffer.add - Protobuf', () => {
    protobufBuffer.add(sampleLog)
  })

  const largeLog = {
    level: 'info' as const,
    message: 'Job completed successfully',
    jobId: 'job-123',
    timestamp: new Date().toISOString(),
    context: {
      foo: 'bar',
      data: 'a'.repeat(1024 * 10),
      error: 'b'.repeat(1024 * 10),
    },
  }

  bench('LogBuffer.add - Default (JSON) - Large', () => {
    defaultBuffer.add(largeLog)
  })

  bench('LogBuffer.add - With Sampling - Large', () => {
    samplingBuffer.add(largeLog)
  })
})
