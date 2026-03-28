import { describe, expect, it } from 'bun:test'
import { GravitoException, SystemException } from '@gravito/core'
import { LaunchpadError } from '../../src/errors/LaunchpadError'
import { LaunchpadErrorCodes } from '../../src/errors/codes'

describe('LaunchpadError contract', () => {
  it('extends SystemException and GravitoException', () => {
    const err = new LaunchpadError(500, LaunchpadErrorCodes.SCAFFOLD_FAILED, {
      message: 'test error',
    })
    expect(err).toBeInstanceOf(LaunchpadError)
    expect(err).toBeInstanceOf(SystemException)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(Error)
  })

  it('has correct name, code, and status', () => {
    const err = new LaunchpadError(404, LaunchpadErrorCodes.ROCKET_NOT_FOUND, {
      message: 'rocket not found',
    })
    expect(err.name).toBe('LaunchpadError')
    expect(err.code).toBe('launchpad.rocket_not_found')
    expect(err.status).toBe(404)
    expect(err.message).toBe('rocket not found')
  })

  it('supports all defined error codes with launchpad. prefix', () => {
    const codes = Object.values(LaunchpadErrorCodes)
    for (const code of codes) {
      expect(code).toMatch(/^launchpad\./)
    }
  })

  it('is safe across ESM/CJS boundaries (Object.setPrototypeOf)', () => {
    const err = new LaunchpadError(422, LaunchpadErrorCodes.ROCKET_INVALID_STATE, {
      message: 'invalid state',
    })
    expect(err instanceof LaunchpadError).toBe(true)
    expect(err instanceof SystemException).toBe(true)
  })
})
