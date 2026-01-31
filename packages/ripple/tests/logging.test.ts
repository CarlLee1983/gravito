import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { ConsoleLogger, createLogger } from '../src/logging/Logger'

describe('Logger', () => {
  describe('ConsoleLogger', () => {
    let consoleDebug: ReturnType<typeof mock>
    let consoleInfo: ReturnType<typeof mock>
    let consoleWarn: ReturnType<typeof mock>
    let consoleError: ReturnType<typeof mock>

    beforeEach(() => {
      consoleDebug = mock(() => {})
      consoleInfo = mock(() => {})
      consoleWarn = mock(() => {})
      consoleError = mock(() => {})

      console.debug = consoleDebug
      console.info = consoleInfo
      console.warn = consoleWarn
      console.error = consoleError
    })

    it('should log debug messages when level is debug', () => {
      const logger = new ConsoleLogger('TestModule', 'debug')
      logger.debug('Test message')

      expect(consoleDebug).toHaveBeenCalledTimes(1)
      const logOutput = JSON.parse(consoleDebug.mock.calls[0][0])
      expect(logOutput.message).toBe('Test message')
      expect(logOutput.level).toBe('debug')
      expect(logOutput.module).toBe('TestModule')
      expect(logOutput.timestamp).toBeDefined()
    })

    it('should log info messages', () => {
      const logger = new ConsoleLogger('TestModule', 'info')
      logger.info('Info message', { clientId: 'test-123' })

      expect(consoleInfo).toHaveBeenCalledTimes(1)
      const logOutput = JSON.parse(consoleInfo.mock.calls[0][0])
      expect(logOutput.message).toBe('Info message')
      expect(logOutput.level).toBe('info')
      expect(logOutput.clientId).toBe('test-123')
    })

    it('should log warn messages', () => {
      const logger = new ConsoleLogger('TestModule')
      logger.warn('Warning message', { channel: 'test-channel' })

      expect(consoleWarn).toHaveBeenCalledTimes(1)
      const logOutput = JSON.parse(consoleWarn.mock.calls[0][0])
      expect(logOutput.message).toBe('Warning message')
      expect(logOutput.level).toBe('warn')
      expect(logOutput.channel).toBe('test-channel')
    })

    it('should log error messages', () => {
      const logger = new ConsoleLogger('TestModule')
      logger.error('Error message', { errorCode: 'ERR_TEST' })

      expect(consoleError).toHaveBeenCalledTimes(1)
      const logOutput = JSON.parse(consoleError.mock.calls[0][0])
      expect(logOutput.message).toBe('Error message')
      expect(logOutput.level).toBe('error')
      expect(logOutput.errorCode).toBe('ERR_TEST')
    })

    it('should respect log level filtering', () => {
      const logger = new ConsoleLogger('TestModule', 'warn')

      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warn message')
      logger.error('Error message')

      expect(consoleDebug).toHaveBeenCalledTimes(0)
      expect(consoleInfo).toHaveBeenCalledTimes(0)
      expect(consoleWarn).toHaveBeenCalledTimes(1)
      expect(consoleError).toHaveBeenCalledTimes(1)
    })

    it('should filter at error level', () => {
      const logger = new ConsoleLogger('TestModule', 'error')

      logger.debug('Debug')
      logger.info('Info')
      logger.warn('Warn')
      logger.error('Error')

      expect(consoleDebug).toHaveBeenCalledTimes(0)
      expect(consoleInfo).toHaveBeenCalledTimes(0)
      expect(consoleWarn).toHaveBeenCalledTimes(0)
      expect(consoleError).toHaveBeenCalledTimes(1)
    })

    it('should merge context correctly', () => {
      const logger = new ConsoleLogger('TestModule')
      logger.info('Test', {
        clientId: 'client-1',
        channel: 'test-channel',
        customField: 'custom-value',
      })

      const logOutput = JSON.parse(consoleInfo.mock.calls[0][0])
      expect(logOutput.module).toBe('TestModule')
      expect(logOutput.clientId).toBe('client-1')
      expect(logOutput.channel).toBe('test-channel')
      expect(logOutput.customField).toBe('custom-value')
    })
  })

  describe('createLogger', () => {
    it('should create a ConsoleLogger with default level', () => {
      const logger = createLogger('TestModule')
      expect(logger).toBeInstanceOf(ConsoleLogger)
    })

    it('should create a ConsoleLogger with specified level', () => {
      const logger = createLogger('TestModule', 'debug')
      expect(logger).toBeInstanceOf(ConsoleLogger)
    })
  })
})
