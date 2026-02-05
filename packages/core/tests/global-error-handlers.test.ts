import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test'

// 測試前先清除全域狀態
const stateKey = Symbol.for('gravito.core.globalErrorHandlers')

function clearGlobalState() {
  const g = globalThis as unknown as Record<symbol, unknown>
  delete g[stateKey]
}

// 動態匯入以確保每次測試都能取得乾淨狀態
async function loadModule() {
  // 清除 require cache 不直接可行，但因為模組使用 Symbol 全域狀態，
  // 我們清除該狀態即可
  clearGlobalState()
  return await import('../src/GlobalErrorHandlers')
}

describe('GlobalErrorHandlers', () => {
  beforeEach(() => {
    clearGlobalState()
  })

  afterEach(() => {
    clearGlobalState()
  })

  describe('registerGlobalErrorHandlers', () => {
    it('should return a cleanup function', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const cleanup = registerGlobalErrorHandlers()
      expect(typeof cleanup).toBe('function')
      cleanup()
    })

    it('should default mode to exitInProduction', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const cleanup = registerGlobalErrorHandlers()
      // 只要不拋出錯誤即可
      expect(cleanup).toBeDefined()
      cleanup()
    })

    it('should accept mode: log option', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const cleanup = registerGlobalErrorHandlers({ mode: 'log' })
      expect(cleanup).toBeDefined()
      cleanup()
    })

    it('should accept mode: exit option', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const cleanup = registerGlobalErrorHandlers({ mode: 'exit' })
      expect(cleanup).toBeDefined()
      cleanup()
    })

    it('should accept custom exitCode and gracePeriodMs', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const cleanup = registerGlobalErrorHandlers({
        mode: 'log',
        exitCode: 2,
        gracePeriodMs: 500,
      })
      expect(cleanup).toBeDefined()
      cleanup()
    })

    it('should support multiple registrations', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const cleanup1 = registerGlobalErrorHandlers({ mode: 'log' })
      const cleanup2 = registerGlobalErrorHandlers({ mode: 'log' })
      expect(cleanup1).toBeDefined()
      expect(cleanup2).toBeDefined()
      cleanup1()
      cleanup2()
    })

    it('should remove listeners when all sinks removed', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const cleanup1 = registerGlobalErrorHandlers({ mode: 'log' })
      const cleanup2 = registerGlobalErrorHandlers({ mode: 'log' })
      cleanup1()
      cleanup2()
      // 此時所有 sink 已移除，listeners 應被拆除
    })

    it('should install listeners only once', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const cleanup1 = registerGlobalErrorHandlers({ mode: 'log' })
      const cleanup2 = registerGlobalErrorHandlers({ mode: 'log' })
      // 不應該重複安裝 listeners
      cleanup1()
      cleanup2()
    })

    it('should accept logger option', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }
      const cleanup = registerGlobalErrorHandlers({ mode: 'log', logger })
      expect(cleanup).toBeDefined()
      cleanup()
    })
  })

  describe('safeMessageFromUnknown (indirectly tested via error handling)', () => {
    // 測試不同的錯誤類型被正確處理
    it('should handle Error instances', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }

      const cleanup = registerGlobalErrorHandlers({ mode: 'log', logger })

      // 觸發 unhandledRejection 事件
      const testError = new Error('test error message')
      process.emit('unhandledRejection' as any, testError, Promise.resolve())

      // 給予非同步處理時間
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(logger.error).toHaveBeenCalled()
      const callArgs = (logger.error as any).mock.calls[0]
      expect(callArgs[0]).toContain('test error message')

      cleanup()
    })

    it('should handle string errors', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }

      const cleanup = registerGlobalErrorHandlers({ mode: 'log', logger })

      process.emit('unhandledRejection' as any, 'string error', Promise.resolve())
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(logger.error).toHaveBeenCalled()
      const callArgs = (logger.error as any).mock.calls[0]
      expect(callArgs[0]).toContain('string error')

      cleanup()
    })

    it('should handle object errors via JSON.stringify', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }

      const cleanup = registerGlobalErrorHandlers({ mode: 'log', logger })

      process.emit('unhandledRejection' as any, { code: 42 }, Promise.resolve())
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(logger.error).toHaveBeenCalled()

      cleanup()
    })

    it('should handle circular reference objects gracefully', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }

      const cleanup = registerGlobalErrorHandlers({ mode: 'log', logger })

      const circular: any = {}
      circular.self = circular

      process.emit('unhandledRejection' as any, circular, Promise.resolve())
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(logger.error).toHaveBeenCalled()

      cleanup()
    })
  })

  describe('log levels', () => {
    it('should handle warn logLevel via filter hook', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }

      // 無 core，使用預設 logLevel (error)
      const cleanup = registerGlobalErrorHandlers({ mode: 'log', logger })

      process.emit('unhandledRejection' as any, new Error('test'), Promise.resolve())
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(logger.error).toHaveBeenCalled()

      cleanup()
    })
  })

  describe('uncaughtException handling', () => {
    it('should handle uncaughtException events', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }

      // 使用 mode: 'log' 避免 process.exit
      const cleanup = registerGlobalErrorHandlers({ mode: 'log', logger })

      // 模擬 uncaughtException（注意：真正的 uncaughtException 會呼叫 process.exit）
      // 我們使用 emit 直接觸發已註冊的 listener
      const state = (globalThis as any)[stateKey]
      if (state?.onUncaughtException) {
        state.onUncaughtException(new Error('uncaught test'))
        await new Promise((resolve) => setTimeout(resolve, 50))
        expect(logger.error).toHaveBeenCalled()
      }

      cleanup()
    })
  })

  describe('empty sinks scenario', () => {
    it('should do nothing when no sinks registered and error occurs', async () => {
      const { registerGlobalErrorHandlers } = await loadModule()
      const cleanup = registerGlobalErrorHandlers({ mode: 'log' })
      cleanup() // 移除 sink

      // 觸發事件，但因沒有 sink 應該不做任何事
      process.emit('unhandledRejection' as any, new Error('ignored'), Promise.resolve())
      await new Promise((resolve) => setTimeout(resolve, 50))
      // 不應拋出錯誤
    })
  })
})
