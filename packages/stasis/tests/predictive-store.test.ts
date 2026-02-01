import { describe, expect, it } from 'bun:test'
import { MarkovPredictor } from '../src/prediction/AccessPredictor'
import { MemoryStore } from '../src/stores/MemoryStore'
import { PredictiveStore } from '../src/stores/PredictiveStore'

describe('PredictiveStore', () => {
  it('learns patterns with MarkovPredictor', () => {
    const p = new MarkovPredictor()
    p.record('A')
    p.record('B') // A -> B
    p.record('A')
    p.record('B') // A -> B
    p.record('A')

    const predicted = p.predict('A')
    expect(predicted).toContain('B')
    expect(predicted[0]).toBe('B') // Most frequent
  })

  it('prefetches predicted keys', async () => {
    const memory = new MemoryStore()
    const log: string[] = []

    // Custom spy
    const originalGet = memory.get.bind(memory)
    memory.get = async (key: string) => {
      log.push(`get:${key}`)
      return originalGet(key)
    }

    const store = new PredictiveStore(memory, {
      predictor: new MarkovPredictor(),
    })

    // Training Phase
    // Sequence: A -> B, A -> B
    await store.get('A')
    await store.get('B')
    await store.get('A')
    await store.get('B')

    // Clear log for testing phase
    log.length = 0

    // Test Phase
    // Accessing A should trigger prefetch for B
    await store.get('A')

    // Wait for microtasks/background promises
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Assertions
    expect(log).toContain('get:A') // The actual request
    expect(log).toContain('get:B') // The prefetch request
  })

  it('resets predictor on flush', async () => {
    const memory = new MemoryStore()
    const predictor = new MarkovPredictor()
    const store = new PredictiveStore(memory, { predictor })

    store.get('A')
    store.get('B')

    expect(predictor.predict('A')).toContain('B')

    await store.flush()

    expect(predictor.predict('A')).toEqual([])
  })
})
