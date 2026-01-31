import { beforeEach, describe, expect, it } from 'bun:test'
import { type Patch, StateDiff } from '../src/storage/StateDiff'
import type { WorkflowState } from '../src/types'

describe('StateDiff', () => {
  let differ: StateDiff
  let baseState: WorkflowState

  beforeEach(() => {
    differ = new StateDiff()
    baseState = {
      id: 'wf-123',
      name: 'test-workflow',
      status: 'pending',
      input: { userId: '456' },
      data: { count: 0 },
      currentStep: 0,
      history: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      version: 1,
    }
  })

  describe('diff', () => {
    it('should return empty patch for identical states', () => {
      const patch = differ.diff(baseState, baseState)
      expect(patch).toEqual([])
    })

    it('should detect simple property changes', () => {
      const nextState = { ...baseState, status: 'running' as const }
      const patch = differ.diff(baseState, nextState)

      expect(patch).toContainEqual({
        op: 'replace',
        path: '/status',
        value: 'running',
      })
    })

    it('should detect multiple property changes', () => {
      const nextState = {
        ...baseState,
        status: 'running' as const,
        currentStep: 1,
        version: 2,
      }
      const patch = differ.diff(baseState, nextState)

      expect(patch.length).toBe(3)
      expect(patch).toContainEqual({ op: 'replace', path: '/status', value: 'running' })
      expect(patch).toContainEqual({ op: 'replace', path: '/currentStep', value: 1 })
      expect(patch).toContainEqual({ op: 'replace', path: '/version', value: 2 })
    })

    it('should detect nested property changes', () => {
      const nextState = {
        ...baseState,
        data: { count: 5 },
      }
      const patch = differ.diff(baseState, nextState)

      expect(patch).toContainEqual({
        op: 'replace',
        path: '/data/count',
        value: 5,
      })
    })

    it('should detect new property additions', () => {
      const nextState = {
        ...baseState,
        data: { count: 0, newField: 'added' },
      }
      const patch = differ.diff(baseState, nextState)

      expect(patch).toContainEqual({
        op: 'add',
        path: '/data/newField',
        value: 'added',
      })
    })

    it('should detect property removals', () => {
      const prevState = {
        ...baseState,
        data: { count: 0, toRemove: 'delete me' },
      }
      const nextState = {
        ...baseState,
        data: { count: 0 },
      }
      const patch = differ.diff(prevState, nextState)

      expect(patch).toContainEqual({
        op: 'remove',
        path: '/data/toRemove',
      })
    })

    it('should handle array changes by replacing entire array', () => {
      const nextState = {
        ...baseState,
        history: [
          {
            name: 'step1',
            status: 'completed' as const,
            retries: 0,
          },
        ],
      }
      const patch = differ.diff(baseState, nextState)

      expect(patch).toContainEqual({
        op: 'replace',
        path: '/history',
        value: nextState.history,
      })
    })

    it('should handle Date objects', () => {
      const nextState = {
        ...baseState,
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }
      const patch = differ.diff(baseState, nextState)

      expect(patch).toContainEqual({
        op: 'replace',
        path: '/updatedAt',
        value: nextState.updatedAt,
      })
    })

    it('should handle special characters in property names', () => {
      const prevState = {
        ...baseState,
        data: { 'path/with~slash': 'value' },
      }
      const nextState = {
        ...baseState,
        data: { 'path/with~slash': 'changed' },
      }
      const patch = differ.diff(prevState, nextState)

      expect(patch[0].path).toContain('~1')
      expect(patch[0].path).toContain('~0')
    })
  })

  describe('apply', () => {
    it('should apply replace operations', () => {
      const patch: Patch = [{ op: 'replace', path: '/status', value: 'running' }]
      const result = differ.apply(baseState, patch)

      expect(result.status).toBe('running')
      expect(result.id).toBe(baseState.id)
    })

    it('should apply multiple operations in order', () => {
      const patch: Patch = [
        { op: 'replace', path: '/status', value: 'running' },
        { op: 'replace', path: '/currentStep', value: 1 },
        { op: 'replace', path: '/data/count', value: 10 },
      ]
      const result = differ.apply(baseState, patch)

      expect(result.status).toBe('running')
      expect(result.currentStep).toBe(1)
      expect(result.data.count).toBe(10)
    })

    it('should apply add operations', () => {
      const patch: Patch = [{ op: 'add', path: '/data/newField', value: 'added' }]
      const result = differ.apply(baseState, patch)

      expect(result.data).toHaveProperty('newField', 'added')
    })

    it('should apply remove operations', () => {
      const state = {
        ...baseState,
        data: { count: 0, toRemove: 'value' },
      }
      const patch: Patch = [{ op: 'remove', path: '/data/toRemove' }]
      const result = differ.apply(state, patch)

      expect(result.data).not.toHaveProperty('toRemove')
    })

    it('should apply move operations', () => {
      const state = {
        ...baseState,
        data: { source: 'value', dest: null },
      }
      const patch: Patch = [{ op: 'move', from: '/data/source', path: '/data/dest' }]
      const result = differ.apply(state, patch)

      expect(result.data).not.toHaveProperty('source')
      expect(result.data.dest).toBe('value')
    })

    it('should apply copy operations', () => {
      const state = {
        ...baseState,
        data: { source: 'value' },
      }
      const patch: Patch = [{ op: 'copy', from: '/data/source', path: '/data/dest' }]
      const result = differ.apply(state, patch)

      expect(result.data.source).toBe('value')
      expect(result.data.dest).toBe('value')
    })

    it('should apply test operations and pass when values match', () => {
      const patch: Patch = [{ op: 'test', path: '/status', value: 'pending' }]
      expect(() => differ.apply(baseState, patch)).not.toThrow()
    })

    it('should throw error when test operation fails', () => {
      const patch: Patch = [{ op: 'test', path: '/status', value: 'running' }]
      expect(() => differ.apply(baseState, patch)).toThrow(/Test operation failed/)
    })

    it('should not mutate original state', () => {
      const patch: Patch = [{ op: 'replace', path: '/status', value: 'running' }]
      const original = { ...baseState }
      differ.apply(baseState, patch)

      expect(baseState).toEqual(original)
    })
  })

  describe('roundtrip (diff + apply)', () => {
    it('should reconstruct next state from prev + patch', () => {
      const nextState = {
        ...baseState,
        status: 'running' as const,
        currentStep: 2,
        data: { count: 100, processed: true },
        version: 3,
      }

      const patch = differ.diff(baseState, nextState)
      const reconstructed = differ.apply(baseState, patch)

      expect(reconstructed).toEqual(nextState)
    })

    it('should handle complex workflow state changes', () => {
      const nextState: WorkflowState = {
        ...baseState,
        status: 'completed',
        currentStep: 3,
        data: {
          count: 100,
          results: [1, 2, 3],
          nested: { deep: { value: 42 } },
        },
        history: [
          { name: 'step1', status: 'completed', retries: 0 },
          { name: 'step2', status: 'completed', retries: 1 },
        ],
        completedAt: new Date('2026-01-01T01:00:00Z'),
        version: 4,
      }

      const patch = differ.diff(baseState, nextState)
      const reconstructed = differ.apply(baseState, patch)

      expect(reconstructed).toEqual(nextState)
    })
  })

  describe('getPatchStats', () => {
    it('should calculate size reduction correctly', () => {
      const nextState = {
        ...baseState,
        status: 'running' as const,
      }
      const patch = differ.diff(baseState, nextState)
      const stats = differ.getPatchStats(baseState, patch)

      expect(stats.fullSize).toBeGreaterThan(0)
      expect(stats.patchSize).toBeGreaterThan(0)
      expect(stats.patchSize).toBeLessThan(stats.fullSize)
      expect(stats.reduction).toBeGreaterThan(0)
      expect(stats.operationCount).toBe(patch.length)
    })

    it('should show significant reduction for large state with small changes', () => {
      const largeState = {
        ...baseState,
        data: {
          largeArray: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            data: 'x'.repeat(100),
          })),
        },
      }
      const nextState = {
        ...largeState,
        status: 'running' as const,
      }

      const patch = differ.diff(largeState, nextState)
      const stats = differ.getPatchStats(largeState, patch)

      expect(stats.reduction).toBeGreaterThan(95)
    })
  })

  describe('edge cases', () => {
    it('should handle null values', () => {
      const nextState = {
        ...baseState,
        completedAt: null as any,
      }
      const patch = differ.diff(baseState, nextState)
      const result = differ.apply(baseState, patch)

      expect(result.completedAt).toBeNull()
    })

    it('should handle undefined by removing properties', () => {
      const prevState = {
        ...baseState,
        completedAt: new Date(),
      }
      const nextState = {
        ...baseState,
        completedAt: undefined,
      }
      const patch = differ.diff(prevState, nextState)

      expect(patch).toContainEqual({ op: 'remove', path: '/completedAt' })
    })

    it('should handle empty objects', () => {
      const nextState = {
        ...baseState,
        data: {},
      }
      const patch = differ.diff(baseState, nextState)
      const result = differ.apply(baseState, patch)

      expect(result.data).toEqual({})
    })

    it('should handle empty arrays', () => {
      const nextState = {
        ...baseState,
        history: [],
      }
      const patch = differ.diff(baseState, nextState)
      const result = differ.apply(baseState, patch)

      expect(result.history).toEqual([])
    })
  })

  describe('real-world scenarios', () => {
    it('should efficiently track workflow step progression', () => {
      const steps = []

      for (let i = 1; i <= 5; i++) {
        const prevState =
          i === 1
            ? baseState
            : {
                ...baseState,
                status: 'running' as const,
                currentStep: i - 1,
                data: { count: (i - 1) * 10 },
                history: steps.slice(0, i - 1),
                version: i,
              }

        steps.push({
          name: `step${i}`,
          status: 'completed' as const,
          retries: 0,
        })

        const nextState = {
          ...baseState,
          status: i === 5 ? ('completed' as const) : ('running' as const),
          currentStep: i,
          data: { count: i * 10 },
          history: [...steps],
          version: i + 1,
        }

        const patch = differ.diff(prevState, nextState)
        const reconstructed = differ.apply(prevState, patch)
        expect(reconstructed).toEqual(nextState)
      }
    })

    it('should show significant reduction for large data with minimal changes', () => {
      const largeState = {
        ...baseState,
        data: {
          largeField: 'x'.repeat(100000),
          counter: 0,
        },
      }
      const nextState = {
        ...largeState,
        data: {
          ...largeState.data,
          counter: 1,
        },
      }

      const patch = differ.diff(largeState, nextState)
      const stats = differ.getPatchStats(largeState, patch)

      expect(stats.reduction).toBeGreaterThan(99)
    })
  })
})
