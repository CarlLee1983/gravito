import { describe, expect, it } from 'bun:test'
import { GravitoException, InfrastructureException } from '@gravito/core'
import { assertGravitoException } from '../../../core/tests/contract/helpers'
import {
  BeamError,
  BeamHttpError,
  BeamNetworkError,
  BeamPoolExhaustedError,
  BeamTimeoutError,
} from '../../src/errors'

describe('BeamError contract (MIGR-02, D-05)', () => {
  it('BeamError is instanceof GravitoException', () => {
    const err = new BeamError('test')
    expect(err).toBeInstanceOf(GravitoException)
  })

  it('BeamError is instanceof InfrastructureException', () => {
    const err = new BeamError('test')
    expect(err).toBeInstanceOf(InfrastructureException)
  })

  it('BeamError is instanceof Error', () => {
    const err = new BeamError('test')
    expect(err).toBeInstanceOf(Error)
  })

  it('satisfies assertGravitoException contract', () => {
    const err = new BeamError('beam failed', 503, 'beam.error')
    assertGravitoException(err, {
      expectedCode: 'beam.error',
      expectedStatus: 503,
      expectedInstanceOf: [InfrastructureException, GravitoException],
      expectRetryable: false,
    })
  })

  it('.retryable defaults to false', () => {
    const err = new BeamError('test')
    expect(err.retryable).toBe(false)
  })

  it('preserves cause chain (ERRM-03)', () => {
    const cause = new Error('original cause')
    const err = new BeamError('wrapped', 503, 'beam.error', cause)
    expect(err.cause).toBe(cause)
  })

  it('name is BeamError (not Error or InfrastructureException)', () => {
    const err = new BeamError('test')
    expect(err.name).toBe('BeamError')
  })

  it('ESM/CJS instanceof boundary safety via Object.setPrototypeOf', () => {
    const err = new BeamError('test')
    expect(err instanceof BeamError).toBe(true)
    expect(err instanceof InfrastructureException).toBe(true)
    expect(err instanceof GravitoException).toBe(true)
  })

  describe('BeamNetworkError contract', () => {
    it('is instanceof BeamError chain', () => {
      const err = new BeamNetworkError('connection refused')
      expect(err).toBeInstanceOf(BeamError)
      expect(err).toBeInstanceOf(InfrastructureException)
      expect(err).toBeInstanceOf(GravitoException)
    })

    it('satisfies assertGravitoException contract', () => {
      const err = new BeamNetworkError('DNS failed')
      assertGravitoException(err, {
        expectedCode: 'NETWORK_ERROR',
        expectedStatus: 503,
        expectedInstanceOf: [BeamError, InfrastructureException],
        expectRetryable: false,
      })
    })
  })

  describe('BeamTimeoutError contract', () => {
    it('is instanceof BeamError chain', () => {
      const err = new BeamTimeoutError(5000)
      expect(err).toBeInstanceOf(BeamError)
      expect(err).toBeInstanceOf(InfrastructureException)
    })

    it('satisfies assertGravitoException contract', () => {
      const err = new BeamTimeoutError(3000)
      assertGravitoException(err, {
        expectedCode: 'TIMEOUT',
        expectedStatus: 503,
        expectedInstanceOf: [BeamError, InfrastructureException],
        expectRetryable: false,
      })
    })
  })

  describe('BeamHttpError contract', () => {
    it('is instanceof BeamError chain', () => {
      const err = new BeamHttpError('Not Found', 404)
      expect(err).toBeInstanceOf(BeamError)
      expect(err).toBeInstanceOf(InfrastructureException)
    })

    it('satisfies assertGravitoException contract', () => {
      const err = new BeamHttpError('Internal Server Error', 500)
      assertGravitoException(err, {
        expectedCode: 'HTTP_500',
        expectedStatus: 500,
        expectedInstanceOf: [BeamError, InfrastructureException],
        expectRetryable: false,
      })
    })
  })

  describe('BeamPoolExhaustedError contract', () => {
    it('is instanceof BeamError chain', () => {
      const err = new BeamPoolExhaustedError('api.example.com', 5000)
      expect(err).toBeInstanceOf(BeamError)
      expect(err).toBeInstanceOf(InfrastructureException)
    })

    it('satisfies assertGravitoException contract', () => {
      const err = new BeamPoolExhaustedError('example.com', 3000)
      assertGravitoException(err, {
        expectedCode: 'POOL_EXHAUSTED',
        expectedStatus: 503,
        expectedInstanceOf: [BeamError, InfrastructureException],
        expectRetryable: false,
      })
    })
  })
})
