import { describe, expect, it, jest } from 'bun:test'
import { ShadowProcessor } from '../src/core/ShadowProcessor'
import { MemorySitemapStorage } from '../src/storage/MemorySitemapStorage'

describe('MemorySitemapStorage', () => {
  it('normalizes baseUrl and filename in getUrl', () => {
    const storage = new MemorySitemapStorage('https://example.com/')
    expect(storage.getUrl('/sitemap.xml')).toBe('https://example.com/sitemap.xml')
  })
})

describe('ShadowProcessor', () => {
  it('writes directly when disabled', async () => {
    const storage = {
      write: jest.fn(),
      writeShadow: jest.fn(),
      commitShadow: jest.fn(),
    }
    const processor = new ShadowProcessor({
      storage: storage as any,
      mode: 'atomic',
      enabled: false,
    })

    await processor.addOperation({ filename: 'sitemap.xml', content: '<xml />' })

    expect(storage.write).toHaveBeenCalledWith('sitemap.xml', '<xml />')
    expect(storage.writeShadow).not.toHaveBeenCalled()
    expect(processor.getOperations()).toEqual([])
  })

  it('writes shadow operations and commits atomically', async () => {
    const storage = {
      write: jest.fn(),
      writeShadow: jest.fn(),
      commitShadow: jest.fn(),
    }
    const processor = new ShadowProcessor({
      storage: storage as any,
      mode: 'atomic',
      enabled: true,
    })

    await processor.addOperation({ filename: 'sitemap.xml', content: '<xml />' })
    await processor.commit()

    expect(storage.writeShadow).toHaveBeenCalledWith(
      'sitemap.xml',
      '<xml />',
      processor.getShadowId()
    )
    expect(storage.commitShadow).toHaveBeenCalledWith(processor.getShadowId())
    expect(processor.getOperations()).toEqual([])
  })

  it('commits versioned operations per entry', async () => {
    const storage = {
      write: jest.fn(),
      writeShadow: jest.fn(),
      commitShadow: jest.fn(),
    }
    const processor = new ShadowProcessor({
      storage: storage as any,
      mode: 'versioned',
      enabled: true,
    })

    await processor.addOperation({ filename: 'a.xml', content: '<a />', shadowId: 'a' })
    await processor.addOperation({ filename: 'b.xml', content: '<b />', shadowId: 'b' })
    await processor.commit()

    expect(storage.commitShadow).toHaveBeenCalledTimes(2)
    expect(storage.commitShadow).toHaveBeenCalledWith('a')
    expect(storage.commitShadow).toHaveBeenCalledWith('b')
  })
})
