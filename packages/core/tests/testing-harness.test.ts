import { beforeEach, describe, expect, it } from 'bun:test'
import { createHttpTester, PlanetCore } from '../src'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'

describe('Testing Harness (Laravel style)', () => {
  let core: PlanetCore
  let tester: any

  beforeEach(async () => {
    core = await PlanetCore.boot({
      adapter: new BunNativeAdapter(),
      config: { APP_NAME: 'Test' },
    })
    tester = createHttpTester(core)
  })

  it('should support fluent status assertions', async () => {
    core.router.get('/ok', (c) => c.text('OK'))
    core.router.get('/not-found', (c) => c.notFound())
    core.router.get('/created', (c) => c.text('Created', 201))

    await (await tester.get('/ok')).assertOk().assertSee('OK')
    await (await tester.get('/not-found')).assertNotFound()
    await (await tester.get('/created')).assertCreated()
  })

  it('should support JSON assertions', async () => {
    core.router.get('/json', (c) => c.json({ foo: 'bar', baz: 123 }))

    const response = await tester.get('/json')
    await response.assertStatus(200)
    await response.assertJson({ foo: 'bar' })
    await response.assertExactJson({ foo: 'bar', baz: 123 })
  })

  it('should support JSON structure assertions', async () => {
    core.router.get('/users', (c) =>
      c.json({
        data: [
          { id: 1, name: 'Carl' },
          { id: 2, name: 'Lee' },
        ],
        meta: { total: 2 },
      })
    )

    const response = await tester.get('/users')
    await response.assertJsonStructure({
      data: [{ id: 1, name: 'Carl' }],
      meta: { total: 2 },
    })
  })

  it('should support negative assertions', async () => {
    core.router.get('/hello', (c) => c.text('Hello World'))

    const response = await tester.get('/hello')
    await response.assertSee('Hello')
    await response.assertDontSee('Goodbye')
  })

  it('should handle POST requests with data', async () => {
    core.router.post('/submit', async (c) => {
      const body = await c.req.json()
      return c.json({ status: 'received', data: body })
    })

    const response = await tester.post('/submit', { message: 'hello' })
    await response.assertOk()
    await response.assertJson({ data: { message: 'hello' } })
  })

  it('should assert headers', async () => {
    core.router.get('/header', (c) => {
      c.header('X-Test', 'Gravito')
      return c.text('OK')
    })

    await (await tester.get('/header')).assertHeader('X-Test', 'Gravito')
  })

  it('should assert header missing', async () => {
    core.router.get('/no-header', (c) => c.text('OK'))
    await (await tester.get('/no-header')).assertHeaderMissing('X-Missing')
  })

  it('should persist multiple cookies including expires attributes', async () => {
    core.router.get('/login', (c) => {
      c.header('Set-Cookie', 'session=abc123; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Path=/', {
        append: true,
      })
      c.header('Set-Cookie', 'theme=dark; Path=/', { append: true })
      return c.text('logged in')
    })

    core.router.get('/me', (c) => {
      const cookie = c.req.header('cookie') ?? ''
      return c.json({ cookie })
    })

    await tester.get('/login')
    const response = await tester.get('/me')

    expect(await response.getJson()).toEqual({
      cookie: 'session=abc123; theme=dark',
    })
  })
})
