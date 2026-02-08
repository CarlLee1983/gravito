/**
 * @fileoverview ForgeService 進階測試
 *
 * Phase 4: 補充 ForgeService 的以下測試覆蓋：
 * - getMetadata() 正常流程
 * - process() minAvailableSpace 檢查
 * - process() 併發控制（允許、排隊、釋放後喚醒）
 * - processAsync() minAvailableSpace 檢查
 * - getMimeType() 各分支路徑
 * - process() 不支援檔案類型
 */

import { beforeAll, describe, expect, it, jest, mock } from 'bun:test'

// Mock adapters 以避免實際執行
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

let ForgeService: typeof import('../src/ForgeService').ForgeService
let MemoryStatusStore: typeof import('../src/status/StatusStore').MemoryStatusStore

beforeAll(async () => {
  ;({ ForgeService } = await import('../src/ForgeService'))
  ;({ MemoryStatusStore } = await import('../src/status/StatusStore'))
})

describe('ForgeService - getMetadata()', () => {
  it('正常流程調用 processor.getMetadata() 並回傳結果', async () => {
    const service = new ForgeService()

    const mockMetadata = {
      width: 1920,
      height: 1080,
      format: 'jpeg',
      duration: undefined,
    }

    // 替換 imageProcessor 使其 supports 回傳 true
    ;(service as any).imageProcessor = {
      supports: () => true,
      process: jest.fn(),
      getMetadata: jest.fn(async () => mockMetadata),
    }

    const result = await service.getMetadata({
      source: '/tmp/test.jpg',
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
    })

    expect(result).toEqual(mockMetadata)
    expect((service as any).imageProcessor.getMetadata).toHaveBeenCalled()
  })

  it('video 檔案使用 videoProcessor.getMetadata()', async () => {
    const service = new ForgeService()

    const mockMetadata = {
      width: 1920,
      height: 1080,
      duration: 120,
      codec: 'h264',
    }

    ;(service as any).videoProcessor = {
      supports: (mime: string) => mime.startsWith('video/'),
      getMetadata: jest.fn(async () => mockMetadata),
    }
    ;(service as any).imageProcessor = {
      supports: () => false,
    }

    const result = await service.getMetadata({
      source: '/tmp/test.mp4',
      filename: 'test.mp4',
      mimeType: 'video/mp4',
    })

    expect(result).toEqual(mockMetadata)
  })
})

