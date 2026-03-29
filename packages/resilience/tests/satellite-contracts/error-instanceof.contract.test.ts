import { describe, expect, it } from 'bun:test'
import { GravitoException, InfrastructureException } from '@gravito/core'
import { CircuitOpenException } from '../../src/exceptions/CircuitOpenException'
import { RetryExhaustedException } from '../../src/exceptions/RetryExhaustedException'
import { assertGravitoException } from '../../../core/tests/contract/helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Satellite compatibility contract tests: error instanceof chains
//
// These tests verify that Orbit error types are backward-compatible with the
// pattern used in Satellite catch blocks:
//   catch (e) { if (e instanceof GravitoException) ... }
//
// Failures here indicate a breaking change in error hierarchy that would
// silently break Satellite error handling at runtime.
// ─────────────────────────────────────────────────────────────────────────────

describe('Satellite compatibility: CircuitOpenException hierarchy', () => {
  it('is instanceof InfrastructureException', () => {
    const err = new CircuitOpenException({ breakerName: 'atlas-db' })
    assertGravitoException(err, {
      expectedCode: 'resilience.circuit_open',
      expectedStatus: 503,
      expectedInstanceOf: [InfrastructureException],
      expectRetryable: false,
    })
  })

  it('is instanceof GravitoException', () => {
    const err = new CircuitOpenException({ breakerName: 'atlas-db' })
    expect(err).toBeInstanceOf(GravitoException)
  })
})

describe('Satellite compatibility: RetryExhaustedException hierarchy', () => {
  it('is instanceof InfrastructureException', () => {
    const err = new RetryExhaustedException({ message: 'test', cause: new Error('boom') })
    assertGravitoException(err, {
      expectedCode: 'resilience.retry_exhausted',
      expectedStatus: 503,
      expectedInstanceOf: [InfrastructureException],
      expectCause: true,
    })
  })
})

describe('Satellite compatibility: cross-boundary instanceof', () => {
  it('catch (e) { if (e instanceof GravitoException) } works for resilience errors', () => {
    // This is the exact pattern used in Satellite catch blocks.
    // Verifying that instanceof works correctly across ESM/CJS boundaries
    // via the Object.setPrototypeOf call in each exception constructor.
    const e: unknown = new CircuitOpenException({ breakerName: 'test-breaker' })

    expect(e instanceof GravitoException).toBe(true)
    expect(e instanceof InfrastructureException).toBe(true)
    expect(e instanceof CircuitOpenException).toBe(true)
  })
})

describe('Satellite compatibility: error .code field is stable', () => {
  it('CircuitOpenException.code is resilience.circuit_open', () => {
    const err = new CircuitOpenException()
    expect(err.code).toBe('resilience.circuit_open')
  })

  it('RetryExhaustedException.code is resilience.retry_exhausted', () => {
    const err = new RetryExhaustedException()
    expect(err.code).toBe('resilience.retry_exhausted')
  })
})
