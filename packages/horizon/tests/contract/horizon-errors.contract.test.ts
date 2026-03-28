import { describe, expect, it } from 'bun:test'
import { GravitoException, SystemException } from '@gravito/core'
import { HorizonError } from '../../src/errors/HorizonError'
import { HorizonErrorCodes } from '../../src/errors/codes'

describe('HorizonError contract', () => {
  it('extends SystemException and GravitoException', () => {
    const err = new HorizonError(500, HorizonErrorCodes.SCHEDULE_FAILED, {
      message: 'test error',
    })
    expect(err).toBeInstanceOf(HorizonError)
    expect(err).toBeInstanceOf(SystemException)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(Error)
  })

  it('has correct name, code, and status', () => {
    const err = new HorizonError(422, HorizonErrorCodes.CRON_PARSE_ERROR, {
      message: 'bad cron',
    })
    expect(err.name).toBe('HorizonError')
    expect(err.code).toBe('horizon.cron_parse_error')
    expect(err.status).toBe(422)
    expect(err.message).toBe('bad cron')
  })

  it('supports all defined error codes', () => {
    const codes = Object.values(HorizonErrorCodes)
    for (const code of codes) {
      expect(code).toMatch(/^horizon\./)
    }
  })

  it('is safe across ESM/CJS boundaries (Object.setPrototypeOf)', () => {
    const err = new HorizonError(500, HorizonErrorCodes.COMMAND_FAILED, {
      message: 'cmd failed',
    })
    // instanceof check must work even after prototype chain manipulation
    expect(err instanceof HorizonError).toBe(true)
    expect(err instanceof SystemException).toBe(true)
  })
})
