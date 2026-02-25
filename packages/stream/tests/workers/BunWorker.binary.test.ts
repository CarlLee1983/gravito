/**
 * Integration tests for BunWorker Binary Protocol.
 *
 * 驗證 BunWorker 使用 Binary Protocol（execute-binary + ArrayBuffer Transfer）
 * 與 bun-job-executor 的端到端整合行為。
 *
 * 測試重點：
 * - executeInWorker 使用 encodeJobForTransfer 並以 transfer list 傳遞 buffer
 * - Worker 端正確以 decodeJobFromTransfer 解碼並執行
 * - 錯誤情況下正確回傳 error 訊息
 * - 與 BunWorker 整體生命週期（terminate、idle timer 等）的相容性
 */

import { describe, expect, it } from 'bun:test'
import type { SerializedJob } from '../../src/types'
import { decodeJobFromTransfer, encodeJobForTransfer } from '../../src/workers/BinaryWorkerProtocol'
import { BunWorker } from '../../src/workers/BunWorker'

// ─── 測試輔助 ──────────────────────────────────────────────────────────────────

/**
 * 建立測試用 SerializedJob。
 */
function makeJob(overrides: Partial<SerializedJob> = {}): SerializedJob {
  return {
    id: `binary-test-${Date.now()}`,
    type: 'json',
    data: '{"action":"noop"}',
    createdAt: Date.now(),
    ...overrides,
  }
}

// ─── Binary Protocol 編解碼整合 ────────────────────────────────────────────────

describe('BunWorker Binary Protocol - 編解碼整合', () => {
  it('encodeJobForTransfer 應回傳可被 decodeJobFromTransfer 還原的 buffer', () => {
    const job = makeJob({ data: '{"userId":1,"action":"send_email"}' })
    const buffer = encodeJobForTransfer(job)

    // 驗證 buffer 是 ArrayBuffer
    expect(buffer).toBeInstanceOf(ArrayBuffer)
    expect(buffer.byteLength).toBeGreaterThan(0)

    // 驗證解碼後資料完整還原
    const restored = decodeJobFromTransfer(buffer)
    expect(restored.id).toBe(job.id)
    expect(restored.type).toBe(job.type)
    expect(restored.data).toBe(job.data)
    expect(restored.createdAt).toBe(job.createdAt)
  })

  it('buffer transfer 後呼叫 decodeJobFromTransfer 解碼（模擬 Worker 端行為）', () => {
    const job = makeJob()
    const buffer = encodeJobForTransfer(job)

    // 模擬 Worker 端透過 event.data.buffer 收到 buffer 後解碼
    const decoded = decodeJobFromTransfer(buffer)
    expect(decoded).toEqual(job)
  })

  it('class 型別 job 的 round-trip', () => {
    const job = makeJob({
      type: 'class',
      data: '{"orderId":"ORD-001","amount":100}',
      className: 'ProcessOrderJob',
      attempts: 0,
      maxAttempts: 3,
    })
    const buffer = encodeJobForTransfer(job)
    const decoded = decodeJobFromTransfer(buffer)

    expect(decoded.type).toBe('class')
    expect(decoded.className).toBe('ProcessOrderJob')
    expect(decoded.attempts).toBe(0)
    expect(decoded.maxAttempts).toBe(3)
  })
})

// ─── BunWorker executeInWorker 行為驗證 ────────────────────────────────────────

describe('BunWorker executeInWorker - Binary Protocol 行為', () => {
  it('BunWorker.execute 內部應使用 execute-binary 類型訊息', async () => {
    // 建立 BunWorker 並 mock 內部 worker 物件
    const bunWorker = new BunWorker({ maxExecutionTime: 5000 })

    const postMessageCalls: Array<{ data: any; transfer: any[] }> = []

    // Mock worker 物件
    const mockWorker = {
      postMessage: (data: any, transfer?: any[]) => {
        postMessageCalls.push({ data, transfer: transfer ?? [] })
        // 模擬 Worker 立即回傳 success
        setTimeout(() => {
          if (typeof (mockWorker as any)._messageHandler === 'function') {
            ;(mockWorker as any)._messageHandler({
              data: { type: 'success' },
            })
          }
        }, 0)
      },
      addEventListener: (type: string, handler: any) => {
        if (type === 'message') {
          ;(mockWorker as any)._messageHandler = handler
        }
      },
      removeEventListener: () => {},
    }

    // 注入 mock worker
    ;(bunWorker as any).worker = mockWorker
    ;(bunWorker as any).state = 'ready'

    const job = makeJob()
    await (bunWorker as any).executeInWorker(mockWorker, job)

    // 驗證使用了 execute-binary 訊息類型
    expect(postMessageCalls.length).toBe(1)
    expect(postMessageCalls[0].data.type).toBe('execute-binary')
    expect(postMessageCalls[0].data.buffer).toBeInstanceOf(ArrayBuffer)

    // 驗證 transfer list 包含了 buffer（零拷貝語意）
    expect(postMessageCalls[0].transfer.length).toBe(1)
    expect(postMessageCalls[0].transfer[0]).toBeInstanceOf(ArrayBuffer)

    await bunWorker.terminate()
  })

  it('Worker 回傳 error 時應拋出帶有訊息的 Error', async () => {
    const bunWorker = new BunWorker({ maxExecutionTime: 5000 })

    const mockWorker = {
      postMessage: (_data: any, _transfer?: any[]) => {
        setTimeout(() => {
          if (typeof (mockWorker as any)._messageHandler === 'function') {
            ;(mockWorker as any)._messageHandler({
              data: {
                type: 'error',
                error: 'Job handle() threw an exception',
                stack: 'Error: Job handle() threw an exception\n  at handle (test.ts:10:5)',
              },
            })
          }
        }, 0)
      },
      addEventListener: (type: string, handler: any) => {
        if (type === 'message') {
          ;(mockWorker as any)._messageHandler = handler
        }
      },
      removeEventListener: () => {},
    }

    ;(bunWorker as any).worker = mockWorker
    ;(bunWorker as any).state = 'ready'

    const job = makeJob()

    await expect((bunWorker as any).executeInWorker(mockWorker, job)).rejects.toThrow(
      'Job handle() threw an exception'
    )

    await bunWorker.terminate()
  })

  it('execute-binary 訊息的 buffer 應是 job 的正確編碼', async () => {
    const bunWorker = new BunWorker({ maxExecutionTime: 5000 })
    let capturedBuffer: ArrayBuffer | null = null

    const mockWorker = {
      postMessage: (data: any, _transfer?: any[]) => {
        capturedBuffer = data.buffer
        setTimeout(() => {
          if (typeof (mockWorker as any)._messageHandler === 'function') {
            ;(mockWorker as any)._messageHandler({ data: { type: 'success' } })
          }
        }, 0)
      },
      addEventListener: (type: string, handler: any) => {
        if (type === 'message') {
          ;(mockWorker as any)._messageHandler = handler
        }
      },
      removeEventListener: () => {},
    }

    ;(bunWorker as any).worker = mockWorker
    ;(bunWorker as any).state = 'ready'

    const job = makeJob({ data: '{"payload":"test-value"}' })
    await (bunWorker as any).executeInWorker(mockWorker, job)

    // 驗證 buffer 可以被正確解碼為原始 job
    expect(capturedBuffer).not.toBeNull()
    const decoded = decodeJobFromTransfer(capturedBuffer!)
    expect(decoded.id).toBe(job.id)
    expect(decoded.data).toBe('{"payload":"test-value"}')

    await bunWorker.terminate()
  })
})

