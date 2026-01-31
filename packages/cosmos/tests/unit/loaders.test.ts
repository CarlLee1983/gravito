/**
 * @file packages/cosmos/tests/unit/loaders.test.ts
 * @description 測試新的 TranslationLoader 實現
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TranslationMap } from '../../src/I18nService'
import { ChainedLoader } from '../../src/loaders/ChainedLoader'
import { FileSystemLoader } from '../../src/loaders/FileSystemLoader'
import { RemoteLoader } from '../../src/loaders/RemoteLoader'

describe('TranslationLoaders', () => {
  describe('FileSystemLoader', () => {
    let tmpDir: string

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'gravito-cosmos-test-'))
    })

    afterEach(async () => {
      await rm(tmpDir, { force: true, recursive: true })
    })

    it('should load translation from filesystem', async () => {
      writeFileSync(
        join(tmpDir, 'zh-TW.json'),
        JSON.stringify({ welcome: '歡迎', auth: { login: '登入' } })
      )

      const loader = new FileSystemLoader({ baseDir: tmpDir })
      const translations = await loader.load('zh-TW')

      expect(translations).not.toBeNull()
      expect(translations?.welcome).toBe('歡迎')
      expect((translations?.auth as TranslationMap)?.login).toBe('登入')
    })

    it('should return null for missing locale', async () => {
      const loader = new FileSystemLoader({ baseDir: tmpDir })
      const translations = await loader.load('non-existent')

      expect(translations).toBeNull()
    })

    it('should support custom extension', async () => {
      writeFileSync(join(tmpDir, 'en.txt'), JSON.stringify({ hello: 'Hello' }))

      const loader = new FileSystemLoader({
        baseDir: tmpDir,
        extension: '.txt',
      })
      const translations = await loader.load('en')

      expect(translations).not.toBeNull()
      expect(translations?.hello).toBe('Hello')
    })

    it('should support fallback loader', async () => {
      const fallbackLoader = {
        name: 'FallbackLoader',
        load: async () => ({ fallback: 'Fallback Value' }),
      }

      const loader = new FileSystemLoader({ baseDir: tmpDir }).fallback(fallbackLoader)
      const translations = await loader.load('missing')

      expect(translations).not.toBeNull()
      expect(translations?.fallback).toBe('Fallback Value')
    })
  })

  describe('RemoteLoader', () => {
    it('should load translation from remote API', async () => {
      // Mock fetch
      const mockFetch = mock((url: string) => {
        if (url.includes('zh-TW')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Map([['ETag', '"abc123"']]),
            json: async () => ({ remote: '遠端翻譯' }),
          })
        }
        return Promise.resolve({
          ok: false,
          status: 404,
        })
      })

      globalThis.fetch = mockFetch as any

      const loader = new RemoteLoader({
        url: 'https://api.example.com/i18n/:locale',
      })
      const translations = await loader.load('zh-TW')

      expect(translations).not.toBeNull()
      expect(translations?.remote).toBe('遠端翻譯')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should return null on HTTP error', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      ) as any

      const loader = new RemoteLoader({
        url: 'https://api.example.com/i18n/:locale',
        retries: 0, // 不重試以加快測試
      })
      const translations = await loader.load('en')

      expect(translations).toBeNull()
    })

    it('should support ETag caching', async () => {
      let callCount = 0
      globalThis.fetch = mock((_url: string, options?: any) => {
        callCount++
        const ifNoneMatch = options?.headers?.['If-None-Match']

        // 第一次請求
        if (!ifNoneMatch) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Map([['ETag', '"v1"']]),
            json: async () => ({ version: '1.0' }),
          })
        }

        // 第二次請求帶 ETag,返回 304
        return Promise.resolve({
          ok: true,
          status: 304,
          headers: new Map([['ETag', '"v1"']]),
        })
      }) as any

      const loader = new RemoteLoader({
        url: 'https://api.example.com/i18n/:locale',
        etagCache: true,
      })

      // 第一次載入
      const translations1 = await loader.load('en')
      expect(translations1?.version).toBe('1.0')

      // 第二次載入 (應該使用快取)
      const translations2 = await loader.load('en')
      expect(translations2?.version).toBe('1.0')
      expect(callCount).toBe(2)
    })

    it('should retry on failure', async () => {
      let attemptCount = 0
      globalThis.fetch = mock(() => {
        attemptCount++
        // 前兩次失敗,第三次成功
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map(),
          json: async () => ({ retry: 'success' }),
        })
      }) as any

      const loader = new RemoteLoader({
        url: 'https://api.example.com/i18n/:locale',
        retries: 3,
        retryDelay: 10, // 短延遲以加快測試
      })
      const translations = await loader.load('en')

      expect(translations).not.toBeNull()
      expect(translations?.retry).toBe('success')
      expect(attemptCount).toBe(3)
    })

    it('should support custom headers', async () => {
      let receivedHeaders: Record<string, string> = {}

      globalThis.fetch = mock((_url: string, options?: any) => {
        receivedHeaders = options?.headers || {}
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map(),
          json: async () => ({}),
        })
      }) as any

      const loader = new RemoteLoader({
        url: 'https://api.example.com/i18n/:locale',
        headers: {
          Authorization: 'Bearer token123',
          'X-Custom': 'value',
        },
      })
      await loader.load('en')

      expect(receivedHeaders.Authorization).toBe('Bearer token123')
      expect(receivedHeaders['X-Custom']).toBe('value')
    })
  })

  describe('ChainedLoader', () => {
    it('should try loaders in sequence', async () => {
      const loader1 = {
        name: 'Loader1',
        load: async () => null, // 失敗
      }

      const loader2 = {
        name: 'Loader2',
        load: async () => ({ source: 'loader2' }), // 成功
      }

      const loader3 = {
        name: 'Loader3',
        load: async () => ({ source: 'loader3' }), // 不應該被呼叫
      }

      const chained = new ChainedLoader([loader1, loader2, loader3])
      const translations = await chained.load('en')

      expect(translations).not.toBeNull()
      expect(translations?.source).toBe('loader2')
    })

    it('should return null if all loaders fail', async () => {
      const loader1 = {
        name: 'Loader1',
        load: async () => null,
      }

      const loader2 = {
        name: 'Loader2',
        load: async () => null,
      }

      const chained = new ChainedLoader([loader1, loader2])
      const translations = await chained.load('en')

      expect(translations).toBeNull()
    })

    it('should support append and prepend', async () => {
      const loader1 = { name: 'L1', load: async () => ({ order: '1' }) }
      const loader2 = { name: 'L2', load: async () => null }
      const loader3 = { name: 'L3', load: async () => null }

      const chained = new ChainedLoader([loader2])
      chained.prepend(loader3) // [loader3, loader2]
      chained.append(loader1) // [loader3, loader2, loader1]

      const loaders = chained.getLoaders()
      expect(loaders[0].name).toBe('L3')
      expect(loaders[1].name).toBe('L2')
      expect(loaders[2].name).toBe('L1')
    })

    it('should support fallback loader', async () => {
      const mainLoader = {
        name: 'MainLoader',
        load: async () => null,
      }

      const fallbackLoader = {
        name: 'FallbackLoader',
        load: async () => ({ fallback: 'used' }),
      }

      const chained = new ChainedLoader([mainLoader]).fallback(fallbackLoader)
      const translations = await chained.load('en')

      expect(translations).not.toBeNull()
      expect(translations?.fallback).toBe('used')
    })
  })
})
