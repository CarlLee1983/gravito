import { describe, expect, it } from 'bun:test'
import { InfrastructureException } from '@gravito/core'
import { assertGravitoException } from '../../../core/tests/contract/helpers'
import { MailErrorCode, MailTransportError } from '../../src/errors'

describe('MailTransportError — GravitoException contract', () => {
  it('satisfies GravitoException contract (CONNECTION_FAILED → mail.connection_failed)', () => {
    const cause = new Error('TCP connect timeout')
    const err = new MailTransportError(
      'Failed to connect to SMTP server',
      MailErrorCode.CONNECTION_FAILED,
      cause
    )

    assertGravitoException(err, {
      expectedCode: 'mail.connection_failed',
      expectedStatus: 502,
      expectedInstanceOf: [InfrastructureException],
      expectRetryable: true,
      expectCause: true,
    })
  })

  it('satisfies GravitoException contract (UNKNOWN → mail.unknown, not retryable)', () => {
    const err = new MailTransportError('Unexpected failure', MailErrorCode.UNKNOWN)

    assertGravitoException(err, {
      expectedCode: 'mail.unknown',
      expectedStatus: 502,
      expectedInstanceOf: [InfrastructureException],
      expectRetryable: false,
    })
  })

  it('preserves legacy code for backward compat', () => {
    const err = new MailTransportError(
      'Connection refused',
      MailErrorCode.CONNECTION_FAILED,
      new Error('ECONNREFUSED')
    )

    expect(err.legacyCode).toBe(MailErrorCode.CONNECTION_FAILED)
    // New-style code is available as .code
    expect(err.code).toBe('mail.connection_failed')
  })

  it('instanceof chain: MailTransportError → InfrastructureException → Error', () => {
    const err = new MailTransportError('Auth failed', MailErrorCode.AUTH_FAILED)

    expect(err).toBeInstanceOf(MailTransportError)
    expect(err).toBeInstanceOf(InfrastructureException)
    expect(err).toBeInstanceOf(Error)
  })

  it('non-retryable codes: AUTH_FAILED, RECIPIENT_REJECTED, MESSAGE_REJECTED', () => {
    for (const code of [
      MailErrorCode.AUTH_FAILED,
      MailErrorCode.RECIPIENT_REJECTED,
      MailErrorCode.MESSAGE_REJECTED,
    ]) {
      const err = new MailTransportError('error', code)
      expect(err.retryable).toBe(false)
    }
  })

  it('retryable codes: CONNECTION_FAILED, RATE_LIMIT', () => {
    for (const code of [MailErrorCode.CONNECTION_FAILED, MailErrorCode.RATE_LIMIT]) {
      const err = new MailTransportError('error', code)
      expect(err.retryable).toBe(true)
    }
  })

  it('name field is MailTransportError (not generic Error)', () => {
    const err = new MailTransportError('test', MailErrorCode.UNKNOWN)
    expect(err.name).toBe('MailTransportError')
  })
})
