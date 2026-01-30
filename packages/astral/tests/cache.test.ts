import { beforeEach, describe, expect, test } from 'bun:test'
import type { OpenAPIV3_1 } from 'openapi-types'
import { SpecCache } from '../src/cache'
import type { AstralRoute } from '../src/OpenApiGenerator'

describe('SpecCache', () => {
  let cache: SpecCache

  beforeEach(() => {
    cache = new SpecCache()
  })

  test('should cache generated spec', () => {
    const routes: AstralRoute[] = [{ path: '/users', method: 'GET' }]
    const spec: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    }

    cache.set(routes, spec)

    const cached = cache.get(routes)
    expect(cached).toBeDefined()
    expect(cached?.openapi).toBe('3.1.0')
    expect(cached?.info.title).toBe('Test')
  })

  test('should return null for non-cached routes', () => {
    const routes: AstralRoute[] = [{ path: '/users', method: 'GET' }]

    const cached = cache.get(routes)
    expect(cached).toBeNull()
  })

  test('should invalidate on route change - added route', () => {
    const routes1: AstralRoute[] = [{ path: '/users', method: 'GET' }]
    const routes2: AstralRoute[] = [
      { path: '/users', method: 'GET' },
      { path: '/posts', method: 'GET' },
    ]
    const spec: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    }

    cache.set(routes1, spec)

    expect(cache.get(routes1)).toBeDefined()
    expect(cache.get(routes2)).toBeNull()
  })

  test('should invalidate on route change - removed route', () => {
    const routes1: AstralRoute[] = [
      { path: '/users', method: 'GET' },
      { path: '/posts', method: 'GET' },
    ]
    const routes2: AstralRoute[] = [{ path: '/users', method: 'GET' }]
    const spec: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    }

    cache.set(routes1, spec)

    expect(cache.get(routes1)).toBeDefined()
    expect(cache.get(routes2)).toBeNull()
  })

  test('should invalidate on route change - different method', () => {
    const routes1: AstralRoute[] = [{ path: '/users', method: 'GET' }]
    const routes2: AstralRoute[] = [{ path: '/users', method: 'POST' }]
    const spec: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    }

    cache.set(routes1, spec)

    expect(cache.get(routes1)).toBeDefined()
    expect(cache.get(routes2)).toBeNull()
  })

  test('should handle route order independence', () => {
    const routes1: AstralRoute[] = [
      { path: '/users', method: 'GET' },
      { path: '/posts', method: 'POST' },
    ]
    const routes2: AstralRoute[] = [
      { path: '/posts', method: 'POST' },
      { path: '/users', method: 'GET' },
    ]
    const spec: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    }

    cache.set(routes1, spec)

    // 應該命中快取，因為路由相同（只是順序不同）
    const cached = cache.get(routes2)
    expect(cached).toBeDefined()
    expect(cached?.info.title).toBe('Test')
  })

  test('should clear cache on invalidate', () => {
    const routes: AstralRoute[] = [{ path: '/users', method: 'GET' }]
    const spec: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    }

    cache.set(routes, spec)
    expect(cache.get(routes)).toBeDefined()

    cache.invalidate()
    expect(cache.get(routes)).toBeNull()
  })

  test('should handle complex routes with parameters', () => {
    const routes: AstralRoute[] = [
      { path: '/users/:id', method: 'GET' },
      { path: '/users/:id/posts', method: 'GET' },
      { path: '/users', method: 'POST' },
    ]
    const spec: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    }

    cache.set(routes, spec)

    const cached = cache.get(routes)
    expect(cached).toBeDefined()
  })

  test('should handle empty routes array', () => {
    const routes: AstralRoute[] = []
    const spec: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    }

    cache.set(routes, spec)

    const cached = cache.get(routes)
    expect(cached).toBeDefined()
  })

  test('should update cache when setting with same routes', () => {
    const routes: AstralRoute[] = [{ path: '/users', method: 'GET' }]
    const spec1: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Version 1', version: '1.0.0' },
      paths: {},
    }
    const spec2: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Version 2', version: '2.0.0' },
      paths: {},
    }

    cache.set(routes, spec1)
    expect(cache.get(routes)?.info.title).toBe('Version 1')

    cache.set(routes, spec2)
    expect(cache.get(routes)?.info.title).toBe('Version 2')
  })

  test('should handle routes with domain', () => {
    const routes1: AstralRoute[] = [{ path: '/users', method: 'GET', domain: 'api.example.com' }]
    const routes2: AstralRoute[] = [{ path: '/users', method: 'GET', domain: 'admin.example.com' }]
    const spec: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    }

    cache.set(routes1, spec)

    expect(cache.get(routes1)).toBeDefined()
    expect(cache.get(routes2)).toBeNull()
  })

  test('should handle routes with name', () => {
    const routes1: AstralRoute[] = [{ path: '/users', method: 'GET', name: 'users.index' }]
    const routes2: AstralRoute[] = [{ path: '/users', method: 'GET', name: 'users.list' }]
    const spec: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    }

    cache.set(routes1, spec)

    expect(cache.get(routes1)).toBeDefined()
    expect(cache.get(routes2)).toBeNull()
  })
})
