import { expect } from 'bun:test'
import { GravitoException } from '../../src/exceptions/GravitoException'
import { InfrastructureException } from '../../src/exceptions/InfrastructureException'

/**
 * Options for assertGravitoException contract assertion
 */
export interface ContractAssertOptions {
  expectedCode: string
  expectedStatus: number
  expectedInstanceOf?: Function[]
  expectRetryable?: boolean
  expectCause?: boolean
}

/**
 * Reusable contract assertion helper for GravitoException subclasses.
 * Validates the structural contract: instanceof, .code, .status, .name, .retryable, .cause.
 *
 * Used by core contract tests and can be re-exported for Orbit package tests (Phase 18-19).
 */
export function assertGravitoException(err: unknown, opts: ContractAssertOptions): void {
  // 1. Base instanceof check
  expect(err).toBeInstanceOf(Error)
  expect(err).toBeInstanceOf(GravitoException)

  const e = err as GravitoException

  // 2. Required structural fields
  expect(e.code).toBe(opts.expectedCode)
  expect(e.status).toBe(opts.expectedStatus)
  expect(typeof e.code).toBe('string')
  expect(typeof e.status).toBe('number')

  // 3. Additional instanceof checks (intermediate layers)
  if (opts.expectedInstanceOf) {
    for (const cls of opts.expectedInstanceOf) {
      expect(err).toBeInstanceOf(cls)
    }
  }

  // 4. Cause chain preservation (ERRM-03)
  if (opts.expectCause) {
    expect(e.cause).toBeDefined()
  }

  // 5. Retryable field for InfrastructureException (D-02)
  if (opts.expectRetryable !== undefined) {
    expect(err).toBeInstanceOf(InfrastructureException)
    expect((err as InfrastructureException).retryable).toBe(opts.expectRetryable)
  }

  // 6. Anti-regression: name field is set (not generic 'Error')
  expect(e.name).not.toBe('Error')
}
