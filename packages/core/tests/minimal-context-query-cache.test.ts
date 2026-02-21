import { describe, expect, it } from 'bun:test'
import { MinimalContext } from '../src/engine/MinimalContext'

describe('MinimalContext Query Caching', () => {
  describe('queries() caching', () => {
    it('should cache queries object on first access', () => {
      const url = 'http://localhost/api/test?id=1&name=john'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      const first = ctx.req.queries()
      const second = ctx.req.queries()

      expect(first).toEqual({ id: '1', name: 'john' })
      expect(first).toBe(second) // Same object reference (cached)
    })

    it('should return empty object for URL without query string', () => {
      const url = 'http://localhost/api/test'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      const queries = ctx.req.queries()
      expect(queries).toEqual({})

      const second = ctx.req.queries()
      expect(queries).toBe(second) // Still cached
    })

    it('should handle single query parameter', () => {
      const url = 'http://localhost/api/test?search=hello'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      const queries = ctx.req.queries()
      expect(queries.search).toBe('hello')
      expect(queries).toBe(ctx.req.queries()) // Cached
    })

    it('should handle multiple values for same parameter name as array', () => {
      const url = 'http://localhost/api/test?tag=javascript&tag=typescript&tag=bun'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      const queries = ctx.req.queries()

      expect(Array.isArray(queries.tag)).toBe(true)
      expect(queries.tag).toEqual(['javascript', 'typescript', 'bun'])
    })

    it('should handle mixed single and multiple values', () => {
      const url = 'http://localhost/api/test?id=123&tag=a&tag=b&name=test'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      const queries = ctx.req.queries()

      expect(queries.id).toBe('123')
      expect(queries.name).toBe('test')
      expect(Array.isArray(queries.tag)).toBe(true)
      expect(queries.tag).toEqual(['a', 'b'])
    })

    it('should handle URL encoded query parameters', () => {
      const url = 'http://localhost/api/test?message=hello%20world&email=test%40example.com'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      const queries = ctx.req.queries()

      expect(queries.message).toBe('hello world')
      expect(queries.email).toBe('test@example.com')
    })

    it('should handle parameters with empty values', () => {
      const url = 'http://localhost/api/test?flag=&value=something'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      const queries = ctx.req.queries()

      expect(queries.flag).toBe('')
      expect(queries.value).toBe('something')
    })

    it('should handle URL with hash fragment', () => {
      const url = 'http://localhost/api/test?id=1&name=john#section'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      const queries = ctx.req.queries()

      expect(queries.id).toBe('1')
      expect(queries.name).toBe('john')
      expect(queries).toBe(ctx.req.queries()) // Still cached after hash
    })

    it('should cache independently per request', () => {
      const url1 = 'http://localhost/api/test?page=1'
      const url2 = 'http://localhost/api/test?page=2'

      const request1 = new Request(url1, { method: 'GET' })
      const request2 = new Request(url2, { method: 'GET' })

      const ctx1 = new MinimalContext(request1, {}, '/api/test')
      const ctx2 = new MinimalContext(request2, {}, '/api/test')

      const queries1 = ctx1.req.queries()
      const queries2 = ctx2.req.queries()

      expect(queries1.page).toBe('1')
      expect(queries2.page).toBe('2')
      expect(queries1).not.toBe(queries2)
    })

    it('should not reparse queries on repeated access', () => {
      const url = 'http://localhost/api/test?complex=value&with=multiple&params=here'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      // First access
      const first = ctx.req.queries()
      expect(first).toEqual({
        complex: 'value',
        with: 'multiple',
        params: 'here',
      })

      // Subsequent accesses should return same object
      const second = ctx.req.queries()
      const third = ctx.req.queries()

      expect(first).toBe(second)
      expect(second).toBe(third)
    })
  })

  describe('query() and queries() consistency', () => {
    it('should have consistent results between query() and queries()', () => {
      const url = 'http://localhost/api/test?id=1&name=john&active=true'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      const singleId = ctx.req.query('id')
      const allQueries = ctx.req.queries()

      expect(singleId).toBe(allQueries.id)
      expect(ctx.req.query('name')).toBe(allQueries.name)
      expect(ctx.req.query('active')).toBe(allQueries.active)
    })

    it('should return undefined for non-existent parameter', () => {
      const url = 'http://localhost/api/test?id=1'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      expect(ctx.req.query('notExist')).toBeUndefined()
      expect(ctx.req.queries().notExist).toBeUndefined()
    })

    it('should handle multi-valued parameters correctly', () => {
      const url = 'http://localhost/api/test?tag=a&tag=b'
      const request = new Request(url, { method: 'GET' })
      const ctx = new MinimalContext(request, {}, '/api/test')

      // query() returns first value
      const single = ctx.req.query('tag')
      expect(single).toBe('a')

      // queries() returns array
      const all = ctx.req.queries()
      expect(Array.isArray(all.tag)).toBe(true)
      expect(all.tag).toEqual(['a', 'b'])
    })
  })

  describe('FastContext query compatibility', () => {
    it('should match FastContext query parsing behavior', () => {
      const { FastContext } = require('../src/engine/FastContext')

      const url = 'http://localhost/api/test?sort=name&limit=10'
      const request = new Request(url, { method: 'GET' })

      const fastCtx = new FastContext()
      fastCtx.init(request)

      const minimalCtx = new MinimalContext(request, {}, '/api/test')

      // Both should parse queries the same way
      const fastQueries = fastCtx.req.queries()
      const minimalQueries = minimalCtx.req.queries()

      expect(fastQueries.sort).toBe(minimalQueries.sort)
      expect(fastQueries.limit).toBe(minimalQueries.limit)
    })
  })
})
