/**
 * @fileoverview ProcessFileJob 完整路徑覆蓋測試
 *
 * Phase 3: 覆蓋 ProcessFileJob 的所有分支路徑，包含：
 * - handle() 成功路徑（有/無 storage）
 * - handle() onProgress 回調
 * - handle() 錯誤路徑（Error / 非 Error）
 * - handle() cleanup 失敗靜默忽略
 * - failed() 各分支
 * - generateStorageKey() 各分支
 */

import { beforeAll, describe, expect, it, jest, mock } from 'bun:test'
import {
  createMockForgeService,
  createMockRuntimeAdapter,
  createMockStatusStore,
  createMockStorage,
} from './helpers/mocks'

// Mock adapters 以避免實際執行 FFmpeg / ImageMagick
class AdapterMock {
  async execute(_args: string[], options: { output?: string } = {}): Promise<void> {
    if (options.output) {
      await Bun.write(options.output, 'data')
    }
  }
}

mock.module('../src/adapters/ImageMagickAdapter', () => ({
  ImageMagickAdapter: AdapterMock,
}))
mock.module('../src/adapters/FFmpegAdapter', () => ({
  FFmpegAdapter: AdapterMock,
}))

let ProcessFileJob: typeof import('../src/jobs/ProcessFileJob').ProcessFileJob

beforeAll(async () => {
  ;({ ProcessFileJob } = await import('../src/jobs/ProcessFileJob'))
})

/**
 * 建立 ProcessFileJob 並替換 runtime adapter 為 mock
 */
function createJobWithMockRuntime(
  data: ConstructorParameters<typeof ProcessFileJob>[0],
  runtimeOverrides: Record<string, unknown> = {}
) {
  const job = new ProcessFileJob(data)
  const mockRuntime = createMockRuntimeAdapter(runtimeOverrides)
  ;(job as any).runtime = mockRuntime
  return { job, mockRuntime }
}

describe('ProcessFileJob - handle() 成功路徑（無 storage）', () => {
  it('statusStore 無既有 status 時建立新 status 並完成處理', async () => {
    const statusStore = createMockStatusStore()
    const forgeService = createMockForgeService()

    const { job } = createJobWithMockRuntime({
      jobId: 'job-no-storage-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      forgeService: forgeService as any,
    })

    await job.handle()

    // 驗證 statusStore.get 被呼叫
    expect(statusStore.get).toHaveBeenCalledWith('job-no-storage-1')

    // 驗證 forgeService.process 被呼叫
    expect(forgeService.process).toHaveBeenCalled()

    // 驗證最終狀態為 completed
    const lastSetCall = statusStore.set.mock.calls[statusStore.set.mock.calls.length - 1]
    const finalStatus = lastSetCall[0]
    expect(finalStatus.status).toBe('completed')
    expect(finalStatus.result).toBeDefined()
  })

  it('正常處理流程觸發 processing 和 completed 狀態更新', async () => {
    const statusStore = createMockStatusStore()
    const forgeService = createMockForgeService()

    const { job } = createJobWithMockRuntime({
      jobId: 'job-flow-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      forgeService: forgeService as any,
    })

    await job.handle()

    // 至少呼叫 3 次 set：processing(start) + onProgress(50) + onProgress(100) + completed
    expect(statusStore.set.mock.calls.length).toBeGreaterThanOrEqual(3)

    // 第一次 set 應為 processing 狀態
    const firstStatus = statusStore.set.mock.calls[0][0]
    expect(firstStatus.status).toBe('processing')
  })
})

