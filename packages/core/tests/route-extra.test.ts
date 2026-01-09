import { afterEach, describe, expect, it } from 'bun:test'
import { setApp } from '../src/helpers'
import { PlanetCore } from '../src/PlanetCore'
import { Route } from '../src/Route'

const responseText = async (res: Response) => res.text()

describe('Route static facade', () => {
  afterEach(() => {
    setApp(null)
  })

  it('registers routes via static methods', async () => {
    const core = new PlanetCore()
    setApp(core)

    Route.get('/hello', (c) => c.text('hello'))
    Route.post('/submit', (c) => c.text('post'))
    Route.put('/item/:id', (c) => c.text(`put:${c.req.param('id')}`))
    Route.delete('/item/:id', (c) => c.text(`del:${c.req.param('id')}`))
    Route.patch('/item/:id', (c) => c.text(`patch:${c.req.param('id')}`))

    const res1 = await core.adapter.fetch(new Request('http://localhost/hello'))
    expect(await responseText(res1)).toBe('hello')

    const res2 = await core.adapter.fetch(
      new Request('http://localhost/submit', { method: 'POST' })
    )
    expect(await responseText(res2)).toBe('post')

    const res3 = await core.adapter.fetch(
      new Request('http://localhost/item/42', { method: 'PUT' })
    )
    expect(await responseText(res3)).toBe('put:42')

    const res4 = await core.adapter.fetch(
      new Request('http://localhost/item/7', { method: 'DELETE' })
    )
    expect(await responseText(res4)).toBe('del:7')

    const res5 = await core.adapter.fetch(
      new Request('http://localhost/item/9', { method: 'PATCH' })
    )
    expect(await responseText(res5)).toBe('patch:9')
  })

  it('supports prefix and middleware groups', async () => {
    const core = new PlanetCore()
    setApp(core)
    let seen = false

    Route.middleware(async (_c, next) => {
      seen = true
      await next()
    })
      .prefix('/api')
      .group((r) => {
        r.get('/ping', (c) => c.text('pong'))
      })

    const res = await core.adapter.fetch(new Request('http://localhost/api/ping'))
    expect(await responseText(res)).toBe('pong')
    expect(seen).toBe(true)
  })

  it('registers named routes via Route.name', async () => {
    const core = new PlanetCore()
    setApp(core)

    core.router.get('/named/:id', (c) => c.text(`named:${c.req.param('id')}`)).name('named.show')

    expect(core.router.url('named.show', { id: 5 })).toBe('/named/5')

    const res = await core.adapter.fetch(new Request('http://localhost/named/5'))
    expect(await responseText(res)).toBe('named:5')
  })
})
