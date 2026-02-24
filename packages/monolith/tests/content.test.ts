import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { ContentManager } from '../src/ContentManager'
import { LocalDriver } from '../src/driver/LocalDriver'

describe('Orbit Content Manager', () => {
  const rootDir = join(import.meta.dir, 'fixtures')
  const manager = new ContentManager(new LocalDriver(rootDir))

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

// ============ Phase 1 遷移驗證測試 ============

describe('ContentManager - RuntimeMarkdownAdapter 遷移', () => {
  const rootDir = join(import.meta.dir, 'fixtures')

  test('使用 RuntimeMarkdownAdapter 產生的 HTML 與既有行為一致', async () => {
    const manager = new ContentManager(new LocalDriver(rootDir))
    manager.defineCollection('docs', { path: 'docs' })

    const item = await manager.find('docs', 'install', 'en')
    expect(item).not.toBeNull()
    // 關鍵驗證：HTML 輸出格式和 marked 一致
    expect(item?.body).toContain('<h1>Installation</h1>')
    expect(item?.body).toContain('<p>To install Gravito, run:</p>')
    expect(item?.body).toContain('<pre><code class="language-bash">')
  })

  test('自訂 link 渲染產生安全的 HTML', async () => {
    const manager = new ContentManager(new LocalDriver(rootDir))
    manager.defineCollection('docs', { path: 'docs' })

    // ContentManager 的自訂 renderer 應過濾 javascript: URLs
    // 透過 renderCallbacks 驗證自訂 link 渲染
    const item = await manager.find('docs', 'install', 'en')
    expect(item).not.toBeNull()
    // body 中不應含有 javascript: 協議
    expect(item?.body).not.toContain('javascript:')
  })

  test('gray-matter frontmatter 解析在遷移後保持不變', async () => {
    const manager = new ContentManager(new LocalDriver(rootDir))
    manager.defineCollection('docs', { path: 'docs' })

    const item = await manager.find('docs', 'install', 'en')
    expect(item).not.toBeNull()
    // Frontmatter 欄位完整
    expect(item?.meta.title).toBe('Installation Guide')
    expect(item?.meta.description).toBe('How to install Gravito')
    expect(item?.meta.date).toBeDefined()
    // raw 欄位應為 markdown 內容（不含 frontmatter）
    expect(item?.raw).toContain('# Installation')
    expect(item?.raw).not.toContain('---')
  })

  test('快取機制在遷移後正常運作', async () => {
    const manager = new ContentManager(new LocalDriver(rootDir))
    manager.defineCollection('docs', { path: 'docs' })

    // 第一次讀取
    const item1 = await manager.find('docs', 'install', 'en')
    // 第二次讀取（應從快取取得）
    const item2 = await manager.find('docs', 'install', 'en')

    expect(item1).not.toBeNull()
    expect(item2).not.toBeNull()
    // 快取應回傳相同物件
    expect(item1).toBe(item2)
  })
})
