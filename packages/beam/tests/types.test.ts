import { describe, expect, mock, test } from 'bun:test'
import { Photon } from '@gravito/photon'
import { createBeam } from '../src/index'

const app = new Photon()
  .get('/users', (c) => c.json({ users: [{ id: 1, name: 'Alice' }] }))
  .post('/users', (c) => c.json({ id: 2, name: 'Bob' }))
  .get('/users/:id', (c) => c.json({ id: parseInt(c.req.param('id')), name: 'Alice' }))
  .post('/posts/:postId/comments', (c) => c.json({ id: 1, text: 'Hello' }))

type AppType = typeof app

describe('Type Inference Tests', () => {
  test('should construct correct URL for simple routes', async () => {
    let capturedUrl = ''
    globalThis.fetch = mock((url) => {
      capturedUrl = url.toString()
      return Promise.resolve(new Response(JSON.stringify({ users: [] })))
    })

    const client = createBeam<AppType>('http://localhost:3000')
    await client.users.$get()
    expect(capturedUrl).toBe('http://localhost:3000/users')
  })

  test('should construct correct URL for parameterized routes', async () => {
    let capturedUrl = ''
    globalThis.fetch = mock((url) => {
      capturedUrl = url.toString()
      return Promise.resolve(new Response(JSON.stringify({})))
    })

    const client = createBeam<AppType>('http://localhost:3000')
    await client.users[':id'].$get({ param: { id: '123' } })
    expect(capturedUrl).toBe('http://localhost:3000/users/123')
  })

  test('should construct correct URL for nested parameterized routes', async () => {
    let capturedUrl = ''
    globalThis.fetch = mock((url) => {
      capturedUrl = url.toString()
      return Promise.resolve(new Response(JSON.stringify({})))
    })

    const client = createBeam<AppType>('http://localhost:3000')
    await client.posts[':postId'].comments.$post({
      param: { postId: '999' },
      json: { text: 'test' } as any,
    })
    expect(capturedUrl).toBe('http://localhost:3000/posts/999/comments')
  })
})
