import { describe, expect, it, vi } from 'vitest'
import { CircuitBreakerStore } from '../src/stores/CircuitBreakerStore'
import { MemoryStore } from '../src/stores/MemoryStore'
import { TieredStore } from '../src/stores/TieredStore'

describe('Stasis v1.2 Features', () => {
  describe('TieredStore', () => {
    it('should read from L1 if available', async () => {
      const l1 = new MemoryStore()
      const l2 = new MemoryStore()
      const tiered = new TieredStore(l1, l2)

      await l1.put('key', 'l1-value', 60)
      await l2.put('key', 'l2-value', 60)

      const result = await tiered.get('key')
      expect(result).toBe('l1-value')
    })

    it('should read from L2 and backfill L1 if L1 is missing', async () => {
      const l1 = new MemoryStore()
      const l2 = new MemoryStore()
      const tiered = new TieredStore(l1, l2)

      await l2.put('key', 'l2-value', 60)

      const result = await tiered.get('key')
      expect(result).toBe('l2-value')

      // Check backfill
      const l1Val = await l1.get('key')
      expect(l1Val).toBe('l2-value')
    })

    it('should write to both tiers', async () => {
      const l1 = new MemoryStore()
      const l2 = new MemoryStore()
      const tiered = new TieredStore(l1, l2)

      await tiered.put('new-key', 'both', 60)

      expect(await l1.get('new-key')).toBe('both')
      expect(await l2.get('new-key')).toBe('both')
    })
  })

  describe('CircuitBreakerStore', () => {
    it('should open circuit after failures and use fallback', async () => {
      const primary = new MemoryStore()
      const fallback = new MemoryStore()
      const cb = new CircuitBreakerStore(primary, {
        maxFailures: 2,
        fallback,
      })

      // Mock failure
      vi.spyOn(primary, 'get').mockRejectedValue(new Error('Connection failed'))
      await fallback.put('key', 'fallback-data', 60)

      // First failure
      const res1 = await cb.get('key')
      expect(res1).toBe('fallback-data')
      expect(cb.getState()).toBe('CLOSED')

      // Second failure -> OPEN
      const res2 = await cb.get('key')
      expect(res2).toBe('fallback-data')
      expect(cb.getState()).toBe('OPEN')

      // While OPEN, should skip primary entirely
      const spy = vi.spyOn(primary, 'get')
      spy.mockClear()
      const res3 = await cb.get('key')
      expect(res3).toBe('fallback-data')
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
