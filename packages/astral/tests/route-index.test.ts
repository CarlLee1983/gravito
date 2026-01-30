import { describe, expect, test } from 'bun:test'
import type { AstralRoute } from '../src/OpenApiGenerator'
import { RouteIndex } from '../src/route-index'

describe('RouteIndex', () => {
  test('should build index from routes', () => {
    const routes: AstralRoute[] = [
      { path: '/api/users', method: 'GET' },
      { path: '/api/users/:id', method: 'GET' },
      { path: '/api/posts', method: 'GET' },
    ]

    const index = new RouteIndex(routes)

    expect(index.findByPrefix('/api/users')).toHaveLength(2)
    expect(index.findByPrefix('/api/posts')).toHaveLength(1)
  })

  test('should handle exact match', () => {
    const routes: AstralRoute[] = [
      { path: '/api/users', method: 'GET' },
      { path: '/api/users2', method: 'GET' },
    ]

    const index = new RouteIndex(routes)
    const matches = index.findByPrefix('/api/users')

    expect(matches.map((r) => r.path)).not.toContain('/api/users2')
    expect(matches.map((r) => r.path)).toContain('/api/users')
  })

  test('should handle nested paths', () => {
    const routes: AstralRoute[] = [
      { path: '/api/users', method: 'GET' },
      { path: '/api/users/:id', method: 'GET' },
      { path: '/api/users/:id/posts', method: 'GET' },
      { path: '/api/users/:id/posts/:postId', method: 'GET' },
    ]

    const index = new RouteIndex(routes)

    expect(index.findByPrefix('/api/users')).toHaveLength(4)
    expect(index.findByPrefix('/api/users/:id')).toHaveLength(3)
    expect(index.findByPrefix('/api/users/:id/posts')).toHaveLength(2)
  })

  test('should differentiate between different HTTP methods', () => {
    const routes: AstralRoute[] = [
      { path: '/api/users', method: 'GET' },
      { path: '/api/users', method: 'POST' },
      { path: '/api/users', method: 'DELETE' },
    ]

    const index = new RouteIndex(routes)
    const matches = index.findByPrefix('/api/users')

    expect(matches).toHaveLength(3)
    expect(matches.map((r) => r.method)).toContain('GET')
    expect(matches.map((r) => r.method)).toContain('POST')
    expect(matches.map((r) => r.method)).toContain('DELETE')
  })

  test('should handle empty prefix', () => {
    const routes: AstralRoute[] = [
      { path: '/api/users', method: 'GET' },
      { path: '/api/posts', method: 'GET' },
    ]

    const index = new RouteIndex(routes)
    const matches = index.findByPrefix('')

    // 空前綴不應該匹配任何路由
    expect(matches).toHaveLength(0)
  })

  test('should handle root path', () => {
    const routes: AstralRoute[] = [
      { path: '/', method: 'GET' },
      { path: '/api', method: 'GET' },
      { path: '/api/users', method: 'GET' },
    ]

    const index = new RouteIndex(routes)

    expect(index.findByPrefix('/')).toHaveLength(1)
    expect(index.findByPrefix('/api')).toHaveLength(2)
  })

  test('should be O(1) lookup for exact paths', () => {
    const routes: AstralRoute[] = Array.from({ length: 10000 }, (_, i) => ({
      path: `/api/resource${i}`,
      method: 'GET',
    }))

    const index = new RouteIndex(routes)

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      index.findByPrefix('/api/resource5000')
    }
    const elapsed = performance.now() - start

    // 1000 次查詢應該在 10ms 內完成
    expect(elapsed).toBeLessThan(10)
  })

  test('should handle paths with special characters', () => {
    const routes: AstralRoute[] = [
      { path: '/api/users-list', method: 'GET' },
      { path: '/api/users_list', method: 'GET' },
      { path: '/api/users.list', method: 'GET' },
    ]

    const index = new RouteIndex(routes)

    expect(index.findByPrefix('/api/users-list')).toHaveLength(1)
    expect(index.findByPrefix('/api/users_list')).toHaveLength(1)
    expect(index.findByPrefix('/api/users.list')).toHaveLength(1)
  })

  test('should handle paths with query parameters in path', () => {
    const routes: AstralRoute[] = [
      { path: '/api/search', method: 'GET' },
      { path: '/api/search/advanced', method: 'GET' },
    ]

    const index = new RouteIndex(routes)
    const matches = index.findByPrefix('/api/search')

    expect(matches).toHaveLength(2)
  })

  test('should avoid false positives with similar paths', () => {
    const routes: AstralRoute[] = [
      { path: '/users', method: 'GET' },
      { path: '/users2', method: 'GET' },
      { path: '/users-admin', method: 'GET' },
      { path: '/users/active', method: 'GET' },
    ]

    const index = new RouteIndex(routes)
    const matches = index.findByPrefix('/users')

    // 只應該匹配 /users 和 /users/active
    expect(matches).toHaveLength(2)
    expect(matches.map((r) => r.path)).toContain('/users')
    expect(matches.map((r) => r.path)).toContain('/users/active')
    expect(matches.map((r) => r.path)).not.toContain('/users2')
    expect(matches.map((r) => r.path)).not.toContain('/users-admin')
  })

  test('should handle empty routes array', () => {
    const routes: AstralRoute[] = []
    const index = new RouteIndex(routes)

    expect(index.findByPrefix('/api/users')).toHaveLength(0)
  })

  test('should handle single route', () => {
    const routes: AstralRoute[] = [{ path: '/api/users', method: 'GET' }]
    const index = new RouteIndex(routes)

    expect(index.findByPrefix('/api/users')).toHaveLength(1)
    expect(index.findByPrefix('/api/posts')).toHaveLength(0)
  })
})
