/**
 * @file packages/cosmos/tests/unit/edge-kv-loader.test.ts
 * @description EdgeKVLoader 單元測試
 */

import { describe, expect, it, mock } from 'bun:test'
import type { KVStorage } from '../../src/loaders/EdgeKVLoader'
import { EdgeKVLoader } from '../../src/loaders/EdgeKVLoader'

describe('EdgeKVLoader', () => {
  it('should load translations from KV storage', async () => {
    const mockStorage: KVStorage = {
      get: mock(async (key: string) => {
        if (key === 'i18n:en') {
          return JSON.stringify({ hello: 'Hello' })
        }
        return null
      }),
    }

    const loader = new EdgeKVLoader({
      storage: mockStorage,
    })

    const result = await loader.load('en')
    expect(result).toEqual({ hello: 'Hello' })
    expect(mockStorage.get).toHaveBeenCalledWith('i18n:en')
  })

  it('should return null for missing locale', async () => {
    const mockStorage: KVStorage = {
      get: mock(async () => null),
    }

    const loader = new EdgeKVLoader({
      storage: mockStorage,
    })

    const result = await loader.load('missing')
    expect(result).toBeNull()
  })

  it('should handle JSON parse errors', async () => {
    const mockStorage: KVStorage = {
      get: mock(async () => 'invalid json'),
    }

    const loader = new EdgeKVLoader({
      storage: mockStorage,
    })

    const result = await loader.load('en')
    expect(result).toBeNull()
  })

  it('should support custom prefix', async () => {
    const mockStorage: KVStorage = {
      get: mock(async (key: string) => {
        if (key === 'translations:en') {
          return JSON.stringify({ hello: 'Hello' })
        }
        return null
      }),
    }

    const loader = new EdgeKVLoader({
      storage: mockStorage,
      prefix: 'translations',
    })

    const result = await loader.load('en')
    expect(result).toEqual({ hello: 'Hello' })
    expect(mockStorage.get).toHaveBeenCalledWith('translations:en')
  })

  it('should support custom key template', async () => {
    const mockStorage: KVStorage = {
      get: mock(async (key: string) => {
        if (key === 'translations/en.json') {
          return JSON.stringify({ hello: 'Hello' })
        }
        return null
      }),
    }

    const loader = new EdgeKVLoader({
      storage: mockStorage,
      prefix: 'translations',
      keyTemplate: ':prefix/:locale.json',
    })

    const result = await loader.load('en')
    expect(result).toEqual({ hello: 'Hello' })
    expect(mockStorage.get).toHaveBeenCalledWith('translations/en.json')
  })

  it('should support fallback loader', async () => {
    const mockStorage: KVStorage = {
      get: mock(async () => null),
    }

    const fallbackLoader = {
      name: 'Fallback',
      load: mock(async () => ({ hello: 'Fallback' })),
    }

    const loader = new EdgeKVLoader({
      storage: mockStorage,
    }).fallback(fallbackLoader)

    const result = await loader.load('en')
    expect(result).toEqual({ hello: 'Fallback' })
    expect(fallbackLoader.load).toHaveBeenCalledWith('en')
  })

  it('should support put operation', async () => {
    const mockStorage: KVStorage = {
      get: mock(async () => null),
      put: mock(async () => {}),
    }

    const loader = new EdgeKVLoader({
      storage: mockStorage,
    })

    await loader.put('en', { hello: 'Hello' })

    expect(mockStorage.put).toHaveBeenCalledWith('i18n:en', JSON.stringify({ hello: 'Hello' }))
  })

  it('should throw error if storage does not support put', async () => {
    const mockStorage: KVStorage = {
      get: mock(async () => null),
      // No put method
    }

    const loader = new EdgeKVLoader({
      storage: mockStorage,
    })

    await expect(loader.put('en', { hello: 'Hello' })).rejects.toThrow(
      'Storage does not support put operation'
    )
  })

  it('should support delete operation', async () => {
    const mockStorage: KVStorage = {
      get: mock(async () => null),
      delete: mock(async () => {}),
    }

    const loader = new EdgeKVLoader({
      storage: mockStorage,
    })

    await loader.delete('en')

    expect(mockStorage.delete).toHaveBeenCalledWith('i18n:en')
  })

  it('should throw error if storage does not support delete', async () => {
    const mockStorage: KVStorage = {
      get: mock(async () => null),
      // No delete method
    }

    const loader = new EdgeKVLoader({
      storage: mockStorage,
    })

    await expect(loader.delete('en')).rejects.toThrow('Storage does not support delete operation')
  })

  it('should handle nested translations', async () => {
    const mockStorage: KVStorage = {
      get: mock(async () => {
        return JSON.stringify({
          auth: {
            login: 'Login',
            errors: {
              invalid: 'Invalid credentials',
            },
          },
        })
      }),
    }

    const loader = new EdgeKVLoader({
      storage: mockStorage,
    })

    const result = await loader.load('en')
    expect(result).toEqual({
      auth: {
        login: 'Login',
        errors: {
          invalid: 'Invalid credentials',
        },
      },
    })
  })
})
