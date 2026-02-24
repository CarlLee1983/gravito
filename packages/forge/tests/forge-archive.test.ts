/**
 * @fileoverview ForgeService 歸檔功能測試
 *
 * 測試案例：
 * T1: packageProcessingResults - 正常打包（多個已完成作業）
 * T2: packageProcessingResults - 部分失敗（混合成功/失敗作業）
 * T3: downloadResults - 正常下載單一作業結果
 */

import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test'
import type { ProcessingStatus } from '../src/types'

// ============ Mock 設定 ============

const mockArchiveCreate = jest.fn(async (entries: Record<string, unknown>) => {
  return new TextEncoder().encode(JSON.stringify(Object.keys(entries)))
})

const mockWriteFile = jest.fn().mockResolvedValue(undefined)
const mockReadFile = jest.fn(async (path: string): Promise<Uint8Array> => {
  if (path.includes('nonexistent')) {
    throw new Error(`ENOENT: ${path}`)
  }
  return new TextEncoder().encode(`content of ${path}`)
})
mock.module('@gravito/core', () => ({
  getArchiveAdapter: () => ({
    create: mockArchiveCreate,
    extract: jest.fn(async () => 0),
    list: jest.fn(async () => new Map()),
    readFile: jest.fn(async () => null),
  }),
  getRuntimeAdapter: () => ({
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    readFileAsBlob: jest.fn(async () => new Blob([])),
  }),
}))

// 模擬 @gravito/nebula StorageProvider
mock.module('@gravito/nebula', () => ({}))

// 模擬 ImageMagickAdapter 和 FFmpegAdapter
class AdapterMock {
  async execute(_args: string[], options: { output?: string } = {}): Promise<void> {
    if (options.output) {
      await Bun.write(options.output, 'mock-media-data')
    }
  }
}
mock.module('../src/adapters/ImageMagickAdapter', () => ({
  ImageMagickAdapter: AdapterMock,
}))
mock.module('../src/adapters/FFmpegAdapter', () => ({
  FFmpegAdapter: AdapterMock,
}))

// ============ 輔助函式 ============

/** 建立一個模擬 ProcessingStatus */
function makeStatus(
  jobId: string,
  status: 'completed' | 'failed' | 'pending' | 'processing',
  outputPath?: string
) {
  return {
    jobId,
    status,
    progress: status === 'completed' ? 100 : 50,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    result:
      status === 'completed' && outputPath
        ? {
            url: `https://storage.example.com/forge/${outputPath}`,
            path: `/tmp/forge/${outputPath}`,
            size: 1024,
            mimeType: 'video/mp4',
          }
        : undefined,
  }
}

// ============ 測試主體 ============

