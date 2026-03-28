import { describe, expect, it } from 'bun:test'
import { AuthException, DomainException, GravitoException } from '@gravito/core'
import { SentinelError } from '../../src/errors/SentinelError'
import { SentinelErrorCodes } from '../../src/errors/codes'

describe('SentinelError contract', () => {
  it('satisfies GravitoException contract', () => {
    const err = new SentinelError(500, SentinelErrorCodes.GUARD_NOT_DEFINED, {
      message: 'Auth guard [web] is not defined.',
    })

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(AuthException)
    expect(err).toBeInstanceOf(SentinelError)

    expect(err.code).toBe('sentinel.guard_not_defined')
    expect(err.status).toBe(500)
    expect(typeof err.code).toBe('string')
    expect(typeof err.status).toBe('number')
    expect(err.name).toBe('SentinelError')
    expect(err.name).not.toBe('Error')
  })

  it('extends AuthException (not SystemException)', () => {
    const err = new SentinelError(500, SentinelErrorCodes.GUARD_NOT_DEFINED)
    expect(err).toBeInstanceOf(AuthException)
    expect(err).toBeInstanceOf(DomainException)
  })

  it('preserves message', () => {
    const err = new SentinelError(500, SentinelErrorCodes.GUARD_NOT_DEFINED, {
      message: 'Auth guard [api] is not defined.',
    })
    expect(err.message).toBe('Auth guard [api] is not defined.')
  })

  it('preserves cause', () => {
    const cause = new Error('original error')
    const err = new SentinelError(500, SentinelErrorCodes.GUARD_DRIVER_UNSUPPORTED, { cause })
    expect(err.cause).toBe(cause)
  })

  it('instanceof chain holds for all error codes', () => {
    const codes = Object.values(SentinelErrorCodes)
    for (const code of codes) {
      const err = new SentinelError(500, code)
      expect(err).toBeInstanceOf(SentinelError)
      expect(err).toBeInstanceOf(AuthException)
      expect(err).toBeInstanceOf(GravitoException)
      expect(err).toBeInstanceOf(Error)
      expect(err.code).toBe(code)
    }
  })

  it('all error codes are sentinel.* namespaced', () => {
    const codes = Object.values(SentinelErrorCodes)
    for (const code of codes) {
      expect(code).toMatch(/^sentinel\./)
    }
  })

  it('SentinelErrorCodes covers expected guard domains', () => {
    expect(SentinelErrorCodes.GUARD_NOT_DEFINED).toBe('sentinel.guard_not_defined')
    expect(SentinelErrorCodes.GUARD_DRIVER_UNSUPPORTED).toBe('sentinel.guard_driver_unsupported')
    expect(SentinelErrorCodes.GUARD_CREATOR_NOT_FOUND).toBe('sentinel.guard_creator_not_found')
    expect(SentinelErrorCodes.PROVIDER_NOT_DEFINED).toBe('sentinel.provider_not_defined')
    expect(SentinelErrorCodes.PROVIDER_NOT_FOUND).toBe('sentinel.provider_not_found')
    expect(SentinelErrorCodes.PROVIDER_DRIVER_UNSUPPORTED).toBe(
      'sentinel.provider_driver_unsupported'
    )
    expect(SentinelErrorCodes.SESSION_REPO_NOT_CONFIGURED).toBe(
      'sentinel.session_repo_not_configured'
    )
    expect(SentinelErrorCodes.INVALID_PASSWORD).toBe('sentinel.invalid_password')
  })

  it('invalid password throws 401 status', () => {
    const err = new SentinelError(401, SentinelErrorCodes.INVALID_PASSWORD, {
      message: 'Invalid password.',
    })
    expect(err.status).toBe(401)
    expect(err.code).toBe('sentinel.invalid_password')
  })
})
