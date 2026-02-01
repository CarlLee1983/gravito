/**
 * @fileoverview Route Pattern Detection Tests
 *
 * 驗證 routePattern 正確傳遞到 context，防止高基數問題
 */

import { describe, expect, test } from 'bun:test'
import { Gravito } from '../Gravito'

describe('Route Pattern Detection', () => {
  test('靜態路由：routePattern 應該等於 path', async () => {
    const app = new Gravito()
    let capturedRoutePattern: string | undefined

    app.get('/users', (ctx) => {
      capturedRoutePattern = ctx.req.routePattern
      return ctx.json({ message: 'ok' })
    })

    const response = await app.fetch(new Request('http://localhost/users'))
    expect(response.status).toBe(200)
    expect(capturedRoutePattern).toBe('/users')
  })

  test('動態路由：routePattern 應該包含參數模式 /:id', async () => {
    const app = new Gravito()
    let capturedRoutePattern: string | undefined
    let capturedPath: string | undefined

    app.get('/users/:id', (ctx) => {
      capturedRoutePattern = ctx.req.routePattern
      capturedPath = ctx.req.path
      return ctx.json({ id: ctx.req.param('id') })
    })

    const response = await app.fetch(new Request('http://localhost/users/123'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ id: '123' })
    expect(capturedPath).toBe('/users/123') // 原始路徑
    expect(capturedRoutePattern).toBe('/users/:id') // 參數化模式
  })

  test('巢狀動態路由：routePattern 應該包含所有參數', async () => {
    const app = new Gravito()
    let capturedRoutePattern: string | undefined

    app.get('/posts/:postId/comments/:commentId', (ctx) => {
      capturedRoutePattern = ctx.req.routePattern
      return ctx.json({
        postId: ctx.req.param('postId'),
        commentId: ctx.req.param('commentId'),
      })
    })

    const response = await app.fetch(new Request('http://localhost/posts/abc-123/comments/xyz-456'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ postId: 'abc-123', commentId: 'xyz-456' })
    expect(capturedRoutePattern).toBe('/posts/:postId/comments/:commentId')
  })

  test('UUID 路徑：routePattern 應該使用參數模式而非具體值', async () => {
    const app = new Gravito()
    let capturedRoutePattern: string | undefined

    app.get('/api/resources/:resourceId', (ctx) => {
      capturedRoutePattern = ctx.req.routePattern
      return ctx.json({ resourceId: ctx.req.param('resourceId') })
    })

    // 使用 UUID 格式的 ID
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const response = await app.fetch(new Request(`http://localhost/api/resources/${uuid}`))

    expect(response.status).toBe(200)
    expect(capturedRoutePattern).toBe('/api/resources/:resourceId')
  })

  test('多個請求到同一動態路由：routePattern 應該保持一致', async () => {
    const app = new Gravito()
    const patterns: (string | undefined)[] = []

    app.get('/items/:id', (ctx) => {
      patterns.push(ctx.req.routePattern)
      return ctx.json({ id: ctx.req.param('id') })
    })

    // 發送多個請求，使用不同的 ID
    await app.fetch(new Request('http://localhost/items/1'))
    await app.fetch(new Request('http://localhost/items/999'))
    await app.fetch(new Request('http://localhost/items/abc-def'))

    // 所有請求的 routePattern 應該相同
    expect(patterns).toHaveLength(3)
    expect(patterns[0]).toBe('/items/:id')
    expect(patterns[1]).toBe('/items/:id')
    expect(patterns[2]).toBe('/items/:id')
  })
})
