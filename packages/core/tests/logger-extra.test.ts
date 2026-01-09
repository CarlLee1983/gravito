import { describe, expect, it } from 'bun:test'
import { ConsoleLogger } from '../src/Logger'

describe('ConsoleLogger', () => {
  it('formats and forwards log messages', () => {
    const calls: string[] = []
    const original = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }

    console.debug = (message?: unknown) => {
      calls.push(String(message))
    }
    console.info = (message?: unknown) => {
      calls.push(String(message))
    }
    console.warn = (message?: unknown) => {
      calls.push(String(message))
    }
    console.error = (message?: unknown) => {
      calls.push(String(message))
    }

    try {
      const logger = new ConsoleLogger()
      logger.debug('alpha')
      logger.info('bravo')
      logger.warn('charlie')
      logger.error('delta')
    } finally {
      console.debug = original.debug
      console.info = original.info
      console.warn = original.warn
      console.error = original.error
    }

    expect(calls).toEqual(['[DEBUG] alpha', '[INFO] bravo', '[WARN] charlie', '[ERROR] delta'])
  })
})
