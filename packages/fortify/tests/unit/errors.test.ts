import { describe, expect, test } from 'bun:test'
import { ErrorCodes } from '../../src/errors/codes'
import { FortifyError } from '../../src/errors/FortifyError'

describe('FortifyError', () => {
  test('creates error with code and status', () => {
    const error = new FortifyError(ErrorCodes.AUTH_INVALID_CREDENTIALS, 401)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FortifyError)
    expect(error.code).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS)
    expect(error.httpStatus).toBe(401)
    expect(error.name).toBe('FortifyError')
  })

  test('defaults to 422 status', () => {
    const error = new FortifyError(ErrorCodes.REG_EMAIL_TAKEN)

    expect(error.httpStatus).toBe(422)
  })

  test('includes details when provided', () => {
    const details = { unlockAt: new Date() }
    const error = new FortifyError(ErrorCodes.AUTH_ACCOUNT_LOCKED, 423, details)

    expect(error.details).toEqual(details)
  })

  test('invalidCredentials factory', () => {
    const error = FortifyError.invalidCredentials()

    expect(error.code).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS)
    expect(error.httpStatus).toBe(401)
  })

  test('accountLocked factory with unlock time', () => {
    const unlockAt = new Date()
    const error = FortifyError.accountLocked(unlockAt)

    expect(error.code).toBe(ErrorCodes.AUTH_ACCOUNT_LOCKED)
    expect(error.httpStatus).toBe(423)
    expect(error.details).toEqual({ unlockAt })
  })

  test('emailTaken factory', () => {
    const error = FortifyError.emailTaken()

    expect(error.code).toBe(ErrorCodes.REG_EMAIL_TAKEN)
    expect(error.httpStatus).toBe(422)
  })

  test('weakPassword factory with reasons', () => {
    const reasons = ['too short', 'no uppercase']
    const error = FortifyError.weakPassword(reasons)

    expect(error.code).toBe(ErrorCodes.REG_WEAK_PASSWORD)
    expect(error.details).toEqual({ reasons })
  })

  test('validationFailed factory with errors', () => {
    const errors = { email: ['required'], password: ['too short'] }
    const error = FortifyError.validationFailed(errors)

    expect(error.code).toBe(ErrorCodes.REG_VALIDATION_FAILED)
    expect(error.details).toEqual({ errors })
  })

  test('tooManyAttempts factory with retry time', () => {
    const error = FortifyError.tooManyAttempts(60)

    expect(error.code).toBe(ErrorCodes.RATE_TOO_MANY_ATTEMPTS)
    expect(error.httpStatus).toBe(429)
    expect(error.details).toEqual({ retryAfter: 60 })
  })

  test('internal factory', () => {
    const originalError = new Error('Database connection failed')
    const error = FortifyError.internal(originalError)

    expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR)
    expect(error.httpStatus).toBe(500)
    expect(error.details).toEqual({ error: originalError })
  })
})
