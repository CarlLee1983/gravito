import { describe, expect, it } from 'bun:test'
import { MemoryStore } from '../src/stores/MemoryStore'

describe('MemoryStore - Metadata Enhancement', () => {
  it('應該能夠使用 contentType 選項上傳檔案', async () => {
    const store = new MemoryStore()

    await store.put('document.pdf', 'PDF content', {
      contentType: 'application/pdf',
    })

    const metadata = await store.getMetadata('document.pdf')
    expect(metadata?.mimeType).toBe('application/pdf')
  })

  it('應該能夠使用 customMetadata 選項上傳檔案', async () => {
    const store = new MemoryStore()

    await store.put('image.jpg', 'image data', {
      contentType: 'image/jpeg',
      metadata: {
        author: 'John Doe',
        description: 'A beautiful sunset',
        tags: 'nature,sunset,photography',
      },
    })

    const metadata = await store.getMetadata('image.jpg')
    expect(metadata?.customMetadata).toEqual({
      author: 'John Doe',
      description: 'A beautiful sunset',
      tags: 'nature,sunset,photography',
    })
  })

  it('應該能夠使用完整的 PutOptions', async () => {
    const store = new MemoryStore()

    await store.put('video.mp4', 'video data', {
      contentType: 'video/mp4',
      metadata: {
        duration: '120',
        resolution: '1920x1080',
      },
      cacheControl: 'public, max-age=31536000',
      contentDisposition: 'attachment; filename="my-video.mp4"',
    })

    const metadata = await store.getMetadata('video.mp4')
    expect(metadata?.mimeType).toBe('video/mp4')
    expect(metadata?.customMetadata).toEqual({
      duration: '120',
      resolution: '1920x1080',
    })
  })

  it('應該能夠上傳不帶 options 的檔案（向後相容）', async () => {
    const store = new MemoryStore()

    await store.put('simple.txt', 'simple content')

    const metadata = await store.getMetadata('simple.txt')
    expect(metadata?.key).toBe('simple.txt')
    expect(metadata?.size).toBe(14)
    expect(metadata?.customMetadata).toBeUndefined()
  })

  it('應該能夠使用 setMetadata 更新自定義 metadata', async () => {
    const store = new MemoryStore()

    // 先上傳檔案
    await store.put('article.md', 'Article content')

    // 更新 metadata
    await store.setMetadata('article.md', {
      author: 'Alice',
      category: 'Technology',
    })

    const metadata = await store.getMetadata('article.md')
    expect(metadata?.customMetadata).toEqual({
      author: 'Alice',
      category: 'Technology',
    })
  })

  it('setMetadata 應該合併現有的 metadata', async () => {
    const store = new MemoryStore()

    // 上傳檔案時設定初始 metadata
    await store.put('config.json', '{}', {
      metadata: {
        version: '1.0',
        author: 'Bob',
      },
    })

    // 更新部分 metadata
    await store.setMetadata('config.json', {
      version: '2.0',
      updatedAt: '2026-02-01',
    })

    const metadata = await store.getMetadata('config.json')
    expect(metadata?.customMetadata).toEqual({
      version: '2.0', // 已更新
      author: 'Bob', // 保持不變
      updatedAt: '2026-02-01', // 新增
    })
  })

  it('setMetadata 應該在檔案不存在時拋出錯誤', async () => {
    const store = new MemoryStore()

    await expect(store.setMetadata('non-existent.txt', { key: 'value' })).rejects.toThrow(
      '[MemoryStore] File not found: non-existent.txt'
    )
  })

  it('應該能夠處理空的 customMetadata', async () => {
    const store = new MemoryStore()

    await store.put('empty-meta.txt', 'content', {
      metadata: {},
    })

    const metadata = await store.getMetadata('empty-meta.txt')
    expect(metadata?.customMetadata).toEqual({})
  })

  it('應該能夠處理包含特殊字元的 metadata 值', async () => {
    const store = new MemoryStore()

    await store.put('special.txt', 'content', {
      metadata: {
        description: '特殊字元測試 <>&"\'',
        url: 'https://example.com/path?query=value&foo=bar',
        json: '{"key": "value"}',
      },
    })

    const metadata = await store.getMetadata('special.txt')
    expect(metadata?.customMetadata).toEqual({
      description: '特殊字元測試 <>&"\'',
      url: 'https://example.com/path?query=value&foo=bar',
      json: '{"key": "value"}',
    })
  })

  it('應該能夠覆寫檔案時保留新的 metadata', async () => {
    const store = new MemoryStore()

    // 第一次上傳
    await store.put('overwrite.txt', 'original content', {
      metadata: {
        version: '1.0',
      },
    })

    // 覆寫檔案並更新 metadata
    await store.put('overwrite.txt', 'new content', {
      metadata: {
        version: '2.0',
      },
    })

    const metadata = await store.getMetadata('overwrite.txt')
    expect(metadata?.customMetadata).toEqual({
      version: '2.0',
    })
  })

  it('應該能夠處理多個檔案各自的 metadata', async () => {
    const store = new MemoryStore()

    await store.put('file1.txt', 'content1', {
      metadata: { id: '1', type: 'text' },
    })

    await store.put('file2.txt', 'content2', {
      metadata: { id: '2', type: 'document' },
    })

    await store.put('file3.txt', 'content3', {
      metadata: { id: '3', type: 'report' },
    })

    const meta1 = await store.getMetadata('file1.txt')
    const meta2 = await store.getMetadata('file2.txt')
    const meta3 = await store.getMetadata('file3.txt')

    expect(meta1?.customMetadata?.id).toBe('1')
    expect(meta2?.customMetadata?.id).toBe('2')
    expect(meta3?.customMetadata?.id).toBe('3')

    expect(meta1?.customMetadata?.type).toBe('text')
    expect(meta2?.customMetadata?.type).toBe('document')
    expect(meta3?.customMetadata?.type).toBe('report')
  })

  it('setMetadata 應該更新 lastModified 時間', async () => {
    const store = new MemoryStore()

    await store.put('timestamp.txt', 'content')

    const meta1 = await store.getMetadata('timestamp.txt')
    const firstModified = meta1?.lastModified

    // 等待一小段時間
    await new Promise((resolve) => setTimeout(resolve, 10))

    await store.setMetadata('timestamp.txt', { updated: 'true' })

    const meta2 = await store.getMetadata('timestamp.txt')
    const secondModified = meta2?.lastModified

    expect(secondModified).toBeInstanceOf(Date)
    expect(secondModified?.getTime()).toBeGreaterThan(firstModified?.getTime())
  })

  it('應該能夠使用 contentType 選項影響 Blob 類型', async () => {
    const store = new MemoryStore()

    // 使用字串上傳，指定 contentType
    await store.put('data.json', '{"key": "value"}', {
      contentType: 'application/json',
    })

    const blob = await store.get('data.json')
    expect(blob).toBeInstanceOf(Blob)
    // Blob type may include charset, so we use toContain
    expect(blob?.type).toContain('application/json')
  })

  it('應該能夠處理 metadata 鍵值對數量限制', async () => {
    const store = new MemoryStore()

    // 建立大量 metadata
    const largeMetadata: Record<string, string> = {}
    for (let i = 0; i < 100; i++) {
      largeMetadata[`key${i}`] = `value${i}`
    }

    await store.put('large-meta.txt', 'content', {
      metadata: largeMetadata,
    })

    const metadata = await store.getMetadata('large-meta.txt')
    expect(Object.keys(metadata?.customMetadata ?? {}).length).toBe(100)
    expect(metadata?.customMetadata?.key0).toBe('value0')
    expect(metadata?.customMetadata?.key99).toBe('value99')
  })
})
