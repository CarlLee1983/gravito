import { beforeEach, describe, expect, it } from 'bun:test'
import { DataOptimizer, type DataReference } from '../src/core/DataOptimizer'

describe('DataOptimizer', () => {
  let optimizer: DataOptimizer

  beforeEach(() => {
    optimizer = new DataOptimizer({ threshold: 1024 }) // 1KB for testing
  })

  describe('estimateSize', () => {
    it('should estimate size of simple objects', () => {
      const data = { key: 'value' }
      const size = DataOptimizer.estimateSize(data)
      expect(size).toBeGreaterThan(0)
    })

    it('should estimate size of large objects', () => {
      const small = { key: 'value' }
      const large = { key: 'x'.repeat(10000) }
      expect(DataOptimizer.estimateSize(large)).toBeGreaterThan(DataOptimizer.estimateSize(small))
    })

    it('should handle non-serializable data gracefully', () => {
      const circular: any = { a: 1 }
      circular.self = circular
      const size = DataOptimizer.estimateSize(circular)
      expect(size).toBe(Number.MAX_SAFE_INTEGER)
    })
  })

  describe('optimizeForStorage', () => {
    it('should keep small data unchanged', () => {
      const data = { small: 'hello world' }
      const result = optimizer.optimizeForStorage(data)
      expect(result.small).toBe('hello world')
    })

    it('should convert large data to references', () => {
      const largeData = 'x'.repeat(2000) // 2KB, exceeds 1KB threshold
      const data = { large: largeData }
      const result = optimizer.optimizeForStorage(data)

      expect(optimizer.isReference(result.large)).toBe(true)
      const ref = result.large as DataReference
      expect(ref.__ref).toBe(true)
      expect(ref.id).toBeDefined()
      expect(ref.location).toBe('database')
      expect(ref.size).toBeGreaterThan(1024)
    })

    it('should handle mixed small and large data', () => {
      const data = {
        small: 'tiny',
        large: 'x'.repeat(5000), // 5KB
        medium: 'abc',
      }
      const result = optimizer.optimizeForStorage(data)

      expect(result.small).toBe('tiny')
      expect(result.medium).toBe('abc')
      expect(optimizer.isReference(result.large)).toBe(true)
    })

    it('should skip null and undefined values', () => {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        valid: 'test',
      }
      const result = optimizer.optimizeForStorage(data)

      expect(result.nullValue).toBeNull()
      expect(result.undefinedValue).toBeUndefined()
      expect(result.valid).toBe('test')
    })

    it('should not double-reference already converted data', () => {
      const ref: DataReference = {
        __ref: true,
        id: 'existing-ref',
        location: 'redis',
        size: 5000,
      }
      const data = { alreadyRef: ref }
      const result = optimizer.optimizeForStorage(data)

      expect(result.alreadyRef).toBe(ref)
    })

    it('should use custom threshold when provided', () => {
      const data = { value: 'x'.repeat(500) } // 500 bytes
      const result = optimizer.optimizeForStorage(data, 100) // 100 byte threshold

      expect(optimizer.isReference(result.value)).toBe(true)
    })
  })

  describe('isReference', () => {
    it('should identify valid references', () => {
      const ref: DataReference = {
        __ref: true,
        id: 'test',
        location: 'database',
        size: 1000,
      }
      expect(optimizer.isReference(ref)).toBe(true)
    })

    it('should reject non-reference objects', () => {
      expect(optimizer.isReference({ key: 'value' })).toBe(false)
      expect(optimizer.isReference({ __ref: false })).toBe(false)
      expect(optimizer.isReference(null)).toBe(false)
      expect(optimizer.isReference(undefined)).toBe(false)
      expect(optimizer.isReference('string')).toBe(false)
    })
  })

  describe('resolveReferences', () => {
    it('should keep non-reference data unchanged', async () => {
      const data = { key: 'value', num: 42 }
      const result = await optimizer.resolveReferences(data)

      expect(result.key).toBe('value')
      expect(result.num).toBe(42)
    })

    it('should load data from references with loaders', async () => {
      const mockData = { actual: 'loaded data' }
      const ref: DataReference = {
        __ref: true,
        id: 'test-ref',
        location: 'database',
        size: 1000,
        load: async () => mockData,
      }
      const data = { refValue: ref }
      const result = await optimizer.resolveReferences(data)

      expect(result.refValue).toBe(mockData)
    })

    it('should keep references without loaders unchanged', async () => {
      const ref: DataReference = {
        __ref: true,
        id: 'no-loader',
        location: 'database',
        size: 1000,
      }
      const data = { refValue: ref }
      const result = await optimizer.resolveReferences(data)

      expect(result.refValue).toBe(ref)
    })
  })

  describe('getOptimizationStats', () => {
    it('should calculate size reduction correctly', () => {
      const original = { large: 'x'.repeat(10000) }
      const optimized = optimizer.optimizeForStorage(original)
      const stats = optimizer.getOptimizationStats(original, optimized)

      expect(stats.originalSize).toBeGreaterThan(10000)
      expect(stats.optimizedSize).toBeLessThan(stats.originalSize)
      expect(stats.reduction).toBeGreaterThan(90) // Should reduce by >90%
      expect(stats.referencesCreated).toBe(1)
    })

    it('should report zero reduction when no optimization occurred', () => {
      const original = { small: 'tiny' }
      const optimized = optimizer.optimizeForStorage(original)
      const stats = optimizer.getOptimizationStats(original, optimized)

      expect(stats.originalSize).toBe(stats.optimizedSize)
      expect(stats.reduction).toBe(0)
      expect(stats.referencesCreated).toBe(0)
    })

    it('should count multiple references', () => {
      const original = {
        large1: 'x'.repeat(5000),
        large2: 'y'.repeat(5000),
        small: 'tiny',
      }
      const optimized = optimizer.optimizeForStorage(original)
      const stats = optimizer.getOptimizationStats(original, optimized)

      expect(stats.referencesCreated).toBe(2)
    })
  })

  describe('configuration', () => {
    it('should use default threshold when not provided', () => {
      const defaultOptimizer = new DataOptimizer()
      const data = { value: 'x'.repeat(9000) } // 9KB
      const result = defaultOptimizer.optimizeForStorage(data)

      // Default is 10KB, so 9KB should NOT be converted
      expect(defaultOptimizer.isReference(result.value)).toBe(false)
    })

    it('should use custom default location', () => {
      const s3Optimizer = new DataOptimizer({
        threshold: 100,
        defaultLocation: 's3',
      })
      const data = { value: 'x'.repeat(500) }
      const result = s3Optimizer.optimizeForStorage(data)

      const ref = result.value as DataReference
      expect(ref.location).toBe('s3')
    })
  })

  describe('real-world scenarios', () => {
    it('should optimize workflow context with large order data', () => {
      const workflowData = {
        orderId: '123',
        customer: { name: 'John', email: 'john@example.com' },
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Product ${i}`,
          price: Math.random() * 100,
          description: 'x'.repeat(200), // Large product descriptions
        })),
      }

      const optimized = optimizer.optimizeForStorage(workflowData)

      expect(optimized.orderId).toBe('123')
      expect(optimized.customer).toEqual(workflowData.customer)
      expect(optimizer.isReference(optimized.items)).toBe(true)
    })

    it('should handle buffer data', () => {
      const data = {
        smallBuffer: Buffer.from('hello'),
        largeBuffer: Buffer.alloc(10000),
      }
      const optimized = optimizer.optimizeForStorage(data)

      expect(optimizer.isReference(optimized.largeBuffer)).toBe(true)
    })
  })
})
