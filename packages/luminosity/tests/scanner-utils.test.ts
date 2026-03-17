import { describe, expect, it } from 'bun:test'
import {
  extractParams,
  isDynamicRoute,
  matchesPatterns,
  normalizePath,
  replaceParams,
} from '../src/scanner/utils'

describe('Scanner Utils', () => {
  describe('extractParams', () => {
    it('should extract :param style parameters', () => {
      expect(extractParams('/blog/:slug')).toEqual(['slug'])
      expect(extractParams('/products/:category/:id')).toEqual(['category', 'id'])
      expect(extractParams('/users')).toEqual([])
    })

    it('should extract [param] style parameters (Next.js/Nuxt)', () => {
      expect(extractParams('/blog/[slug]')).toEqual(['slug'])
      expect(extractParams('/products/[category]/[id]')).toEqual(['category', 'id'])
    })

    it('should extract mixed parameter styles', () => {
      expect(extractParams('/api/:version/[resource]')).toEqual(['version', 'resource'])
    })
  })

  describe('isDynamicRoute', () => {
    it('should detect :param style routes', () => {
      expect(isDynamicRoute('/blog/:slug')).toBe(true)
      expect(isDynamicRoute('/users')).toBe(false)
    })

    it('should detect [param] style routes', () => {
      expect(isDynamicRoute('/blog/[slug]')).toBe(true)
    })
  })

  describe('normalizePath', () => {
    it('should convert [param] to :param', () => {
      expect(normalizePath('/blog/[slug]')).toBe('/blog/:slug')
      expect(normalizePath('/products/[category]/[id]')).toBe('/products/:category/:id')
    })

    it('should leave :param unchanged', () => {
      expect(normalizePath('/blog/:slug')).toBe('/blog/:slug')
    })
  })

  describe('replaceParams', () => {
    it('should replace :param style parameters', () => {
      expect(replaceParams('/blog/:slug', { slug: 'hello-world' })).toBe('/blog/hello-world')
      expect(replaceParams('/products/:category/:id', { category: 'tech', id: 123 })).toBe(
        '/products/tech/123'
      )
    })

    it('should replace [param] style parameters', () => {
      expect(replaceParams('/blog/[slug]', { slug: 'hello-world' })).toBe('/blog/hello-world')
    })
  })

  describe('matchesPatterns', () => {
    it('should match string patterns with glob', () => {
      expect(matchesPatterns('/admin/users', ['/admin/*'])).toBe(true)
      expect(matchesPatterns('/public/users', ['/admin/*'])).toBe(false)
    })

    it('should match regex patterns', () => {
      expect(matchesPatterns('/api/v1/users', [/^\/api\//])).toBe(true)
      expect(matchesPatterns('/web/users', [/^\/api\//])).toBe(false)
    })

    it('should treat regex metacharacters literally in string patterns', () => {
      expect(matchesPatterns('/docs/v1.2', ['/docs/v1.2'])).toBe(true)
      expect(matchesPatterns('/docs/v12', ['/docs/v1.2'])).toBe(false)
    })
  })
})