describe('ProcessFileJob - handle() 成功路徑含 storage upload', () => {
  it('調用 storage.put() 和 storage.getUrl() 上傳檔案', async () => {
    const statusStore = createMockStatusStore()
    const storage = createMockStorage()
    const forgeService = createMockForgeService()

    const { job, mockRuntime } = createJobWithMockRuntime({
      jobId: 'job-storage-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      storage: storage as any,
      forgeService: forgeService as any,
    })

    await job.handle()

    // 驗證 storage.put 被呼叫
    expect(storage.put).toHaveBeenCalled()

    // 驗證 storage.getUrl 被呼叫
    expect(storage.getUrl).toHaveBeenCalled()

    // 驗證 runtime.readFileAsBlob 被呼叫（讀取 output.path 以上傳）
    expect(mockRuntime.readFileAsBlob).toHaveBeenCalled()
  })

  it('上傳後回傳正確的 CDN URL', async () => {
    const statusStore = createMockStatusStore()
    const storage = createMockStorage()
    const forgeService = createMockForgeService()

    const { job } = createJobWithMockRuntime({
      jobId: 'job-storage-url-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      storage: storage as any,
      forgeService: forgeService as any,
    })

    await job.handle()

    // 最終 completed 狀態的 result.url 應包含 CDN 前綴
    const lastSetCall = statusStore.set.mock.calls[statusStore.set.mock.calls.length - 1]
    const finalStatus = lastSetCall[0]
    expect(finalStatus.status).toBe('completed')
    expect(finalStatus.result.url).toMatch(/^https:\/\/cdn\.test\//)
  })

  it('上傳後清理 temp file', async () => {
    const statusStore = createMockStatusStore()
    const storage = createMockStorage()
    const forgeService = createMockForgeService()

    const { job, mockRuntime } = createJobWithMockRuntime({
      jobId: 'job-cleanup-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      storage: storage as any,
      forgeService: forgeService as any,
    })

    await job.handle()

    // 驗證 deleteFile 被呼叫以清理 temp file
    expect(mockRuntime.deleteFile).toHaveBeenCalledWith('/tmp/output.jpg')
  })
})

describe('ProcessFileJob - handle() onProgress 回調', () => {
  it('statusStore.set() 在 onProgress 回調中被正確觸發', async () => {
    const statusStore = createMockStatusStore()
    const progressValues: number[] = []

    const forgeService = createMockForgeService({
      process: jest.fn(async (_input: any, options: any) => {
        if (options?.onProgress) {
          await options.onProgress({ progress: 25, message: 'step 1' })
          await options.onProgress({ progress: 75, message: 'step 2' })
        }
        return {
          path: '/tmp/output.jpg',
          url: '/tmp/output.jpg',
          size: 2048,
          mimeType: 'image/jpeg',
        }
      }),
    })

    const { job } = createJobWithMockRuntime({
      jobId: 'job-progress-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      forgeService: forgeService as any,
    })

    await job.handle()

    // 收集所有 set 呼叫的進度值
    for (const call of statusStore.set.mock.calls) {
      const status = call[0]
      if (status.status === 'processing') {
        progressValues.push(status.progress)
      }
    }

    // 驗證進度有 25 和 75
    expect(progressValues).toContain(25)
    expect(progressValues).toContain(75)
  })

  it('onProgress 參數被正確傳遞給 forgeService.process()', async () => {
    const statusStore = createMockStatusStore()
    const forgeService = createMockForgeService()

    const { job } = createJobWithMockRuntime({
      jobId: 'job-progress-pass-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: { width: 100, height: 200 },
      statusStore,
      forgeService: forgeService as any,
    })

    await job.handle()

    // 驗證 process 被呼叫時有 onProgress 參數
    const processCall = forgeService.process.mock.calls[0]
    const passedOptions = processCall[1]
    expect(passedOptions.onProgress).toBeDefined()
    expect(typeof passedOptions.onProgress).toBe('function')

    // 驗證原始 options 也被傳遞
    expect(passedOptions.width).toBe(100)
    expect(passedOptions.height).toBe(200)
  })
})

describe('ProcessFileJob - handle() statusStore.get 回傳既有 status', () => {
  it('復用既有的 status 物件', async () => {
    const existingStatus = {
      jobId: 'job-existing-1',
      status: 'pending' as const,
      progress: 0,
      message: 'existing status',
      createdAt: Date.now() - 5000,
      updatedAt: Date.now() - 5000,
    }

    const statusStore = createMockStatusStore()
    statusStore._store.set('job-existing-1', existingStatus)

    const forgeService = createMockForgeService()

    const { job } = createJobWithMockRuntime({
      jobId: 'job-existing-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      forgeService: forgeService as any,
    })

    await job.handle()

    // 驗證既有 status 的 createdAt 被保留
    const lastSetCall = statusStore.set.mock.calls[statusStore.set.mock.calls.length - 1]
    const finalStatus = lastSetCall[0]
    expect(finalStatus.createdAt).toBe(existingStatus.createdAt)
  })
})

describe('ProcessFileJob - handle() 錯誤路徑 - Error 實例', () => {
  it('process() 拋出 Error 時 statusStore 更新為 failed', async () => {
    const statusStore = createMockStatusStore()
    const forgeService = createMockForgeService({
      process: jest.fn(async () => {
        throw new Error('Processing failed: corrupt file')
      }),
    })

    const { job } = createJobWithMockRuntime({
      jobId: 'job-error-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      forgeService: forgeService as any,
    })

    await expect(job.handle()).rejects.toThrow('Processing failed: corrupt file')

    // 驗證 statusStore 被設為 failed
    const lastSetCall = statusStore.set.mock.calls[statusStore.set.mock.calls.length - 1]
    const failedStatus = lastSetCall[0]
    expect(failedStatus.status).toBe('failed')
    expect(failedStatus.error).toBe('Processing failed: corrupt file')
  })

  it('錯誤被重新拋出', async () => {
    const statusStore = createMockStatusStore()
    const originalError = new Error('Rethrown error')
    const forgeService = createMockForgeService({
      process: jest.fn(async () => {
        throw originalError
      }),
    })

    const { job } = createJobWithMockRuntime({
      jobId: 'job-rethrow-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      forgeService: forgeService as any,
    })

    try {
      await job.handle()
      // 不應到達這裡
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBe(originalError)
    }
  })
})

describe('ProcessFileJob - handle() 錯誤路徑 - 非 Error 字串', () => {
  it('process() 拋出非 Error 物件時使用 String() 轉換', async () => {
    const statusStore = createMockStatusStore()
    const forgeService = createMockForgeService({
      process: jest.fn(async () => {
        throw 'string error message'
      }),
    })

    const { job } = createJobWithMockRuntime({
      jobId: 'job-string-error-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      forgeService: forgeService as any,
    })

    try {
      await job.handle()
      expect(true).toBe(false)
    } catch {
      // 預期拋出錯誤
    }

    // 驗證 failed 狀態中 error 為字串形式
    const lastSetCall = statusStore.set.mock.calls[statusStore.set.mock.calls.length - 1]
    const failedStatus = lastSetCall[0]
    expect(failedStatus.status).toBe('failed')
    expect(failedStatus.error).toBe('string error message')
  })

  it('process() 拋出數字時使用 String() 轉換', async () => {
    const statusStore = createMockStatusStore()
    const forgeService = createMockForgeService({
      process: jest.fn(async () => {
        throw 42
      }),
    })

    const { job } = createJobWithMockRuntime({
      jobId: 'job-num-error-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      forgeService: forgeService as any,
    })

    try {
      await job.handle()
      expect(true).toBe(false)
    } catch {
      // 預期拋出錯誤
    }

    const lastSetCall = statusStore.set.mock.calls[statusStore.set.mock.calls.length - 1]
    const failedStatus = lastSetCall[0]
    expect(failedStatus.error).toBe('42')
  })
})

describe('ProcessFileJob - handle() cleanup 失敗靜默忽略', () => {
  it('deleteFile 失敗但不終止流程', async () => {
    const statusStore = createMockStatusStore()
    const storage = createMockStorage()
    const forgeService = createMockForgeService()

    const { job } = createJobWithMockRuntime(
      {
        jobId: 'job-cleanup-fail-1',
        input: {
          source: '/tmp/input.jpg',
          filename: 'input.jpg',
          mimeType: 'image/jpeg',
        },
        options: {},
        statusStore,
        storage: storage as any,
        forgeService: forgeService as any,
      },
      {
        deleteFile: jest.fn(async () => {
          throw new Error('Permission denied')
        }),
      }
    )

    // 應該成功完成，不應因 deleteFile 失敗而拋出錯誤
    await job.handle()

    // 驗證最終狀態仍為 completed
    const lastSetCall = statusStore.set.mock.calls[statusStore.set.mock.calls.length - 1]
    expect(lastSetCall[0].status).toBe('completed')
  })
})

describe('ProcessFileJob - failed() 方法', () => {
  it('有 statusStore 有 status 時更新為 failed', async () => {
    const statusStore = createMockStatusStore()
    const existingStatus = {
      jobId: 'job-failed-1',
      status: 'processing' as const,
      progress: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    statusStore._store.set('job-failed-1', existingStatus)

    const { job } = createJobWithMockRuntime({
      jobId: 'job-failed-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
    })

    await job.failed(new Error('Job permanently failed'))

    // 驗證 statusStore.set 被呼叫，狀態為 failed
    const lastSetCall = statusStore.set.mock.calls[statusStore.set.mock.calls.length - 1]
    const failedStatus = lastSetCall[0]
    expect(failedStatus.status).toBe('failed')
    expect(failedStatus.error).toBe('Job permanently failed')
  })

  it('有 statusStore 無 status 時安全退出', async () => {
    const statusStore = createMockStatusStore()
    // 不預設任何 status

    const { job } = createJobWithMockRuntime({
      jobId: 'job-failed-nostat-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
    })

    // 不應拋出錯誤
    await job.failed(new Error('Some error'))

    // statusStore.get 被呼叫但回傳 null，所以 set 不應被呼叫
    expect(statusStore.get).toHaveBeenCalledWith('job-failed-nostat-1')
    expect(statusStore.set).not.toHaveBeenCalled()
  })

  it('無 statusStore 時安全退出', async () => {
    const { job } = createJobWithMockRuntime({
      jobId: 'job-failed-nostore-1',
      input: {
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      // 不提供 statusStore
    })

    // 不應拋出錯誤
    await job.failed(new Error('Some error'))
    // 方法安全退出即可
  })
})

describe('ProcessFileJob - generateStorageKey()', () => {
  it('正常 filename 生成帶時間戳的 key', async () => {
    const statusStore = createMockStatusStore()
    const storage = createMockStorage()
    const forgeService = createMockForgeService()

    const { job } = createJobWithMockRuntime({
      jobId: 'abcd1234-5678-9012-3456-789012345678',
      input: {
        source: '/tmp/input.jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
      },
      options: {},
      statusStore,
      storage: storage as any,
      forgeService: forgeService as any,
    })

    await job.handle()

    // 驗證 storage.put 的第一個參數（key）格式正確
    const putCall = storage.put.mock.calls[0]
    const storageKey = putCall[0]
    expect(storageKey).toMatch(/^forge\/\d+-abcd1234\.jpg$/)
  })

  it('無擴展名的 filename 使用預設副檔名', async () => {
    const statusStore = createMockStatusStore()
    const storage = createMockStorage()
    const forgeService = createMockForgeService({
      process: jest.fn(async () => ({
        path: '/tmp/output',
        url: '/tmp/output',
        size: 2048,
        mimeType: 'application/octet-stream',
      })),
    })

    const { job } = createJobWithMockRuntime({
      jobId: 'efgh5678-1234-5678-9012-345678901234',
      input: {
        source: '/tmp/input',
        // 不提供 filename，讓它 fallback 到 'processed'
        mimeType: 'application/octet-stream',
      },
      options: {},
      statusStore,
      storage: storage as any,
      forgeService: forgeService as any,
    })

    await job.handle()

    // filename 未提供 -> fallback 到 'processed'
    // 'processed'.split('.').pop() === 'processed'（沒有 dot 所以 pop 回傳整個字串）
    const putCall = storage.put.mock.calls[0]
    const storageKey = putCall[0]
    expect(storageKey).toMatch(/^forge\/\d+-efgh5678\.processed$/)
  })
})
