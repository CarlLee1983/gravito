import { describe, expect, test } from 'bun:test'
import { AuthException, DomainException, GravitoException } from '@gravito/core'
import { assertGravitoException } from '../../../core/tests/contract/helpers'
import { ErrorCodes } from '../../src/errors/codes'
import { FortifyError } from '../../src/errors/FortifyError'

describe('FortifyError contract', () => {
  test('FortifyError.invalidCredentials() satisfies GravitoException contract', () => {
    const error = FortifyError.invalidCredentials()

    assertGravitoException(error, {
      expectedCode: ErrorCodes.AUTH_INVALID_CREDENTIALS,
      expectedStatus: 401,
      expectedInstanceOf: [AuthException, DomainException, GravitoException],
    })
  })

  test('FortifyError is instanceof AuthException, DomainException, GravitoException', () => {
    const error = new FortifyError(ErrorCodes.AUTH_UNAUTHENTICATED, 401)

    expect(error).toBeInstanceOf(FortifyError)
    expect(error).toBeInstanceOf(AuthException)
    expect(error).toBeInstanceOf(DomainException)
    expect(error).toBeInstanceOf(GravitoException)
    expect(error).toBeInstanceOf(Error)
  })

  test('httpStatus backward compat: error.httpStatus === error.status', () => {
    const error = FortifyError.sessionExpired()

    expect(error.httpStatus).toBe(401)
    expect(error.status).toBe(401)
    expect(error.httpStatus).toBe(error.status)
  })

  test('httpStatus backward compat for various factory methods', () => {
    expect(FortifyError.emailTaken().httpStatus).toBe(422)
    expect(FortifyError.userNotFound().httpStatus).toBe(404)
    expect(FortifyError.tooManyAttempts(60).httpStatus).toBe(429)
    expect(FortifyError.internal().httpStatus).toBe(500)
  })

  test('cause chain preservation via options', () => {
    const cause = new Error('original error')
    // FortifyError doesn't accept cause directly in constructor, but details can carry it
    const error = FortifyError.internal(cause)

    expect(error.details).toEqual({ error: cause })
    expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR)
    expect(error.status).toBe(500)
  })

  test('name is set correctly', () => {
    const error = FortifyError.invalidCredentials()

    expect(error.name).toBe('FortifyError')
    expect(error.name).not.toBe('Error')
    expect(error.name).not.toBe('AuthException')
  })

  test('all factory methods produce FortifyError instances with correct codes', () => {
    const cases: Array<[FortifyError, string, number]> = [
      [FortifyError.invalidCredentials(), ErrorCodes.AUTH_INVALID_CREDENTIALS, 401],
      [FortifyError.emailNotVerified(), ErrorCodes.AUTH_EMAIL_NOT_VERIFIED, 403],
      [FortifyError.emailTaken(), ErrorCodes.REG_EMAIL_TAKEN, 422],
      [FortifyError.invalidToken(), ErrorCodes.PWD_TOKEN_INVALID, 422],
      [FortifyError.alreadyVerified(), ErrorCodes.VER_ALREADY_VERIFIED, 200],
      [FortifyError.unknownProvider(), ErrorCodes.OAUTH_UNKNOWN_PROVIDER, 404],
      [FortifyError.invalidCode(), ErrorCodes.TFA_INVALID_CODE, 422],
      [FortifyError.invalidMagicLink(), ErrorCodes.MAGIC_LINK_INVALID, 422],
    ]

    for (const [error, expectedCode, expectedStatus] of cases) {
      expect(error).toBeInstanceOf(FortifyError)
      expect(error).toBeInstanceOf(AuthException)
      expect(error.code).toBe(expectedCode)
      expect(error.status).toBe(expectedStatus)
      expect(error.httpStatus).toBe(expectedStatus)
    }
  })
})
