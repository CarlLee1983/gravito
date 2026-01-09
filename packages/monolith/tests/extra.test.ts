import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ContentManager } from '../src/ContentManager'
import { Controller } from '../src/Controller'
import { OrbitMonolith } from '../src/index'
import { Sanitizer } from '../src/Sanitizer'

class TestController extends Controller {
  public run() {
    return {
      json: this.json({ ok: true }, 201),
      text: this.text('hi', 202),
      redirect: this.redirect('/next', 303),
      value: this.get<string>('token'),
      req: this.request,
    }
  }

  public async runValidate() {
    return this.validate<{ id: number }>({}, 'json')
  }
}

describe('Controller helpers', () => {
  it('exposes response helpers and request access', async () => {
    const context = {
      json: (data: unknown, status: number) => ({ type: 'json', data, status }),
      text: (text: string, status: number) => ({ type: 'text', text, status }),
      redirect: (url: string, status: number) => ({ type: 'redirect', url, status }),
      get: (key: string) => (key === 'token' ? 'abc' : undefined),
      req: {
        valid: () => ({ id: 42 }),
      },
    }

    const controller = new TestController().setContext(context as any)
    const result = controller.run()

    expect(result.json).toEqual({ type: 'json', data: { ok: true }, status: 201 })
    expect(result.text).toEqual({ type: 'text', text: 'hi', status: 202 })
    expect(result.redirect).toEqual({ type: 'redirect', url: '/next', status: 303 })
    expect(result.value).toBe('abc')
    expect(result.req).toBe(context.req)

    const validated = await controller.runValidate()
    expect(validated.id).toBe(42)
  })
})

describe('Sanitizer', () => {
  it('cleans strings and nested objects', () => {
    expect(Sanitizer.clean('plain')).toBe('plain')

    const data = {
      name: '  Ada  ',
      empty: ' ',
      nested: {
        title: '  Test  ',
      },
      items: ['  one  ', ''],
    }

    const cleaned = Sanitizer.clean(data)
    expect(cleaned).toEqual({
      name: 'Ada',
      empty: null,
      nested: { title: 'Test' },
      items: ['one', null],
    })
  })
})

describe('ContentManager security helpers', () => {
  it('sanitizes path segments and escapes unsafe output', async () => {
    const root = mkdtempSync(join(tmpdir(), 'monolith-content-'))
    const base = join(root, 'content', 'docs', 'en')
    mkdirSync(base, { recursive: true })

    const markdown = `---\ntitle: Safe\n---\n\n<link>\n\n[bad](javascript:alert(1))\n\n[good](https://example.com "Title")`
    writeFileSync(join(base, 'safe.md'), markdown)

    const manager = new ContentManager(root)
    manager.defineCollection('docs', { path: 'content/docs' })

    expect(await manager.find('docs', '../hack', 'en')).toBeNull()
    expect(await manager.list('docs', '../evil')).toEqual([])

    const item = await manager.find('docs', 'safe', 'en')
    expect(item).not.toBeNull()
    expect(item?.body).toContain('&lt;link&gt;')
    expect(item?.body).toContain('bad')
    expect(item?.body).toContain('<a href="https://example.com" title="Title">good</a>')

    await rm(root, { recursive: true, force: true })
  })
})

describe('OrbitMonolith', () => {
  it('injects ContentManager into context', async () => {
    const middlewares: Array<(c: any, next: () => Promise<void>) => Promise<void>> = []

    const core = {
      adapter: {
        use: (_path: string, handler: any) => {
          middlewares.push(handler)
        },
      },
      logger: {
        info: (_message: string) => {},
      },
    }

    const orbit = new OrbitMonolith({
      root: '/tmp',
      collections: { docs: { path: 'content/docs' } },
    })

    orbit.install(core as any)

    const context = {
      set: (key: string, value: unknown) => {
        if (key === 'content') {
          context.content = value
        }
      },
      content: null as null | ContentManager,
    }

    await middlewares[0]?.(context, async () => {})
    expect(context.content).toBeInstanceOf(ContentManager)
  })
})
