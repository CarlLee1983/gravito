import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { RemixScanner } from '../../src/scanner/adapters/RemixScanner'

describe('RemixScanner', () => {
  const tmpBase = join(import.meta.dir, '.tmp-remix')
  const tmpDir = join(tmpBase, 'app', 'routes')

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpBase, { recursive: true, force: true })
  })

  async function createRouteFile(name: string) {
    await writeFile(join(tmpDir, name), 'export default function() {}')
  }

  it('scans basic routes', async () => {
    await createRouteFile('_index.tsx')
    await createRouteFile('about.tsx')
    await createRouteFile('contact.js')

    const scanner = new RemixScanner({
      routesDir: tmpDir,
    })
    const routes = await scanner.scan()
    const paths = routes.map((r) => r.path).sort()

    expect(paths).toEqual(['/', '/about', '/contact'])
  })

  it('scans nested routes (dot notation)', async () => {
    await createRouteFile('concerts.trending.tsx')
    await createRouteFile('concerts.local.tsx')

    const scanner = new RemixScanner({ routesDir: tmpDir })
    const routes = await scanner.scan()
    const paths = routes.map((r) => r.path).sort()

    expect(paths).toEqual(['/concerts/local', '/concerts/trending'])
  })

  it('scans dynamic routes', async () => {
    await createRouteFile('posts.$id.tsx')
    await createRouteFile('users.$userId.profile.tsx')

    const scanner = new RemixScanner({ routesDir: tmpDir })
    const routes = await scanner.scan()

    // Sort logic might vary, so checking includes
    const paths = routes.map((r) => r.path)
    expect(paths).toContain('/posts/:id')
    expect(paths).toContain('/users/:userId/profile')

    const dynamicRoute = routes.find((r) => r.path === '/posts/:id')
    expect(dynamicRoute?.isDynamic).toBe(true)
    expect(dynamicRoute?.params).toEqual(['id'])
  })

  it('ignores pathless layouts', async () => {
    // _auth.login.tsx -> /login
    await createRouteFile('_auth.login.tsx')
    // _auth.register.tsx -> /register
    await createRouteFile('_auth.register.tsx')

    const scanner = new RemixScanner({ routesDir: tmpDir })
    const routes = await scanner.scan()
    const paths = routes.map((r) => r.path).sort()

    expect(paths).toEqual(['/login', '/register'])
  })

  it('handles nested index routes', async () => {
    // concerts._index.tsx -> /concerts
    await createRouteFile('concerts._index.tsx')

    const scanner = new RemixScanner({ routesDir: tmpDir })
    const routes = await scanner.scan()

    expect(routes[0].path).toBe('/concerts')
  })
})
