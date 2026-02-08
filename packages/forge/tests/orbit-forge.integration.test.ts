/**
 * @fileoverview OrbitForge install() 完整覆蓋測試
 *
 * Phase 1: 覆蓋 OrbitForge.install() 的所有分支路徑，包含：
 * - install() 使用建構函式選項初始化
 * - install() 從 core.config 取得配置（fallback）
 * - 自訂 exposeAs 名稱
 * - 使用外部 statusStore
 * - 中間件注入 forge service（有 storage / 無 storage）
 * - SSE 端點啟用 / 停用 / 自訂路徑
 * - SSE handler 回傳 400（缺少 jobId）
 * - SSE handler 回傳 stream
 * - forge:init hook 觸發
 */

import { beforeAll, describe, expect, it, jest, mock } from 'bun:test'
import { createMockContext, createMockPlanetCore } from './helpers/mocks'

// Mock adapters 以避免實際執行 FFmpeg / ImageMagick
class AdapterMock {
  async execute(_args: string[], options: { output?: string } = {}): Promise<void> {
    if (options.output) {
      await Bun.write(options.output, 'data')
    }
  }
  async probe(): Promise<Record<string, unknown>> {
    return { duration: 0, width: 0, height: 0 }
  }
}

mock.module('../src/adapters/ImageMagickAdapter', () => ({
  ImageMagickAdapter: AdapterMock,
}))
mock.module('../src/adapters/FFmpegAdapter', () => ({
  FFmpegAdapter: AdapterMock,
}))
mock.module('../src/adapters/FFmpegWasmAdapter', () => ({
  FFmpegWasmAdapter: AdapterMock,
}))

let OrbitForge: typeof import('../src/index').OrbitForge
let MemoryStatusStore: typeof import('../src/status/StatusStore').MemoryStatusStore

beforeAll(async () => {
  ;({ OrbitForge } = await import('../src/index'))
  ;({ MemoryStatusStore } = await import('../src/status/StatusStore'))
})

describe('OrbitForge install() - 基本初始化', () => {
  it('使用建構函式選項初始化（不讀取 core.config）', () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ sse: { enabled: false } })

    orbit.install(core as any)

    // core.config.get 不應被呼叫，因為 options 已存在
    expect(core.config.get).not.toHaveBeenCalled()

    // logger.info 應被呼叫以記錄初始化訊息
    expect(core.logger.info).toHaveBeenCalled()
    expect(capture.logMessages.some((msg) => msg.includes('[OrbitForge]'))).toBe(true)
  })

  it('從 core.config.get("forge") 取得配置（fallback）', () => {
    const forgeConfig = {
      sse: { enabled: false },
    }
    const { core } = createMockPlanetCore({ forge: forgeConfig })
    const orbit = new OrbitForge() // 不傳 options

    orbit.install(core as any)

    // core.config.get('forge') 應被呼叫
    expect(core.config.get).toHaveBeenCalledWith('forge')
  })

  it('config 全為 undefined 時使用預設值安全初始化', () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge() // 無 options，core.config.get 回傳 undefined

    orbit.install(core as any)

    // 應使用預設 exposeAs = 'forge'
    expect(capture.instances[0]?.name).toBe('forge')

    // hooks 應被觸發
    expect(core.hooks.doAction).toHaveBeenCalledWith('forge:init', expect.anything())
  })
})

describe('OrbitForge install() - exposeAs 配置', () => {
  it('使用自訂 exposeAs 名稱', () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ exposeAs: 'myForge', sse: { enabled: false } })

    orbit.install(core as any)

    // container.instance 使用自訂名稱
    expect(core.container.instance).toHaveBeenCalledWith('myForge', expect.anything())
    expect(capture.instances[0]?.name).toBe('myForge')

    // logger 訊息包含自訂名稱
    expect(capture.logMessages.some((msg) => msg.includes('myForge'))).toBe(true)
  })

  it('未指定 exposeAs 時使用預設 "forge"', () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ sse: { enabled: false } })

    orbit.install(core as any)

    expect(core.container.instance).toHaveBeenCalledWith('forge', expect.anything())
    expect(capture.instances[0]?.name).toBe('forge')
  })
})

describe('OrbitForge install() - statusStore 配置', () => {
  it('使用外部 statusStore', () => {
    const externalStore = new MemoryStatusStore()
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({
      statusStore: externalStore,
      sse: { enabled: false },
    })

    orbit.install(core as any)

    // ForgeService 應使用外部 store
    // 透過 container.instance 拿到 ForgeService 實例
    const forgeService = capture.instances[0]?.instance as any
    expect(forgeService).toBeDefined()
    expect(forgeService.getStatusStore()).toBe(externalStore)
  })

  it('未提供 statusStore 時自動建立 MemoryStatusStore', () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ sse: { enabled: false } })

    orbit.install(core as any)

    const forgeService = capture.instances[0]?.instance as any
    expect(forgeService.getStatusStore()).toBeDefined()
  })
})

