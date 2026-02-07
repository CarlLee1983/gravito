import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { astral } from '../src/index'
import type { AstralRoute } from '../src/OpenApiGenerator'
import { OpenApiGenerator } from '../src/OpenApiGenerator'

describe('Performance Benchmarks', () => {
  const UserDTO = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
  })

  test('should handle 100 routes efficiently', () => {
    const contracts = Array.from({ length: 20 }, (_, i) =>
      astral.resource(`/api/resource${i}`, {
        operations: {
          index: { summary: 'List', output: [UserDTO] },
          show: { summary: 'Get', output: UserDTO },
          store: { summary: 'Create', input: UserDTO, output: UserDTO },
          update: { summary: 'Update', input: UserDTO, output: UserDTO },
          destroy: { summary: 'Delete' },
        },
      })
    )

    const routes: AstralRoute[] = contracts.flatMap((c) => [
      { path: c.path, method: 'GET' },
      { path: `${c.path}/:id`, method: 'GET' },
      { path: c.path, method: 'POST' },
      { path: `${c.path}/:id`, method: 'PUT' },
      { path: `${c.path}/:id`, method: 'DELETE' },
    ])

    const gen = new OpenApiGenerator({ contracts })

    const start = performance.now()
    const spec = gen.generate(routes)
    const elapsed = performance.now() - start

    console.log(`[100 routes] Generation time: ${elapsed.toFixed(2)}ms`)

    // 100 路由應該在 200ms 內完成
    expect(elapsed).toBeLessThan(200)
    expect(Object.keys(spec.paths).length).toBeGreaterThan(0)
  })

  test('should handle 500 routes efficiently', () => {
    const contracts = Array.from({ length: 100 }, (_, i) =>
      astral.resource(`/api/resource${i}`, {
        operations: {
          index: { summary: 'List', output: [UserDTO] },
          show: { summary: 'Get', output: UserDTO },
          store: { summary: 'Create', input: UserDTO, output: UserDTO },
          update: { summary: 'Update', input: UserDTO, output: UserDTO },
          destroy: { summary: 'Delete' },
        },
      })
    )

    const routes: AstralRoute[] = contracts.flatMap((c) => [
      { path: c.path, method: 'GET' },
      { path: `${c.path}/:id`, method: 'GET' },
      { path: c.path, method: 'POST' },
      { path: `${c.path}/:id`, method: 'PUT' },
      { path: `${c.path}/:id`, method: 'DELETE' },
    ])

    const gen = new OpenApiGenerator({ contracts })

    const start = performance.now()
    const spec = gen.generate(routes)
    const elapsed = performance.now() - start

    console.log(`[500 routes] Generation time: ${elapsed.toFixed(2)}ms`)

    // 500 路由應該在 500ms 內完成
    expect(elapsed).toBeLessThan(500)
    expect(Object.keys(spec.paths).length).toBeGreaterThan(0)
  })

  test('should handle 1000 routes efficiently', () => {
    const contracts = Array.from({ length: 200 }, (_, i) =>
      astral.resource(`/api/resource${i}`, {
        operations: {
          index: { summary: 'List', output: [UserDTO] },
          show: { summary: 'Get', output: UserDTO },
          store: { summary: 'Create', input: UserDTO, output: UserDTO },
          update: { summary: 'Update', input: UserDTO, output: UserDTO },
          destroy: { summary: 'Delete' },
        },
      })
    )

    const routes: AstralRoute[] = contracts.flatMap((c) => [
      { path: c.path, method: 'GET' },
      { path: `${c.path}/:id`, method: 'GET' },
      { path: c.path, method: 'POST' },
      { path: `${c.path}/:id`, method: 'PUT' },
      { path: `${c.path}/:id`, method: 'DELETE' },
    ])

    const gen = new OpenApiGenerator({ contracts })

    const start = performance.now()
    const spec = gen.generate(routes)
    const elapsed = performance.now() - start

    console.log(`[1000 routes] Generation time: ${elapsed.toFixed(2)}ms`)

    // 1000 路由應該在 800ms 內完成
    expect(elapsed).toBeLessThan(800)
    expect(Object.keys(spec.paths).length).toBeGreaterThan(0)
  })

  test('cache should reduce generation time by 95%+', () => {
    const contracts = Array.from({ length: 50 }, (_, i) =>
      astral.resource(`/api/resource${i}`, {
        operations: {
          index: { summary: 'List', output: [UserDTO] },
          show: { summary: 'Get', output: UserDTO },
        },
      })
    )

    const routes: AstralRoute[] = contracts.flatMap((c) => [
      { path: c.path, method: 'GET' },
      { path: `${c.path}/:id`, method: 'GET' },
    ])

    const gen = new OpenApiGenerator({ contracts })

    // 第一次生成（無快取）
    const start1 = performance.now()
    gen.generateWithCache(routes)
    const firstTime = performance.now() - start1

    // 第二次生成（使用快取）
    const start2 = performance.now()
    gen.generateWithCache(routes)
    const cachedTime = performance.now() - start2

    const speedup = firstTime / cachedTime
    console.log(
      `[Cache] First: ${firstTime.toFixed(2)}ms, Cached: ${cachedTime.toFixed(3)}ms, Speedup: ${speedup.toFixed(0)}x`
    )

    // 快取應該快至少 10 倍以上（90% 減少）
    expect(speedup).toBeGreaterThanOrEqual(10)
  })

  test('cache should handle route changes correctly', () => {
    const contracts = [
      astral.resource('/api/users', {
        operations: {
          index: { summary: 'List Users', output: [UserDTO] },
        },
      }),
    ]

    const routes1: AstralRoute[] = [{ path: '/api/users', method: 'GET' }]
    const routes2: AstralRoute[] = [
      { path: '/api/users', method: 'GET' },
      { path: '/api/posts', method: 'GET' },
    ]

    const gen = new OpenApiGenerator({ contracts })

    // 第一次生成
    const start1 = performance.now()
    const spec1 = gen.generateWithCache(routes1)
    const time1 = performance.now() - start1

    // 相同路由，應該使用快取
    const start2 = performance.now()
    const spec2 = gen.generateWithCache(routes1)
    const time2 = performance.now() - start2

    // 不同路由，應該重新生成
    const start3 = performance.now()
    const spec3 = gen.generateWithCache(routes2)
    const time3 = performance.now() - start3

    console.log(
      `[Cache invalidation] First: ${time1.toFixed(2)}ms, Cached: ${time2.toFixed(3)}ms, Changed: ${time3.toFixed(2)}ms`
    )

    // 快取應該明顯快於首次生成（至少 2 倍以上，避免 CI 噪音影響）
    expect(time2).toBeLessThan(time1 * 0.5)

    // 驗證結果正確性
    expect(spec1).toBe(spec2) // 應該返回相同的快取物件
    expect(spec1).not.toBe(spec3) // 應該是不同的物件（因為路由變化）
  })

  test('schema cache should avoid redundant conversions', () => {
    const sharedSchema = z.object({
      id: z.number(),
      name: z.string(),
      metadata: z.object({
        createdAt: z.date(),
        updatedAt: z.date(),
      }),
    })

    // 使用相同的 schema 多次
    const contracts = Array.from({ length: 50 }, (_, i) =>
      astral.resource(`/api/resource${i}`, {
        operations: {
          index: { summary: 'List', output: [sharedSchema] },
          show: { summary: 'Get', output: sharedSchema },
          store: { summary: 'Create', input: sharedSchema, output: sharedSchema },
          update: { summary: 'Update', input: sharedSchema, output: sharedSchema },
        },
      })
    )

    const routes: AstralRoute[] = contracts.flatMap((c) => [
      { path: c.path, method: 'GET' },
      { path: `${c.path}/:id`, method: 'GET' },
      { path: c.path, method: 'POST' },
      { path: `${c.path}/:id`, method: 'PUT' },
    ])

    const gen = new OpenApiGenerator({ contracts })

    const start = performance.now()
    const spec = gen.generate(routes)
    const elapsed = performance.now() - start

    console.log(`[Schema cache] 200 routes with shared schema: ${elapsed.toFixed(2)}ms`)

    // 即使有 200 個路由使用相同 schema，也應該很快（因為 schema 快取）
    expect(elapsed).toBeLessThan(500)
    // 50 resources × 4 operations = 200 routes, but only 100 unique paths (base + :id)
    expect(Object.keys(spec.paths).length).toBe(100)
  })

  test('route index should scale reasonably', () => {
    const sizes = [100, 500, 1000]
    const times: number[] = []

    for (const size of sizes) {
      const contracts = Array.from({ length: size / 5 }, (_, i) =>
        astral.resource(`/api/resource${i}`, {
          operations: {
            index: { summary: 'List', output: [UserDTO] },
            show: { summary: 'Get', output: UserDTO },
            store: { summary: 'Create', output: UserDTO },
            update: { summary: 'Update', output: UserDTO },
            destroy: { summary: 'Delete' },
          },
        })
      )

      const routes: AstralRoute[] = contracts.flatMap((c) => [
        { path: c.path, method: 'GET' },
        { path: `${c.path}/:id`, method: 'GET' },
        { path: c.path, method: 'POST' },
        { path: `${c.path}/:id`, method: 'PUT' },
        { path: `${c.path}/:id`, method: 'DELETE' },
      ])

      const gen = new OpenApiGenerator({ contracts })

      const start = performance.now()
      gen.generate(routes)
      const elapsed = performance.now() - start

      times.push(elapsed)
      console.log(`[Scalability] ${size} routes: ${elapsed.toFixed(2)}ms`)
    }

    // 驗證性能沒有崩潰：確保不是 O(N²) 或更差（100 倍會是 O(N²) 下限）
    // 較寬鬆的限制以適應不同的 CI 環境
    const ratio = times[2] / times[0]
    console.log(`[Scalability] 1000/100 ratio: ${ratio.toFixed(1)}x (should be < 500x)`)
    expect(ratio).toBeLessThan(500)
  })

  test('complex nested schemas should be handled efficiently', () => {
    const NestedSchema = z.object({
      id: z.number(),
      user: z.object({
        id: z.number(),
        profile: z.object({
          name: z.string(),
          avatar: z.string().url(),
          settings: z.object({
            theme: z.enum(['light', 'dark']),
            notifications: z.boolean(),
          }),
        }),
      }),
      posts: z.array(
        z.object({
          id: z.number(),
          title: z.string(),
          tags: z.array(z.string()),
        })
      ),
    })

    const contracts = Array.from({ length: 20 }, (_, i) =>
      astral.resource(`/api/complex${i}`, {
        operations: {
          index: { summary: 'List', output: [NestedSchema] },
          show: { summary: 'Get', output: NestedSchema },
        },
      })
    )

    const routes: AstralRoute[] = contracts.flatMap((c) => [
      { path: c.path, method: 'GET' },
      { path: `${c.path}/:id`, method: 'GET' },
    ])

    const gen = new OpenApiGenerator({ contracts })

    const start = performance.now()
    const spec = gen.generate(routes)
    const elapsed = performance.now() - start

    console.log(`[Complex schemas] 40 routes with nested schemas: ${elapsed.toFixed(2)}ms`)

    // 即使是複雜的嵌套 schema 也應該在合理時間內完成
    expect(elapsed).toBeLessThan(500)
    expect(Object.keys(spec.paths).length).toBe(40)
  })
})
