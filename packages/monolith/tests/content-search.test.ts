import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ContentManager } from '../src/ContentManager'
import { LocalDriver } from '../src/driver/LocalDriver'

const TMP_DIR = join(import.meta.dir, 'tmp_search')

describe('ContentManager Search', () => {
  beforeEach(async () => {
    if (existsSync(TMP_DIR)) await rm(TMP_DIR, { recursive: true, force: true })
    await mkdir(join(TMP_DIR, 'docs', 'en'), { recursive: true })
    await mkdir(join(TMP_DIR, 'blog', 'en'), { recursive: true })

    await writeFile(
      join(TMP_DIR, 'docs', 'en', 'install.md'),
      '---\ntitle: Installation Guide\n---\nRun bun install to get started.'
    )
    await writeFile(
      join(TMP_DIR, 'blog', 'en', 'welcome.md'),
      '---\ntitle: Welcome to Gravito\n---\nThis is a framework for everyone.'
    )
  })

  afterEach(async () => {
    if (existsSync(TMP_DIR)) await rm(TMP_DIR, { recursive: true, force: true })
  })

  it('should find items by keyword', async () => {
    const manager = new ContentManager(new LocalDriver(TMP_DIR))
    manager.defineCollection('docs', { path: 'docs' })
    manager.defineCollection('blog', { path: 'blog' })

    // Index items
    await manager.find('docs', 'install')
    await manager.find('blog', 'welcome')

    const results = manager.search('install')
    expect(results.length).toBe(1)
    expect(results[0].slug).toBe('install')

    const results2 = manager.search('framework')
    expect(results2.length).toBe(1)
    expect(results2[0].slug).toBe('welcome')
  })

  it('should support multiple terms (OR logic)', async () => {
    const manager = new ContentManager(new LocalDriver(TMP_DIR))
    manager.defineCollection('docs', { path: 'docs' })
    manager.defineCollection('blog', { path: 'blog' })

    await manager.find('docs', 'install')
    await manager.find('blog', 'welcome')

    const results = manager.search('install framework')
    expect(results.length).toBe(2)
  })

  it('should filter by collection', async () => {
    const manager = new ContentManager(new LocalDriver(TMP_DIR))
    manager.defineCollection('docs', { path: 'docs' })
    manager.defineCollection('blog', { path: 'blog' })

    await manager.find('docs', 'install')
    await manager.find('blog', 'welcome')

    // 'everyone' is in blog
    const results = manager.search('everyone', { collection: 'docs' })
    expect(results.length).toBe(0)

    const results2 = manager.search('everyone', { collection: 'blog' })
    expect(results2.length).toBe(1)
  })
})
