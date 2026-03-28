import { describe, expect, it } from 'bun:test'
import { CacheException } from '../../src/exceptions/CacheException'
import { DatabaseException } from '../../src/exceptions/DatabaseException'
import { InfrastructureException } from '../../src/exceptions'
import { GravitoException } from '../../src/exceptions/GravitoException'
import { assertGravitoException } from './helpers'

// Concrete subclasses for testing (abstract classes cannot be instantiated directly)
class TestDatabaseError extends DatabaseException {
  constructor() {
    super(503, 'db.test', { message: 'test db error', retryable: true })
  }
}

class TestCacheError extends CacheException {
  constructor() {
    super(503, 'redis.test', { message: 'test cache error', retryable: false })
  }
}

describe('DatabaseException contract', () => {
  it('Test 1: is instanceof DatabaseException, InfrastructureException, GravitoException, Error', () => {
    const err = new TestDatabaseError()
    expect(err).toBeInstanceOf(DatabaseException)
    expect(err).toBeInstanceOf(InfrastructureException)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(Error)
  })

  it('Test 3: carries .status, .code, .retryable fields', () => {
    assertGravitoException(new TestDatabaseError(), {
      expectedCode: 'db.test',
      expectedStatus: 503,
      expectedInstanceOf: [DatabaseException, InfrastructureException],
      expectRetryable: true,
    })
  })

  it('Test 5: instanceof works across ESM boundary (new.target.prototype)', () => {
    // Verify Object.setPrototypeOf was called correctly
    const err = new TestDatabaseError()
    expect(Object.getPrototypeOf(err)).toBe(TestDatabaseError.prototype)
    expect(err instanceof DatabaseException).toBe(true)
  })

  it('Test 6: DatabaseException.name is DatabaseException', () => {
    const err = new TestDatabaseError()
    // The subclass sets a more specific name
    expect(err.name).not.toBe('Error')
    expect(err.name).not.toBe('InfrastructureException')
  })
})

describe('CacheException contract', () => {
  it('Test 2: is instanceof CacheException, InfrastructureException, GravitoException, Error', () => {
    const err = new TestCacheError()
    expect(err).toBeInstanceOf(CacheException)
    expect(err).toBeInstanceOf(InfrastructureException)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(Error)
  })

  it('Test 4: carries .status, .code, .retryable fields', () => {
    assertGravitoException(new TestCacheError(), {
      expectedCode: 'redis.test',
      expectedStatus: 503,
      expectedInstanceOf: [CacheException, InfrastructureException],
      expectRetryable: false,
    })
  })

  it('Test 5: instanceof works across ESM boundary (new.target.prototype)', () => {
    const err = new TestCacheError()
    expect(Object.getPrototypeOf(err)).toBe(TestCacheError.prototype)
    expect(err instanceof CacheException).toBe(true)
  })

  it('Test 6: CacheException.name is CacheException', () => {
    const err = new TestCacheError()
    expect(err.name).not.toBe('Error')
    expect(err.name).not.toBe('InfrastructureException')
  })
})
