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

/**
 * 建立 mock PlanetCore
 *
 * 提供 config、logger、adapter、container、router、hooks 的 mock 實作。
 * 所有已註冊的 middleware 和 route handler 可透過回傳的 capture 物件取得。
 */
export function createMockPlanetCore(configOverrides: Record<string, unknown> = {}) {
  const middlewares: Array<{ path: string; handler: (...args: any[]) => any }> = []
  const routes: Array<{ method: string; path: string; handler: (...args: any[]) => any }> = []
  const instances: Array<{ name: string; instance: unknown }> = []
  const hookCalls: Array<{ action: string; args: unknown[] }> = []
  const logMessages: string[] = []

  const core = {
    config: {
      get: jest.fn((key: string) => configOverrides[key] ?? undefined),
      has: jest.fn((key: string) => key in configOverrides),
    },
    logger: {
      info: jest.fn((...msgs: any[]) => {
        logMessages.push(msgs.join(' '))
      }),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    adapter: {
      use: jest.fn((path: string, handler: (...args: any[]) => any) => {
        middlewares.push({ path, handler })
      }),
    },
    container: {
      instance: jest.fn((name: string, instance: unknown) => {
        instances.push({ name, instance })
        return instance
      }),
    },
    router: {
      get: jest.fn((path: string, handler: (...args: any[]) => any) => {
        routes.push({ method: 'GET', path, handler })
      }),
    },
    hooks: {
      doAction: jest.fn((action: string, ...args: unknown[]) => {
        hookCalls.push({ action, args })
      }),
    },
  }

  return {
    core,
    capture: {
      middlewares,
      routes,
      instances,
      hookCalls,
      logMessages,
    },
  }
}

/**
 * 建立 mock GravitoContext
 *
 * 提供 req、get、set、json 等 mock 方法，用於測試 middleware 和 route handler。
 */
export function createMockContext(
  overrides: { params?: Record<string, string>; variables?: Record<string, unknown> } = {}
) {
  const variables = new Map<string, unknown>(Object.entries(overrides.variables ?? {}))
  const params = overrides.params ?? {}

  return {
    req: {
      param: jest.fn((name: string) => params[name]),
      query: jest.fn((name: string) => undefined as string | undefined),
    },
    get: jest.fn((key: string) => variables.get(key)),
    set: jest.fn((key: string, value: unknown) => {
      variables.set(key, value)
    }),
    json: jest.fn((body: unknown, status?: number) => {
      return new Response(JSON.stringify(body), {
        status: status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
    _variables: variables,
  }
}

/**
 * 建立 mock FFmpeg/Video Adapter
 *
 * 可捕獲 execute 時傳入的 args，用於驗證 buildFFmpegArgs 邏輯。
 */
export function createMockVideoAdapter() {
  const executeCalls: Array<{ args: string[]; options: any }> = []

  return {
    adapter: {
      execute: jest.fn(async (args: string[], options: any = {}) => {
        executeCalls.push({ args, options })
        return options.output || ''
      }),
      probe: jest.fn(async () => ({
        duration: 120,
        width: 1920,
        height: 1080,
        codec: 'h264',
      })),
    },
    executeCalls,
  }
}
