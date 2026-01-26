import { beforeEach, describe, expect, it } from 'bun:test'
import { TemplateCache } from '../src/core/TemplateCache'

describe('TemplateCache', () => {
  let cache: TemplateCache

  beforeEach(() => {
    cache = new TemplateCache({ maxSize: 5 })
  })

  describe('source cache', () => {
    it('should cache and retrieve source templates', () => {
      cache.setSource('home', '<h1>{{title}}</h1>')
      expect(cache.getSource('home')).toBe('<h1>{{title}}</h1>')
    })

    it('should return null for non-cached templates', () => {
      expect(cache.getSource('nonexistent')).toBeNull()
    })

    it('should track hits and misses', () => {
      cache.setSource('home', '<h1>Test</h1>')
      cache.getSource('home')
      cache.getSource('nonexistent')

      const stats = cache.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
    })
  })

  describe('compiled cache', () => {
    it('should cache and retrieve compiled templates', () => {
      const renderFn = () => 'rendered'
      cache.setCompiled('home', '<h1>Test</h1>', renderFn)

      const hash = cache.computeHash('<h1>Test</h1>')
      const compiled = cache.getCompiled('home', hash)

      expect(compiled).not.toBeNull()
      expect(compiled?.render({}, { sections: new Map(), stacks: new Map() })).toBe('rendered')
    })

    it('should invalidate cache when hash changes', () => {
      const renderFn = () => 'rendered'
      cache.setCompiled('home', '<h1>Original</h1>', renderFn)

      const newHash = cache.computeHash('<h1>Modified</h1>')
      const compiled = cache.getCompiled('home', newHash)

      expect(compiled).toBeNull()
    })

    it('should track dependencies', () => {
      const renderFn = () => 'rendered'
      cache.setCompiled('home', '<h1>Test</h1>', renderFn, ['header', 'footer'])

      const hash = cache.computeHash('<h1>Test</h1>')
      const compiled = cache.getCompiled('home', hash)

      expect(compiled?.dependencies).toEqual(['header', 'footer'])
    })
  })

  describe('LRU eviction', () => {
    it('should evict least recently used items when maxSize exceeded', () => {
      for (let i = 0; i < 6; i++) {
        cache.setSource(`view${i}`, `content${i}`)
      }

      expect(cache.getSource('view0')).toBeNull()
      expect(cache.getSource('view5')).toBe('content5')
    })

    it('should update access order on get', () => {
      for (let i = 0; i < 5; i++) {
        cache.setSource(`view${i}`, `content${i}`)
      }

      cache.getSource('view0')
      cache.setSource('view5', 'content5')

      expect(cache.getSource('view0')).toBe('content0')
      expect(cache.getSource('view1')).toBeNull()
    })

    it('should track eviction count', () => {
      for (let i = 0; i < 10; i++) {
        cache.setSource(`view${i}`, `content${i}`)
      }

      const stats = cache.getStats()
      expect(stats.evictions).toBe(5)
    })
  })

  describe('hash computation', () => {
    it('should produce consistent hashes', () => {
      const source = '<h1>{{title}}</h1>'
      expect(cache.computeHash(source)).toBe(cache.computeHash(source))
    })

    it('should produce different hashes for different content', () => {
      const hash1 = cache.computeHash('<h1>Hello</h1>')
      const hash2 = cache.computeHash('<h1>World</h1>')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('cache control', () => {
    it('should disable caching when enabled=false', () => {
      const disabledCache = new TemplateCache({ enabled: false })
      disabledCache.setSource('home', '<h1>Test</h1>')
      expect(disabledCache.getSource('home')).toBeNull()
    })

    it('should clear all caches', () => {
      cache.setSource('view1', 'content1')
      cache.setSource('view2', 'content2')
      cache.clear()

      expect(cache.getSource('view1')).toBeNull()
      expect(cache.getSource('view2')).toBeNull()
      expect(cache.getStats().size).toBe(0)
    })

    it('should invalidate specific template', () => {
      cache.setSource('home', '<h1>Test</h1>')
      cache.setCompiled('home', '<h1>Test</h1>', () => 'rendered')

      cache.invalidate('home')

      expect(cache.getSource('home')).toBeNull()
    })
  })

  describe('statistics', () => {
    it('should calculate hit rate correctly', () => {
      cache.setSource('view1', 'content1')
      cache.getSource('view1')
      cache.getSource('view1')
      cache.getSource('nonexistent')

      expect(cache.getHitRate()).toBe(2 / 3)
    })

    it('should return 0 hit rate when no accesses', () => {
      expect(cache.getHitRate()).toBe(0)
    })

    it('should report cache size', () => {
      cache.setSource('view1', 'content1')
      cache.setSource('view2', 'content2')

      expect(cache.getStats().size).toBe(2)
    })
  })

  describe('configuration', () => {
    it('should use default maxSize of 500', () => {
      const defaultCache = new TemplateCache()
      expect(defaultCache.isEnabled()).toBe(true)
    })

    it('should respect development mode flag', () => {
      const devCache = new TemplateCache({ development: true })
      expect(devCache.isDevelopment()).toBe(true)
    })
  })
})
