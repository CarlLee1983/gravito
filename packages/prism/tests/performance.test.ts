import { describe, expect, it } from 'bun:test'
import { TemplateCache } from '../src/core/TemplateCache'
import { TemplateEngine } from '../src/engine/TemplateEngine'

describe('Performance Benchmarks', () => {
  const engine = new TemplateEngine('./tests/fixtures/perf')

  it('should render simple template 10000 times under 5000ms', () => {
    const data = { title: 'Hello', count: 100 }

    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      engine.render('simple', data)
    }
    const duration = performance.now() - start

    console.log(
      `  10000 renders: ${duration.toFixed(2)}ms (${(duration / 10000).toFixed(3)}ms/render)`
    )
    expect(duration).toBeLessThan(5000)
  })

  it('should benefit from cache on repeat renders', () => {
    const data = { title: 'Cached Test', count: 42 }

    engine.render('simple', data)

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      engine.render('simple', data)
    }
    const cachedDuration = performance.now() - start

    const freshEngine = new TemplateEngine('./tests/fixtures/perf', { enabled: false })
    const freshStart = performance.now()
    for (let i = 0; i < 1000; i++) {
      freshEngine.render('simple', data)
    }
    const uncachedDuration = performance.now() - freshStart

    console.log(
      `  Cached: ${cachedDuration.toFixed(2)}ms, Uncached: ${uncachedDuration.toFixed(2)}ms`
    )
    expect(cachedDuration).toBeLessThan(uncachedDuration * 1.5)
  })

  it('should handle deeply nested components efficiently', () => {
    const start = performance.now()
    const output = engine.render('nested-components', {})
    const duration = performance.now() - start

    console.log(`  Nested components render: ${duration.toFixed(2)}ms`)
    expect(output).toContain('component-level-5')
    expect(duration).toBeLessThan(100)
  })

  it('should render loops efficiently', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      name: `Item ${i}`,
      value: i * 10,
    }))

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      engine.render('loop', { title: 'Loop Test', items })
    }
    const duration = performance.now() - start

    console.log(`  100 renders with 100 items each: ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(2000)
  })
})

describe('TemplateCache Performance', () => {
  it('should have >90% hit rate after warmup', () => {
    const cache = new TemplateCache({ maxSize: 100 })

    for (let i = 0; i < 10; i++) {
      cache.setSource(`view${i}`, `content${i}`)
    }

    for (let round = 0; round < 10; round++) {
      for (let i = 0; i < 10; i++) {
        cache.getSource(`view${i}`)
      }
    }

    const hitRate = cache.getHitRate()
    console.log(`  Cache hit rate: ${(hitRate * 100).toFixed(1)}%`)
    expect(hitRate).toBeGreaterThanOrEqual(0.9)
  })

  it('should compute hash quickly', () => {
    const cache = new TemplateCache()
    const largeTemplate = '<html>'.repeat(10000)

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      cache.computeHash(largeTemplate)
    }
    const duration = performance.now() - start

    console.log(`  1000 hash computations on 60KB template: ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(500)
  })

  it('should handle LRU eviction efficiently', () => {
    const cache = new TemplateCache({ maxSize: 100 })

    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      cache.setSource(`view${i}`, `content${i}`)
    }
    const duration = performance.now() - start

    console.log(`  10000 inserts with eviction: ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(500)
    expect(cache.getStats().evictions).toBeGreaterThan(9000)
  })
})
