import { describe, expect, it, jest } from 'bun:test'
import { ConsoleEchoLogger } from '../../../src/observability/logging/ConsoleEchoLogger'

describe('ConsoleEchoLogger', () => {
  it('should log info', () => {
    const logger = new ConsoleEchoLogger()
    const spy = jest.spyOn(console, 'info').mockImplementation(() => {
      // Mock implementation
    })

    logger.info('test')

    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('should log debug messages', () => {
    const logger = new ConsoleEchoLogger()
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {
      // Mock implementation
    })

    logger.debug('debug message')

    expect(spy).toHaveBeenCalled()
    const output = JSON.parse(spy.mock.calls[0][0] as string)
    expect(output.level).toBe('debug')
    expect(output.message).toBe('debug message')
    expect(output.module).toBe('echo')
    expect(output.timestamp).toBeDefined()

    spy.mockRestore()
  })

  it('should log warn messages', () => {
    const logger = new ConsoleEchoLogger()
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {
      // Mock implementation
    })

    logger.warn('warning message')

    expect(spy).toHaveBeenCalled()
    const output = JSON.parse(spy.mock.calls[0][0] as string)
    expect(output.level).toBe('warn')
    expect(output.message).toBe('warning message')
    expect(output.module).toBe('echo')

    spy.mockRestore()
  })

  it('should log error messages', () => {
    const logger = new ConsoleEchoLogger()
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {
      // Mock implementation
    })

    logger.error('error message')

    expect(spy).toHaveBeenCalled()
    const output = JSON.parse(spy.mock.calls[0][0] as string)
    expect(output.level).toBe('error')
    expect(output.message).toBe('error message')
    expect(output.module).toBe('echo')

    spy.mockRestore()
  })

  it('should include context in log output', () => {
    const logger = new ConsoleEchoLogger()
    const spy = jest.spyOn(console, 'info').mockImplementation(() => {
      // Mock implementation
    })

    logger.info('message with context', { userId: '123', action: 'test' })

    expect(spy).toHaveBeenCalled()
    const output = JSON.parse(spy.mock.calls[0][0] as string)
    expect(output.userId).toBe('123')
    expect(output.action).toBe('test')
    expect(output.message).toBe('message with context')

    spy.mockRestore()
  })

  it('should include context in debug logs', () => {
    const logger = new ConsoleEchoLogger()
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {
      // Mock implementation
    })

    logger.debug('debug with context', { trace: 'stack', eventId: 'evt_123' })

    expect(spy).toHaveBeenCalled()
    const output = JSON.parse(spy.mock.calls[0][0] as string)
    expect(output.trace).toBe('stack')
    expect(output.eventId).toBe('evt_123')

    spy.mockRestore()
  })

  it('should include context in warn logs', () => {
    const logger = new ConsoleEchoLogger()
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {
      // Mock implementation
    })

    logger.warn('warning with context', { deprecated: true, replacement: 'newMethod' })

    expect(spy).toHaveBeenCalled()
    const output = JSON.parse(spy.mock.calls[0][0] as string)
    expect(output.deprecated).toBe(true)
    expect(output.replacement).toBe('newMethod')

    spy.mockRestore()
  })

  it('should include context in error logs', () => {
    const logger = new ConsoleEchoLogger()
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {
      // Mock implementation
    })

    logger.error('error with context', { code: 'ERR_TIMEOUT', retries: 3 })

    expect(spy).toHaveBeenCalled()
    const output = JSON.parse(spy.mock.calls[0][0] as string)
    expect(output.code).toBe('ERR_TIMEOUT')
    expect(output.retries).toBe(3)

    spy.mockRestore()
  })
})
