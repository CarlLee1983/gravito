/**
 * @fileoverview 共用 mock 工廠函式
 *
 * 提供 ForgeService、StatusStore、RuntimeAdapter 和 StorageProvider 的 mock 物件，
 * 確保所有測試使用一致的 mock 實作。
 */

import { jest } from 'bun:test'
import type { ProcessingStatus } from '../../src/types'

/**
 * 建立 mock ForgeService
 *
 * process() 預設回傳成功結果，並在有 onProgress 時觸發進度回調。
 */
export function createMockForgeService(overrides: Record<string, unknown> = {}) {
  return {
    process: jest.fn(async (input: any, options: any) => {
      if (options?.onProgress) {
        await options.onProgress({ progress: 50, message: 'processing' })
        await options.onProgress({ progress: 100, message: 'done' })
      }
      return {
        path: '/tmp/output.jpg',
        url: '/tmp/output.jpg',
        size: 2048,
        mimeType: 'image/jpeg',
      }
    }),
    getMetadata: jest.fn(async () => ({
      width: 1920,
      height: 1080,
      format: 'jpeg',
    })),
    ...overrides,
  }
}

/**
 * 建立 mock StatusStore
 *
 * 使用 Map 作為內部儲存，模擬真實的 get/set/delete 行為。
 */
export function createMockStatusStore() {
  const store = new Map<string, ProcessingStatus>()

  return {
    get: jest.fn(async (jobId: string) => store.get(jobId) ?? null),
    set: jest.fn(async (status: ProcessingStatus) => {
      store.set(status.jobId, status)
    }),
    delete: jest.fn(async (jobId: string) => {
      store.delete(jobId)
    }),
    onChange: jest.fn(() => () => {}),
    _store: store,
  }
}

/**
 * 建立 mock RuntimeAdapter
 *
 * 提供 readFileAsBlob 和 deleteFile 的基本 mock 實作。
 */
export function createMockRuntimeAdapter(overrides: Record<string, unknown> = {}) {
  return {
    readFileAsBlob: jest.fn(async () => new Blob(['test data'])),
    deleteFile: jest.fn(async () => {}),
    writeFile: jest.fn(async () => {}),
    exists: jest.fn(async () => true),
    stat: jest.fn(async () => ({ size: 1024, mtime: new Date() })),
    readFile: jest.fn(async () => Buffer.from('test')),
    serve: jest.fn(),
    ...overrides,
  }
}

/**
 * 建立 mock StorageProvider
 *
 * 提供 put/getUrl/get/delete 的基本 mock 實作。
 */
export function createMockStorage(overrides: Record<string, unknown> = {}) {
  return {
    put: jest.fn(async () => {}),
    getUrl: jest.fn((key: string) => `https://cdn.test/${key}`),
    get: jest.fn(async () => new Blob(['stored data'])),
    delete: jest.fn(async () => {}),
    ...overrides,
  }
}
