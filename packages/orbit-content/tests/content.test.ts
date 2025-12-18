import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { ContentManager } from '../src/ContentManager'

describe('Orbit Content Manager', () => {
  const rootDir = join(import.meta.dir, 'fixtures')
  const manager = new ContentManager(rootDir)

  manager.defineCollection('docs', {
    path: 'docs',
  })

  test('it reads markdown content with frontmatter', async () => {
    const item = await manager.find('docs', 'install', 'en')

    expect(item).not.toBeNull()
    expect(item?.slug).toBe('install')
    expect(item?.meta.title).toBe('Installation Guide')
    expect(item?.body).toContain('<h1>Installation</h1>')
    expect(item?.body).toContain('<pre><code class="language-bash">bun add @gravito/core')
  })

  test('it respects locale', async () => {
    const item = await manager.find('docs', 'install', 'zh')

    expect(item).not.toBeNull()
    expect(item?.meta.title).toBe('安裝指南')
    expect(item?.body).toContain('<h1>安裝</h1>')
  })

  test('it returns null for missing files', async () => {
    const item = await manager.find('docs', 'missing', 'en')
    expect(item).toBeNull()
  })

  test('it lists items in collection', async () => {
    const items = await manager.list('docs', 'en')
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].slug).toBe('install')
  })
})
