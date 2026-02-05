import { describe, expect, it } from 'bun:test'
import { MemoryStore } from '../src/stores/MemoryStore'

describe('MemoryStore - listPaginated', () => {
  it('應該能夠列出所有檔案（無分頁）', async () => {
    const store = new MemoryStore()

    // 建立測試檔案
    await store.put('file1.txt', 'content1')
    await store.put('file2.txt', 'content2')
    await store.put('file3.txt', 'content3')

    const result = await store.listPaginated('')

    expect(result.count).toBe(3)
    expect(result.items).toHaveLength(3)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
    expect(result.items.map((i) => i.key)).toEqual(['file1.txt', 'file2.txt', 'file3.txt'])
  })

  it('應該能夠使用 prefix 過濾檔案', async () => {
    const store = new MemoryStore()

    await store.put('images/photo1.jpg', 'photo1')
    await store.put('images/photo2.jpg', 'photo2')
    await store.put('documents/doc1.pdf', 'doc1')
    await store.put('videos/video1.mp4', 'video1')

    const result = await store.listPaginated('images/')

    expect(result.count).toBe(2)
    expect(result.items.map((i) => i.key)).toEqual(['images/photo1.jpg', 'images/photo2.jpg'])
  })

  it('應該能夠分頁列舉檔案', async () => {
    const store = new MemoryStore()

    // 建立 10 個檔案
    for (let i = 1; i <= 10; i++) {
      await store.put(`file${i.toString().padStart(2, '0')}.txt`, `content${i}`)
    }

    // 第一頁（3 個項目）
    const page1 = await store.listPaginated('', { maxResults: 3 })
    expect(page1.count).toBe(3)
    expect(page1.hasMore).toBe(true)
    expect(page1.nextCursor).toBe('file03.txt')
    expect(page1.items.map((i) => i.key)).toEqual(['file01.txt', 'file02.txt', 'file03.txt'])

    // 第二頁（使用游標）
    const page2 = await store.listPaginated('', { maxResults: 3, cursor: page1.nextCursor! })
    expect(page2.count).toBe(3)
    expect(page2.hasMore).toBe(true)
    expect(page2.nextCursor).toBe('file06.txt')
    expect(page2.items.map((i) => i.key)).toEqual(['file04.txt', 'file05.txt', 'file06.txt'])

    // 第三頁
    const page3 = await store.listPaginated('', { maxResults: 3, cursor: page2.nextCursor! })
    expect(page3.count).toBe(3)
    expect(page3.hasMore).toBe(true)
    expect(page3.items.map((i) => i.key)).toEqual(['file07.txt', 'file08.txt', 'file09.txt'])

    // 最後一頁
    const page4 = await store.listPaginated('', { maxResults: 3, cursor: page3.nextCursor! })
    expect(page4.count).toBe(1)
    expect(page4.hasMore).toBe(false)
    expect(page4.nextCursor).toBeNull()
    expect(page4.items.map((i) => i.key)).toEqual(['file10.txt'])
  })

  it('應該正確處理預設的 maxResults (1000)', async () => {
    const store = new MemoryStore()

    // 建立 5 個檔案
    for (let i = 1; i <= 5; i++) {
      await store.put(`file${i}.txt`, `content${i}`)
    }

    const result = await store.listPaginated('')

    expect(result.count).toBe(5)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  it('應該處理空結果', async () => {
    const store = new MemoryStore()

    const result = await store.listPaginated('non-existent/')

    expect(result.count).toBe(0)
    expect(result.items).toHaveLength(0)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  it('應該處理游標超出範圍的情況', async () => {
    const store = new MemoryStore()

    await store.put('file1.txt', 'content1')
    await store.put('file2.txt', 'content2')

    // 使用一個超出所有項目的游標
    const result = await store.listPaginated('', { cursor: 'zzz-beyond-all-files.txt' })

    expect(result.count).toBe(0)
    expect(result.items).toHaveLength(0)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  it('應該正確處理完整的分頁迭代', async () => {
    const store = new MemoryStore()

    // 建立 25 個檔案
    for (let i = 1; i <= 25; i++) {
      await store.put(`file${i.toString().padStart(3, '0')}.txt`, `content${i}`)
    }

    const allFiles: string[] = []
    let cursor: string | null = null
    let pageCount = 0

    // 分頁迭代，每頁 10 個項目
    do {
      const result = await store.listPaginated('', { maxResults: 10, cursor: cursor ?? undefined })
      allFiles.push(...result.items.map((i) => i.key))
      cursor = result.nextCursor
      pageCount++

      // 防止無限迴圈
      if (pageCount > 10) {
        break
      }
    } while (cursor !== null)

    expect(allFiles).toHaveLength(25)
    expect(pageCount).toBe(3) // 10 + 10 + 5
    // 驗證順序正確
    expect(allFiles[0]).toBe('file001.txt')
    expect(allFiles[24]).toBe('file025.txt')
  })

  it('應該包含正確的檔案元資料', async () => {
    const store = new MemoryStore()

    await store.put('test.txt', 'hello world')

    const result = await store.listPaginated('')

    expect(result.items[0]).toMatchObject({
      key: 'test.txt',
      isDirectory: false,
      size: 11,
    })
    expect(result.items[0].lastModified).toBeInstanceOf(Date)
  })

  it('應該能夠處理巢狀目錄結構', async () => {
    const store = new MemoryStore()

    await store.put('a/b/c/file1.txt', 'content1')
    await store.put('a/b/file2.txt', 'content2')
    await store.put('a/file3.txt', 'content3')
    await store.put('x/y/file4.txt', 'content4')

    // 列出 a/ 下的所有檔案
    const resultA = await store.listPaginated('a/')
    expect(resultA.count).toBe(3)
    expect(resultA.items.map((i) => i.key)).toEqual([
      'a/b/c/file1.txt',
      'a/b/file2.txt',
      'a/file3.txt',
    ])

    // 列出 a/b/ 下的所有檔案
    const resultAB = await store.listPaginated('a/b/')
    expect(resultAB.count).toBe(2)
    expect(resultAB.items.map((i) => i.key)).toEqual(['a/b/c/file1.txt', 'a/b/file2.txt'])
  })

  it('應該處理 maxResults 為 1 的極端情況', async () => {
    const store = new MemoryStore()

    await store.put('file1.txt', 'content1')
    await store.put('file2.txt', 'content2')
    await store.put('file3.txt', 'content3')

    const page1 = await store.listPaginated('', { maxResults: 1 })
    expect(page1.count).toBe(1)
    expect(page1.hasMore).toBe(true)
    expect(page1.items[0].key).toBe('file1.txt')

    const page2 = await store.listPaginated('', { maxResults: 1, cursor: page1.nextCursor! })
    expect(page2.count).toBe(1)
    expect(page2.hasMore).toBe(true)
    expect(page2.items[0].key).toBe('file2.txt')

    const page3 = await store.listPaginated('', { maxResults: 1, cursor: page2.nextCursor! })
    expect(page3.count).toBe(1)
    expect(page3.hasMore).toBe(false)
    expect(page3.nextCursor).toBeNull()
    expect(page3.items[0].key).toBe('file3.txt')
  })

  it('應該處理大量檔案的效能測試', async () => {
    const store = new MemoryStore()

    // 建立 1000 個檔案
    const totalFiles = 1000
    for (let i = 1; i <= totalFiles; i++) {
      await store.put(`file${i.toString().padStart(4, '0')}.txt`, `content${i}`)
    }

    // 測試第一頁的效能
    const startTime = performance.now()
    const result = await store.listPaginated('', { maxResults: 100 })
    const endTime = performance.now()

    expect(result.count).toBe(100)
    expect(result.hasMore).toBe(true)

    // 應該在合理時間內完成（< 100ms）
    expect(endTime - startTime).toBeLessThan(100)
  })
})
