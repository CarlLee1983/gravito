import { describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ExpressScanner } from '../../src/scanner/adapters/ExpressScanner'
import { GravitoScanner } from '../../src/scanner/adapters/GravitoScanner'
import { HonoScanner } from '../../src/scanner/adapters/HonoScanner'
import { NextScanner } from '../../src/scanner/adapters/NextScanner'
import { NuxtScanner } from '../../src/scanner/adapters/NuxtScanner'

describe('Scanner adapters', () => {
  it('scans express routes with nested routers', async () => {
    const app = {
      _router: {
        stack: [
          {
            route: { path: '/hello', methods: { get: true } },
          },
          {
            name: 'router',
            regexp: /^\/api\/?/,
            handle: {
              stack: [
                {
                  route: { path: '/users/:id', methods: { post: true } },
                },
              ],
            },
          },
        ],
      },
    }
    const scanner = new ExpressScanner(app, { includePatterns: ['/api'] })
    const routes = await scanner.scan()

    expect(routes.find((r) => r.path === '/api/users/:id')?.method).toBe('POST')
  })

  it('scans gravito routes with include filters', async () => {
    const core = {
      router: {
        routes: [
          { method: 'GET', path: '/public' },
          { method: 'CUSTOM', path: '/internal' },
        ],
      },
    }
    const scanner = new GravitoScanner(core as any, { includePatterns: ['/public'] })
    const routes = await scanner.scan()

    expect(routes.length).toBe(1)
    expect(routes[0]?.method).toBe('GET')
  })

  it('scans hono routes and applies exclude patterns', async () => {
    const app = {
      routes: [
        { method: 'GET', path: '/items' },
        { method: 'POST', path: '/admin' },
      ],
    }
    const scanner = new HonoScanner(app as any, { excludePatterns: ['/admin'] })
    const routes = await scanner.scan()

    expect(routes.length).toBe(1)
    expect(routes[0]?.path).toBe('/items')
  })

  it('scans next app and pages directories', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp-next')
    await rm(tmpDir, { recursive: true, force: true })
    await mkdir(join(tmpDir, 'app', '(group)', 'blog', '[slug]'), { recursive: true })
    await mkdir(join(tmpDir, 'pages', 'docs', '[id]'), { recursive: true })

    await writeFile(join(tmpDir, 'app', '(group)', 'page.tsx'), 'export default {}')
    await writeFile(
      join(tmpDir, 'app', '(group)', 'blog', '[slug]', 'page.tsx'),
      'export default {}'
    )
    await writeFile(join(tmpDir, 'pages', 'index.tsx'), 'export default {}')
    await writeFile(join(tmpDir, 'pages', 'docs', '[id]', 'index.tsx'), 'export default {}')

    const scanner = new NextScanner({ cwd: tmpDir, appDir: 'app', pagesDir: 'pages' })
    const routes = await scanner.scan()

    expect(routes.find((r) => r.path === '/')?.method).toBe('GET')
    expect(routes.find((r) => r.path === '/blog/:slug')?.isDynamic).toBe(true)
  })

  it('scans nuxt pages directory', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp-nuxt')
    await rm(tmpDir, { recursive: true, force: true })
    await mkdir(join(tmpDir, 'pages', '_slug'), { recursive: true })
    await mkdir(join(tmpDir, 'pages', 'blog'), { recursive: true })

    await writeFile(join(tmpDir, 'pages', 'index.vue'), '<template />')
    await writeFile(join(tmpDir, 'pages', '_slug', 'index.vue'), '<template />')
    await writeFile(join(tmpDir, 'pages', 'blog', '[id].vue'), '<template />')

    const scanner = new NuxtScanner({ cwd: tmpDir })
    const routes = await scanner.scan()

    expect(routes.find((r) => r.path === '/')?.method).toBe('GET')
    expect(routes.find((r) => r.path === '/:slug')?.isDynamic).toBe(true)
  })
})
