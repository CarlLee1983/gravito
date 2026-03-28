/**
 * Contract tests for GraphqlError hierarchy
 *
 * Verifies that GraphqlError extends SystemException from @gravito/core
 * and that error codes follow the graphql. namespace convention.
 */

import { SystemException } from '@gravito/core'
import { describe, expect, it } from 'bun:test'
import { GraphqlError } from '../../src/errors/GraphqlError'
import { GraphqlErrorCodes } from '../../src/errors/codes'

describe('GraphqlError contract', () => {
  it('extends SystemException', () => {
    const error = new GraphqlError(GraphqlErrorCodes.INVALID_CURSOR, 'Invalid cursor')
    expect(error).toBeInstanceOf(SystemException)
  })

  it('is instanceof GraphqlError', () => {
    const error = new GraphqlError(GraphqlErrorCodes.INVALID_SCALAR, 'Invalid scalar')
    expect(error).toBeInstanceOf(GraphqlError)
  })

  it('sets name to GraphqlError', () => {
    const error = new GraphqlError(GraphqlErrorCodes.NOT_FOUND, 'Record not found')
    expect(error.name).toBe('GraphqlError')
  })

  it('stores the error code', () => {
    const error = new GraphqlError(GraphqlErrorCodes.INVALID_CURSOR, 'test message')
    expect(error.code).toBe('graphql.invalid_cursor')
  })

  it('all error codes use graphql. namespace', () => {
    for (const code of Object.values(GraphqlErrorCodes)) {
      expect(code).toMatch(/^graphql\./)
    }
  })

  it('defaults to status 500', () => {
    const error = new GraphqlError(GraphqlErrorCodes.NOT_FOUND, 'not found')
    expect(error.status).toBe(500)
  })
})
