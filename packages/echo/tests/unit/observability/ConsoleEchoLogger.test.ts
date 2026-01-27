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
})
