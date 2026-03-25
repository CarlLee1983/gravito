import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { AstroScanner } from '../../src/scanner/adapters/AstroScanner'

describe('AstroScanner', () => {
  const tmpBase = join(import.meta.dir, '.tmp-astro')
  const tmpDir = join(tmpBase, 'src', 'pages')

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpBase, { recursive: true, force: true })
  })

  async function createPage(path: string, content = '---') {
    const fullPath = join(tmpDir, path)
    const dir = join(fullPath, '..')
    await mkdir(dir, { recursive: true })
    await writeFile(fullPath, content)
  }

  it('scans basic .astro routes', async () => {
    await createPage('index.astro')
    await createPage('about.astro')
    await createPage('blog/index.astro')

    const scanner = new AstroScanner({ pagesDir: tmpDir })
    const routes = await scanner.scan()
    const paths = routes.map((r) => r.path).sort()

    expect(paths).toEqual(['/', '/about', '/blog'])
  })

  it('scans markdown and endpoint routes', async () => {
    await createPage('post.md')
    await createPage('doc.mdx')
    await createPage('api/data.ts')

    const scanner = new AstroScanner({ pagesDir: tmpDir })
    const routes = await scanner.scan()
    const paths = routes.map((r) => r.path).sort()

    expect(paths).toEqual(['/api/data', '/doc', '/post'])
  })

  it('handles dynamic and catch-all routes', async () => {
    await createPage('posts/[slug].astro')
    await createPage('docs/[...slug].astro')

    const scanner = new AstroScanner({ pagesDir: tmpDir })
    const routes = await scanner.scan()

    const paths = routes.map((r) => r.path)
    expect(paths).toContain('/posts/:slug')
    expect(paths).toContain('/docs/:slug*')

    const dynamicRoute = routes.find((r) => r.path === '/posts/:slug')
    expect(dynamicRoute?.isDynamic).toBe(true)
    expect(dynamicRoute?.params).toEqual(['slug'])
  })

  it('ignores files starting with underscore', async () => {
    await createPage('_sidebar.astro')
    await createPage('about.astro')

    const scanner = new AstroScanner({ pagesDir: tmpDir })
    const routes = await scanner.scan()

    expect(routes.length).toBe(1)
    expect(routes[0].path).toBe('/about')
  })
})