describe('ForgeService - 歸檔功能', () => {
  let ForgeService: typeof import('../src/ForgeService').ForgeService
  let MemoryStatusStore: typeof import('../src/status/StatusStore').MemoryStatusStore

  beforeEach(async () => {
    ;({ ForgeService } = await import('../src/ForgeService'))
    ;({ MemoryStatusStore } = await import('../src/status/StatusStore'))
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('T1: packageProcessingResults() - 正常打包', () => {
    it('應打包所有已完成作業的結果', async () => {
      const statusStore = new MemoryStatusStore()

      // 預先設定 3 個已完成作業
      await statusStore.set(
        makeStatus('job-001', 'completed', 'output-001.mp4') as ProcessingStatus
      )
      await statusStore.set(
        makeStatus('job-002', 'completed', 'output-002.mp4') as ProcessingStatus
      )
      await statusStore.set(
        makeStatus('job-003', 'completed', 'output-003.jpg') as ProcessingStatus
      )

      const service = new ForgeService({ statusStore })
      const outputPath = '/tmp/results.tar.gz'

      const result = await service.packageProcessingResults(
        ['job-001', 'job-002', 'job-003'],
        outputPath
      )

      // 驗證結果摘要
      expect(result.archivePath).toBe(outputPath)
      expect(result.fileCount).toBe(3)
      expect(result.errors).toHaveLength(0)

      // 驗證 archive.create 有被呼叫
      expect(mockArchiveCreate).toHaveBeenCalledTimes(1)
      const [entries] = mockArchiveCreate.mock.calls[0]

      // 驗證每個 job 對應的 entries 存在
      expect(Object.keys(entries).some((k) => k.startsWith('job-001/'))).toBe(true)
      expect(Object.keys(entries).some((k) => k.startsWith('job-002/'))).toBe(true)
      expect(Object.keys(entries).some((k) => k.startsWith('job-003/'))).toBe(true)

      // 驗證 writeFile 被呼叫
      expect(mockWriteFile).toHaveBeenCalledWith(outputPath, expect.any(Uint8Array))
    })

    it('沒有設定 statusStore 時應拋出錯誤', async () => {
      const service = new ForgeService() // 無 statusStore

      await expect(
        service.packageProcessingResults(['job-001'], '/tmp/output.tar.gz')
      ).rejects.toThrow(/statusStore 未設定/)
    })

    it('支援 pattern 過濾（只打包 *.mp4）', async () => {
      const statusStore = new MemoryStatusStore()
      await statusStore.set(
        makeStatus('job-001', 'completed', 'output-001.mp4') as ProcessingStatus
      )
      await statusStore.set(
        makeStatus('job-002', 'completed', 'output-002.mp4') as ProcessingStatus
      )
      await statusStore.set(
        makeStatus('job-003', 'completed', 'output-003.jpg') as ProcessingStatus
      )

      const service = new ForgeService({ statusStore })

      const result = await service.packageProcessingResults(
        ['job-001', 'job-002', 'job-003'],
        '/tmp/mp4-only.tar.gz',
        { pattern: '*.mp4' }
      )

      // 只有 mp4 檔案會被打包
      expect(result.fileCount).toBe(2)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('T2: packageProcessingResults() - 部分失敗', () => {
    it('失敗或進行中的作業應記錄到 errors 清單', async () => {
      const statusStore = new MemoryStatusStore()
      await statusStore.set(
        makeStatus('job-success', 'completed', 'output.mp4') as ProcessingStatus
      )
      await statusStore.set(makeStatus('job-failed', 'failed') as ProcessingStatus)
      await statusStore.set(makeStatus('job-pending', 'pending') as ProcessingStatus)
      // job-missing 不存在於 store

      const service = new ForgeService({ statusStore })
      const outputPath = '/tmp/partial-results.tar.gz'

      const result = await service.packageProcessingResults(
        ['job-success', 'job-failed', 'job-pending', 'job-missing'],
        outputPath
      )

      // 只有 1 個成功
      expect(result.fileCount).toBe(1)
      // 3 個失敗（job-failed、job-pending、job-missing）
      expect(result.errors).toHaveLength(3)
      expect(result.errors.some((e) => e.jobId === 'job-failed')).toBe(true)
      expect(result.errors.some((e) => e.jobId === 'job-pending')).toBe(true)
      expect(result.errors.some((e) => e.jobId === 'job-missing')).toBe(true)

      // 即使有失敗也應寫出歸檔（包含成功的部分）
      expect(mockWriteFile).toHaveBeenCalledWith(outputPath, expect.any(Uint8Array))
    })
  })

  describe('T3: downloadResults() - 正常下載', () => {
    it('應下載作業結果到本地目錄', async () => {
      const statusStore = new MemoryStatusStore()
      const status = makeStatus('job-download', 'completed', 'result.mp4')
      await statusStore.set(status as ProcessingStatus)

      const service = new ForgeService({ statusStore })
      const outputDir = '/tmp/downloads'

      const results = await service.downloadResults('job-download', outputDir)

      // 驗證讀取原始檔案
      expect(mockReadFile).toHaveBeenCalledWith('/tmp/forge/result.mp4')

      // 驗證寫入到 outputDir
      expect(mockWriteFile).toHaveBeenCalledWith(`${outputDir}/result.mp4`, expect.any(Uint8Array))

      // 驗證回傳結果
      expect(results).toHaveLength(1)
      expect(results[0].path).toBe(`${outputDir}/result.mp4`)
    })

    it('作業不存在時應拋出錯誤', async () => {
      const statusStore = new MemoryStatusStore()
      const service = new ForgeService({ statusStore })

      await expect(service.downloadResults('nonexistent-job', '/tmp/downloads')).rejects.toThrow(
        /作業不存在/
      )
    })

    it('作業尚未完成時應拋出錯誤', async () => {
      const statusStore = new MemoryStatusStore()
      await statusStore.set(makeStatus('job-processing', 'processing') as ProcessingStatus)

      const service = new ForgeService({ statusStore })

      await expect(service.downloadResults('job-processing', '/tmp/downloads')).rejects.toThrow(
        /尚未完成/
      )
    })
  })
})
