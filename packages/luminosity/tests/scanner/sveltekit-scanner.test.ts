import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { SvelteKitScanner } from '../../src/scanner/adapters/SvelteKitScanner'

describe('SvelteKitScanner', () => {
  const tmpDir = join(process.cwd(), 'tests', '.tmp-svelte', 'src', 'routes')

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(join(process.cwd(), 'tests', '.tmp-svelte'), { recursive: true, force: true })
  })

  async function createPage(path: string) {
    const dir = join(tmpDir, path)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, '+page.svelte'), '<script></script>')
  }

  it('scans basic routes', async () => {
    await createPage('.') // Root /
    await createPage('about') // /about
    await createPage('contact') // /contact

    const scanner = new SvelteKitScanner({ routesDir: tmpDir })
    const routes = await scanner.scan()
    const paths = routes.map((r) => r.path).sort()

    expect(paths).toEqual(['/', '/about', '/contact'])
  })

  it('scans nested routes', async () => {
    await createPage('blog')
    await createPage('blog/first-post')

    const scanner = new SvelteKitScanner({ routesDir: tmpDir })
    const routes = await scanner.scan()
    const paths = routes.map((r) => r.path).sort()

    expect(paths).toEqual(['/blog', '/blog/first-post'])
  })

  it('scans dynamic routes', async () => {
    await createPage('users/[id]')
    await createPage('posts/[...slug]') // Catch all

    const scanner = new SvelteKitScanner({ routesDir: tmpDir })
    const routes = await scanner.scan()

    const paths = routes.map((r) => r.path)
    expect(paths).toContain('/users/:id')
    expect(paths).toContain('/posts/:slug*')

    const dynamicRoute = routes.find((r) => r.path === '/users/:id')
    expect(dynamicRoute?.isDynamic).toBe(true)
    expect(dynamicRoute?.params).toEqual(['id'])
  })

  it('ignores groups in path', async () => {
    // (app)/dashboard -> /dashboard
    await createPage('(app)/dashboard')

    const scanner = new SvelteKitScanner({ routesDir: tmpDir })
    const routes = await scanner.scan()

    expect(routes[0].path).toBe('/dashboard')
  })
})
