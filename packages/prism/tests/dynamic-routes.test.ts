import { describe, expect, it } from 'bun:test'
import { DynamicRouteResolver } from '../src/ssg/DynamicRouteResolver'

describe('DynamicRouteResolver', () => {
  describe('resolve', () => {
    it('should resolve single param routes', async () => {
      const routes = [
        {
          pattern: '/blog/[slug]',
          getPaths: async () => [
            { params: { slug: 'hello-world' } },
            { params: { slug: 'getting-started' } },
          ],
        },
      ]

      const resolved = await DynamicRouteResolver.resolve(routes)

      expect(resolved).toHaveLength(2)
      expect(resolved[0].path).toBe('/blog/hello-world')
      expect(resolved[1].path).toBe('/blog/getting-started')
    })

    it('should resolve catch-all param routes', async () => {
      const routes = [
        {
          pattern: '/docs/[...path]',
          getPaths: async () => [
            { params: { path: 'api/intro' } },
            { params: { path: 'guide/setup' } },
          ],
        },
      ]

      const resolved = await DynamicRouteResolver.resolve(routes)

      expect(resolved).toHaveLength(2)
      expect(resolved[0].path).toBe('/docs/api/intro')
      expect(resolved[1].path).toBe('/docs/guide/setup')
    })

    it('should resolve multiple param routes', async () => {
      const routes = [
        {
          pattern: '/posts/[year]/[month]/[slug]',
          getPaths: async () => [
            { params: { year: '2024', month: '01', slug: 'new-year' } },
            { params: { year: '2024', month: '02', slug: 'february-update' } },
          ],
        },
      ]

      const resolved = await DynamicRouteResolver.resolve(routes)

      expect(resolved).toHaveLength(2)
      expect(resolved[0].path).toBe('/posts/2024/01/new-year')
      expect(resolved[1].path).toBe('/posts/2024/02/february-update')
    })

    it('should attach getData function', async () => {
      const mockGetData = async (params: Record<string, string>) => ({
        title: `Post ${params.slug}`,
      })

      const routes = [
        {
          pattern: '/blog/[slug]',
          getPaths: async () => [{ params: { slug: 'hello' } }],
          getData: mockGetData,
        },
      ]

      const resolved = await DynamicRouteResolver.resolve(routes)

      expect(resolved[0].getData).toBeDefined()
      const data = await resolved[0].getData?.()
      expect(data.title).toBe('Post hello')
    })

    it('should handle routes without getData', async () => {
      const routes = [
        {
          pattern: '/static/[page]',
          getPaths: async () => [{ params: { page: 'about' } }],
        },
      ]

      const resolved = await DynamicRouteResolver.resolve(routes)

      expect(resolved[0].getData).toBeUndefined()
    })

    it('should throw error for missing params', async () => {
      const routes = [
        {
          pattern: '/blog/[slug]',
          getPaths: async () => [{ params: {} }],
        },
      ]

      await expect(DynamicRouteResolver.resolve(routes)).rejects.toThrow('Missing param: slug')
    })

    it('should throw error for missing catch-all params', async () => {
      const routes = [
        {
          pattern: '/docs/[...path]',
          getPaths: async () => [{ params: {} }],
        },
      ]

      await expect(DynamicRouteResolver.resolve(routes)).rejects.toThrow(
        'Missing catch-all param: path'
      )
    })
  })

  describe('extractParams', () => {
    it('should extract single param', () => {
      const params = DynamicRouteResolver.extractParams('/blog/[slug]')
      expect(params).toEqual(['slug'])
    })

    it('should extract multiple params', () => {
      const params = DynamicRouteResolver.extractParams('/posts/[year]/[month]/[slug]')
      expect(params).toEqual(['year', 'month', 'slug'])
    })

    it('should extract catch-all param', () => {
      const params = DynamicRouteResolver.extractParams('/docs/[...path]')
      expect(params).toEqual(['path'])
    })

    it('should return empty array for static routes', () => {
      const params = DynamicRouteResolver.extractParams('/about')
      expect(params).toEqual([])
    })

    it('should extract mixed params', () => {
      const params = DynamicRouteResolver.extractParams('/blog/[category]/[...slug]')
      expect(params).toEqual(['category', 'slug'])
    })
  })
})
