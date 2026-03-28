import { describe, test, expect } from 'bun:test'
import { DatabaseException, InfrastructureException } from '@gravito/core'
import { assertGravitoException } from '../../../core/tests/contract/helpers'
import {
  DatabaseError,
  ConnectionError,
  ConstraintViolationError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  NotNullConstraintError,
  TableNotFoundError,
} from '../../src/errors'
import { DatabaseErrorCodes } from '../../src/errors/codes'

describe('Atlas Error Contract Tests', () => {
  describe('DatabaseError', () => {
    test('satisfies GravitoException contract', () => {
      const cause = new Error('original error')
      const err = new DatabaseError('query failed', cause, 'SELECT 1', [])

      assertGravitoException(err, {
        expectedCode: DatabaseErrorCodes.QUERY_FAILED,
        expectedStatus: 503,
        expectedInstanceOf: [DatabaseException, InfrastructureException],
        expectRetryable: false,
        expectCause: true,
      })

      expect(err.originalError).toBe(cause)
      expect(err.query).toBe('SELECT 1')
      expect(err.bindings).toEqual([])
      expect(err.name).toBe('DatabaseError')
    })

    test('is retryable: false by default', () => {
      const err = new DatabaseError('test')
      expect((err as InfrastructureException).retryable).toBe(false)
    })
  })

  describe('ConnectionError', () => {
    test('is retryable: true', () => {
      const err = new ConnectionError('connection failed')

      assertGravitoException(err, {
        expectedCode: DatabaseErrorCodes.CONNECTION_FAILED,
        expectedStatus: 503,
        expectRetryable: true,
      })
    })

    test('is instanceof DatabaseError', () => {
      const err = new ConnectionError('conn failed')
      expect(err).toBeInstanceOf(DatabaseError)
      expect(err).toBeInstanceOf(DatabaseException)
      expect(err).toBeInstanceOf(InfrastructureException)
    })

    test('accepts originalError', () => {
      const cause = new Error('ECONNREFUSED')
      const err = new ConnectionError('connection failed', cause)
      expect(err.originalError).toBe(cause)
      expect(err.cause).toBe(cause)
    })

    test('has correct name', () => {
      const err = new ConnectionError('test')
      expect(err.name).toBe('ConnectionError')
    })
  })

  describe('UniqueConstraintError', () => {
    test('satisfies GravitoException contract', () => {
      const err = new UniqueConstraintError('unique violation')

      assertGravitoException(err, {
        expectedCode: DatabaseErrorCodes.QUERY_FAILED,
        expectedStatus: 503,
        expectedInstanceOf: [DatabaseException],
        expectRetryable: false,
      })
    })

    test('is instanceof ConstraintViolationError and DatabaseError', () => {
      const err = new UniqueConstraintError('test')
      expect(err).toBeInstanceOf(ConstraintViolationError)
      expect(err).toBeInstanceOf(DatabaseError)
      expect(err).toBeInstanceOf(DatabaseException)
    })
  })

  describe('TableNotFoundError', () => {
    test('satisfies GravitoException contract', () => {
      const err = new TableNotFoundError('table not found')

      assertGravitoException(err, {
        expectedCode: DatabaseErrorCodes.QUERY_FAILED,
        expectedStatus: 503,
        expectedInstanceOf: [DatabaseException],
        expectRetryable: false,
      })
    })
  })

  describe('Constraint error hierarchy', () => {
    test('all constraint errors are instanceof ConstraintViolationError', () => {
      const unique = new UniqueConstraintError('test')
      const fk = new ForeignKeyConstraintError('test')
      const notNull = new NotNullConstraintError('test')

      expect(unique).toBeInstanceOf(ConstraintViolationError)
      expect(fk).toBeInstanceOf(ConstraintViolationError)
      expect(notNull).toBeInstanceOf(ConstraintViolationError)
    })

    test('all constraint errors are instanceof DatabaseError', () => {
      const unique = new UniqueConstraintError('test')
      const fk = new ForeignKeyConstraintError('test')
      const notNull = new NotNullConstraintError('test')

      expect(unique).toBeInstanceOf(DatabaseError)
      expect(fk).toBeInstanceOf(DatabaseError)
      expect(notNull).toBeInstanceOf(DatabaseError)
    })

    test('all constraint errors are instanceof DatabaseException', () => {
      const unique = new UniqueConstraintError('test')
      const fk = new ForeignKeyConstraintError('test')
      const notNull = new NotNullConstraintError('test')

      expect(unique).toBeInstanceOf(DatabaseException)
      expect(fk).toBeInstanceOf(DatabaseException)
      expect(notNull).toBeInstanceOf(DatabaseException)
    })
  })

  describe('instanceof preservation across ESM/CJS boundaries', () => {
    test('DatabaseError instanceof checks work correctly', () => {
      const err = new DatabaseError('test')
      expect(err instanceof DatabaseError).toBe(true)
      expect(err instanceof DatabaseException).toBe(true)
      expect(err instanceof Error).toBe(true)
    })

    test('ConnectionError instanceof DatabaseError is true', () => {
      const err = new ConnectionError('test')
      expect(err instanceof ConnectionError).toBe(true)
      expect(err instanceof DatabaseError).toBe(true)
    })
  })
})