describe('OrbitForge install() - 中間件注入', () => {
  it('中間件注入 forge service（有 storage）', async () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ sse: { enabled: false } })

    orbit.install(core as any)

    // 應註冊 middleware
    expect(core.adapter.use).toHaveBeenCalledWith('*', expect.any(Function))
    expect(capture.middlewares).toHaveLength(1)

    const middleware = capture.middlewares[0].handler
    const forgeService = capture.instances[0]?.instance as any

    // 建立有 storage 的 mock context
    const mockStorage = { put: jest.fn(), getUrl: jest.fn() }
    const ctx = createMockContext({
      variables: { storage: mockStorage },
    })
    const next = jest.fn(async () => new Response('ok'))

    // 執行中間件
    await middleware(ctx, next)

    // 驗證 forge service 被注入到 context
    expect(ctx.set).toHaveBeenCalledWith('forge', forgeService)

    // 驗證 next() 被呼叫
    expect(next).toHaveBeenCalled()
  })

  it('中間件注入 forge service（無 storage）', async () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ sse: { enabled: false } })

    orbit.install(core as any)

    const middleware = capture.middlewares[0].handler
    const forgeService = capture.instances[0]?.instance as any

    // 建立無 storage 的 mock context
    const ctx = createMockContext()
    const next = jest.fn(async () => new Response('ok'))

    await middleware(ctx, next)

    // forge service 仍被注入
    expect(ctx.set).toHaveBeenCalledWith('forge', forgeService)
    expect(next).toHaveBeenCalled()
  })

  it('中間件使用自訂 exposeAs 名稱注入', async () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ exposeAs: 'fileProcessor', sse: { enabled: false } })

    orbit.install(core as any)

    const middleware = capture.middlewares[0].handler
    const ctx = createMockContext()
    const next = jest.fn(async () => new Response('ok'))

    await middleware(ctx, next)

    // 使用自訂名稱注入
    expect(ctx.set).toHaveBeenCalledWith('fileProcessor', expect.anything())
  })
})

describe('OrbitForge install() - SSE 端點', () => {
  it('預設啟用 SSE 端點', () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({})

    orbit.install(core as any)

    // router.get 應被呼叫
    expect(core.router.get).toHaveBeenCalled()
    expect(capture.routes).toHaveLength(1)
    expect(capture.routes[0].path).toBe('/forge/status/:jobId/stream')
  })

  it('SSE 端點停用', () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ sse: { enabled: false } })

    orbit.install(core as any)

    // router.get 不應被呼叫
    expect(core.router.get).not.toHaveBeenCalled()
    expect(capture.routes).toHaveLength(0)
  })

  it('SSE 自訂路徑', () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ sse: { path: '/custom/sse/:jobId' } })

    orbit.install(core as any)

    expect(core.router.get).toHaveBeenCalled()
    expect(capture.routes[0].path).toBe('/custom/sse/:jobId')

    // logger 應記錄自訂路徑
    expect(capture.logMessages.some((msg) => msg.includes('/custom/sse/:jobId'))).toBe(true)
  })

  it('SSE handler 回傳 400（缺少 jobId）', async () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({})

    orbit.install(core as any)

    const routeHandler = capture.routes[0].handler

    // 建立缺少 jobId 的 mock context
    const ctx = createMockContext({ params: {} })

    await routeHandler(ctx)

    // 應回傳 400
    expect(ctx.json).toHaveBeenCalledWith({ error: 'Job ID is required' }, 400)
  })

  it('SSE handler 回傳 stream（有效 jobId）', async () => {
    const statusStore = new MemoryStatusStore()
    // 先新增一個 job status
    await statusStore.set({
      jobId: 'test-job-123',
      status: 'processing',
      progress: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ statusStore })

    orbit.install(core as any)

    const routeHandler = capture.routes[0].handler

    // 建立有效 jobId 的 mock context
    const ctx = createMockContext({ params: { jobId: 'test-job-123' } })

    const response = await routeHandler(ctx)

    // SSEHandler.createStream 回傳 Response（SSE stream）
    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('SSE handler 回傳 404（jobId 不存在）', async () => {
    const statusStore = new MemoryStatusStore()
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ statusStore })

    orbit.install(core as any)

    const routeHandler = capture.routes[0].handler

    const ctx = createMockContext({ params: { jobId: 'nonexistent' } })

    const response = await routeHandler(ctx)

    // SSEHandler.createStream 回傳 404
    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(404)
  })
})

describe('OrbitForge install() - forge:init hook', () => {
  it('install 完成後觸發 forge:init hook', () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ sse: { enabled: false } })

    orbit.install(core as any)

    // hooks.doAction 應被呼叫
    expect(core.hooks.doAction).toHaveBeenCalledWith('forge:init', expect.anything())
    expect(capture.hookCalls).toHaveLength(1)
    expect(capture.hookCalls[0].action).toBe('forge:init')
  })

  it('hook 接收的參數為 ForgeService 實例', () => {
    const { core, capture } = createMockPlanetCore()
    const orbit = new OrbitForge({ sse: { enabled: false } })

    orbit.install(core as any)

    // hook 的第二個參數應為 ForgeService 實例
    const hookArg = capture.hookCalls[0].args[0] as any
    expect(hookArg).toBeDefined()
    expect(typeof hookArg.process).toBe('function')
    expect(typeof hookArg.processAsync).toBe('function')
    expect(typeof hookArg.createVideoPipeline).toBe('function')
    expect(typeof hookArg.createImagePipeline).toBe('function')
  })
})