// ─── BunWorker 生命週期相容性 ──────────────────────────────────────────────────

describe('BunWorker Binary Protocol - 生命週期相容性', () => {
  it('terminate 後 worker 應為 null', async () => {
    const worker = new BunWorker()
    await worker.terminate()
    expect((worker as any).worker).toBeNull()
  })

  it('多次呼叫 terminate 不應拋出錯誤', async () => {
    const worker = new BunWorker()
    // 未初始化（worker 為 null）時 terminate 不應拋出
    await worker.terminate()
    await worker.terminate()
    // 未曾實際建立 Bun Worker，狀態保持 initializing（非 bug，是既有設計）
    expect(worker.getState()).toBe('initializing')
  })

  it('BunWorker 初始狀態應為 initializing', () => {
    const worker = new BunWorker()
    expect(worker.getState()).toBe('initializing')
    worker.terminate()
  })

  it('isolateContexts: true 時 execute 應每次重建 Worker', async () => {
    // 僅驗證設定可以正確建立，實際行為需要 Bun 環境
    const worker = new BunWorker({ isolateContexts: true })
    const config = (worker as any).config
    expect(config.isolateContexts).toBe(true)
    await worker.terminate()
  })
})

// ─── Binary Protocol 邊界情境 ─────────────────────────────────────────────────

describe('BunWorker Binary Protocol - 邊界情境', () => {
  it('job data 含 Unicode 字元應能正確傳遞', async () => {
    const bunWorker = new BunWorker()
    let capturedBuffer: ArrayBuffer | null = null

    const mockWorker = {
      postMessage: (data: any, _transfer?: any[]) => {
        capturedBuffer = data.buffer
        setTimeout(() => {
          if (typeof (mockWorker as any)._messageHandler === 'function') {
            ;(mockWorker as any)._messageHandler({ data: { type: 'success' } })
          }
        }, 0)
      },
      addEventListener: (type: string, handler: any) => {
        if (type === 'message') {
          ;(mockWorker as any)._messageHandler = handler
        }
      },
      removeEventListener: () => {},
    }

    ;(bunWorker as any).worker = mockWorker
    ;(bunWorker as any).state = 'ready'

    const job = makeJob({ data: '{"msg":"你好世界 🌍 مرحبا"}' })
    await (bunWorker as any).executeInWorker(mockWorker, job)

    expect(capturedBuffer).not.toBeNull()
    const decoded = decodeJobFromTransfer(capturedBuffer!)
    expect(decoded.data).toBe('{"msg":"你好世界 🌍 مرحبا"}')

    await bunWorker.terminate()
  })

  it('job data 為空字串時應能正常傳遞', async () => {
    const bunWorker = new BunWorker()
    let capturedBuffer: ArrayBuffer | null = null

    const mockWorker = {
      postMessage: (data: any, _transfer?: any[]) => {
        capturedBuffer = data.buffer
        setTimeout(() => {
          if (typeof (mockWorker as any)._messageHandler === 'function') {
            ;(mockWorker as any)._messageHandler({ data: { type: 'success' } })
          }
        }, 0)
      },
      addEventListener: (type: string, handler: any) => {
        if (type === 'message') {
          ;(mockWorker as any)._messageHandler = handler
        }
      },
      removeEventListener: () => {},
    }

    ;(bunWorker as any).worker = mockWorker
    ;(bunWorker as any).state = 'ready'

    const job = makeJob({ data: '' })
    await (bunWorker as any).executeInWorker(mockWorker, job)

    expect(capturedBuffer).not.toBeNull()
    const decoded = decodeJobFromTransfer(capturedBuffer!)
    expect(decoded.data).toBe('')

    await bunWorker.terminate()
  })
})
