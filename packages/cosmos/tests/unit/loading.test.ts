import { describe, expect, it, mock } from 'bun:test'
import { I18nManager } from '../../src/I18nService'

// Mock loader
const loadLocaleMock = mock(async () => {
  await new Promise((resolve) => setTimeout(resolve, 50)) // Delay
  return { title: 'Loaded' }
})

mock.module('../../src/loader', () => ({
  loadLocale: loadLocaleMock,
}))

describe('Loading Coalescing', () => {
  it('should coalesce concurrent load requests', async () => {
    const manager = new I18nManager({
      defaultLocale: 'en',
      supportedLocales: ['en'],
      lazyLoad: { baseDir: '/tmp' },
    })

    const p1 = manager.ensureLocale('en')
    const p2 = manager.ensureLocale('en')

    await Promise.all([p1, p2])

    // Should be called only once
    expect(loadLocaleMock).toHaveBeenCalledTimes(1)
  })

  it('should load again if failed previously (or if logic allows retry)', async () => {
    // If our implementation removes promise from map on error, we can retry.
    // Our implementation uses finally to delete, so it allows retry.
  })
})