describe('ForgeService - process() minAvailableSpace 檢查', () => {
  it('磁盤空間不足時拋出錯誤', async () => {
    const service = new ForgeService({
      minAvailableSpace: Number.MAX_SAFE_INTEGER, // 要求不可能的磁盤空間
    })

    ;(service as any).imageProcessor = {
      supports: () => true,
      tempDir: '/tmp',
      process: jest.fn(async () => ({
        path: '/tmp/output.jpg',
        url: '/tmp/output.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      })),
    }

    await expect(
      service.process({
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      })
    ).rejects.toThrow('Insufficient disk space')
  })

  it('磁盤空間足夠時正常處理', async () => {
    const service = new ForgeService({
      minAvailableSpace: 1, // 只要求 1 byte
    })

    ;(service as any).imageProcessor = {
      supports: () => true,
      tempDir: '/tmp',
      process: jest.fn(async () => ({
        path: '/tmp/output.jpg',
        url: '/tmp/output.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      })),
    }

    const result = await service.process({
      source: '/tmp/input.jpg',
      filename: 'input.jpg',
      mimeType: 'image/jpeg',
    })

    expect(result).toBeDefined()
    expect(result.size).toBe(1024)
  })
})

describe('ForgeService - process() 併發控制', () => {
  it('併發數未達 limit 時直接執行', async () => {
    const service = new ForgeService({ concurrency: 2 })

    ;(service as any).imageProcessor = {
      supports: () => true,
      process: jest.fn(async () => ({
        url: '/tmp/output.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      })),
    }

    // 單一任務應直接執行
    const result = await service.process({
      source: '/tmp/input.jpg',
      filename: 'input.jpg',
      mimeType: 'image/jpeg',
    })

    expect(result).toBeDefined()
  })

  it('併發數達到 limit 時任務排隊，完成後喚醒等待中的任務', async () => {
    const service = new ForgeService({ concurrency: 1 })

    let task1Resolve: (() => void) | null = null
    const task1Promise = new Promise<void>((resolve) => {
      task1Resolve = resolve
    })

    let processCallCount = 0

    ;(service as any).imageProcessor = {
      supports: () => true,
      process: jest.fn(async () => {
        processCallCount++
        // 第一次呼叫時等待手動 resolve
        if (processCallCount === 1) {
          await task1Promise
        }
        return {
          url: '/tmp/output.jpg',
          size: 1024,
          mimeType: 'image/jpeg',
        }
      }),
    }

    const input = {
      source: '/tmp/input.jpg',
      filename: 'input.jpg',
      mimeType: 'image/jpeg',
    }

    // 啟動第一個任務（會佔用併發槽）
    const result1Promise = service.process(input)

    // 等待足夠時間讓第一個任務進入 processor.process() 並佔用併發槽
    await new Promise((r) => setTimeout(r, 50))

    // 啟動第二個任務（應該排隊）
    const result2Promise = service.process(input)

    // 等待足夠時間讓第二個任務到達併發檢查點並進入等待隊列
    await new Promise((r) => setTimeout(r, 50))

    // 檢查 activeTasks
    expect((service as any).activeTasks).toBe(1)
    expect((service as any).waitingTasks.length).toBe(1)

    // 釋放第一個任務
    task1Resolve?.()

    // 兩個都應完成
    const [result1, result2] = await Promise.all([result1Promise, result2Promise])

    expect(result1).toBeDefined()
    expect(result2).toBeDefined()
    expect((service as any).activeTasks).toBe(0)
    expect((service as any).waitingTasks.length).toBe(0)
  })
})

describe('ForgeService - processAsync() minAvailableSpace 檢查', () => {
  it('磁盤空間不足時拋出錯誤', async () => {
    const service = new ForgeService({
      statusStore: new MemoryStatusStore(),
      minAvailableSpace: Number.MAX_SAFE_INTEGER,
    })

    ;(service as any).imageProcessor = {
      supports: () => true,
      tempDir: '/tmp',
    }

    await expect(
      service.processAsync({
        source: '/tmp/input.jpg',
        filename: 'input.jpg',
        mimeType: 'image/jpeg',
      })
    ).rejects.toThrow('Insufficient disk space')
  })

  it('磁盤空間足夠時正常建立 job', async () => {
    const store = new MemoryStatusStore()
    const service = new ForgeService({
      statusStore: store,
      minAvailableSpace: 1,
    })

    ;(service as any).imageProcessor = {
      supports: () => true,
      tempDir: '/tmp',
    }

    const job = await service.processAsync({
      source: '/tmp/input.jpg',
      filename: 'input.jpg',
      mimeType: 'image/jpeg',
    })

    expect(job.id).toBeDefined()
    expect(job.status.status).toBe('pending')
  })
})

describe('ForgeService - getMimeType() 各路徑', () => {
  it('sniffMimeType 從 Blob 內容判斷 MIME type', async () => {
    const service = new ForgeService()

    // 建立 JPEG Blob 作為 source
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    const jpegBlob = new Blob([jpegHeader])

    ;(service as any).videoProcessor = {
      supports: () => false,
    }
    ;(service as any).imageProcessor = {
      supports: (mime: string) => mime === 'image/jpeg',
      process: jest.fn(async () => ({
        url: '/tmp/output.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      })),
    }

    // 不提供 mimeType，讓 getMimeType 走 sniffMimeType 路徑
    const result = await service.process({
      source: jpegBlob,
    })

    expect(result.mimeType).toBe('image/jpeg')
  })

  it('sniffMimeType 回傳 null 時使用 filename 副檔名判斷', async () => {
    const service = new ForgeService()

    ;(service as any).videoProcessor = {
      supports: () => false,
    }
    ;(service as any).imageProcessor = {
      supports: (mime: string) => mime === 'image/png',
      process: jest.fn(async () => ({
        url: '/tmp/output.png',
        size: 1024,
        mimeType: 'image/png',
      })),
    }

    // 使用不可辨識的 source（string path），提供 filename
    const result = await service.process({
      source: '/tmp/unknown-file',
      filename: 'image.png',
    })

    expect(result.mimeType).toBe('image/png')
  })

  it('無 mimeType 無 filename 且 sniff 失敗時回傳 application/octet-stream', async () => {
    const service = new ForgeService()

    ;(service as any).videoProcessor = {
      supports: () => false,
    }
    ;(service as any).imageProcessor = {
      supports: () => false,
    }

    // 不提供 mimeType、不提供 filename、source 是無法辨識的 path
    await expect(
      service.process({
        source: '/tmp/some-random-file',
      })
    ).rejects.toThrow('Unsupported file type: application/octet-stream')
  })
})

describe('ForgeService - process() 不支援檔案類型', () => {
  it('adapter 無法處理該 MIME type 時拋出 UnsupportedFormatError', async () => {
    const service = new ForgeService()

    ;(service as any).videoProcessor = {
      supports: () => false,
    }
    ;(service as any).imageProcessor = {
      supports: () => false,
    }

    await expect(
      service.process({
        source: '/tmp/file.xyz',
        filename: 'file.xyz',
        mimeType: 'application/x-unknown',
      })
    ).rejects.toThrow('Unsupported file type: application/x-unknown')
  })

  it('getMetadata 也應拋出不支援錯誤', async () => {
    const service = new ForgeService()

    ;(service as any).videoProcessor = {
      supports: () => false,
    }
    ;(service as any).imageProcessor = {
      supports: () => false,
    }

    await expect(
      service.getMetadata({
        source: '/tmp/file.xyz',
        mimeType: 'application/x-unknown',
      })
    ).rejects.toThrow('Unsupported file type: application/x-unknown')
  })
})

describe('ForgeService - setStorage()', () => {
  it('替換 storage provider 後 process 使用新的 storage', async () => {
    const service = new ForgeService()

    const newStorage = {
      put: jest.fn(async () => {}),
      getUrl: jest.fn((key: string) => `https://new-cdn.test/${key}`),
    }

    service.setStorage(newStorage as any)

    ;(service as any).imageProcessor = {
      supports: () => true,
      process: jest.fn(async () => ({
        path: '/tmp/output.jpg',
        url: '/tmp/output.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      })),
    }

    const result = await service.process({
      source: '/tmp/input.jpg',
      filename: 'input.jpg',
      mimeType: 'image/jpeg',
    })

    expect(newStorage.put).toHaveBeenCalled()
    expect(result.url).toMatch(/^https:\/\/new-cdn\.test\//)
  })
})
