import { describe, expect, it } from 'bun:test'
import type { ExceptionOptions } from '../../src/exceptions/GravitoException'
import type { InfrastructureExceptionOptions } from '../../src/exceptions/InfrastructureException'
import { AuthException } from '../../src/exceptions/AuthException'
import { QueueException } from '../../src/exceptions/QueueException'
import { StorageException } from '../../src/exceptions/StorageException'
import { StreamException } from '../../src/exceptions/StreamException'
import { DomainException } from '../../src/exceptions/DomainException'
import { InfrastructureException } from '../../src/exceptions/InfrastructureException'
import { GravitoException } from '../../src/exceptions/GravitoException'
import { assertGravitoException } from './helpers'

// Concrete subclasses for testing (abstract classes cannot be instantiated directly)
class TestAuthError extends AuthException {
  constructor(status: number, code: string, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'TestAuthError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

class TestQueueError extends QueueException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'TestQueueError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

class TestStorageError extends StorageException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'TestStorageError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

class TestStreamError extends StreamException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'TestStreamError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

describe('AuthException', () => {
  it('Test 1: is instanceof AuthException, DomainException, GravitoException, Error', () => {
    const err = new TestAuthError(401, 'auth.test', { message: 'test auth error' })
    expect(err).toBeInstanceOf(AuthException)
    expect(err).toBeInstanceOf(DomainException)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(Error)
  })

  it('Test 3: carries .status and .code fields', () => {
    assertGravitoException(new TestAuthError(401, 'auth.test'), {
      expectedCode: 'auth.test',
      expectedStatus: 401,
      expectedInstanceOf: [AuthException, DomainException],
    })
  })

  it('Test 5: instanceof works across ESM boundary (new.target.prototype)', () => {
    const err = new TestAuthError(401, 'auth.test')
    expect(Object.getPrototypeOf(err)).toBe(TestAuthError.prototype)
    expect(err instanceof AuthException).toBe(true)
  })

  it('Test 6: AuthException.name is not generic Error or DomainException', () => {
    const err = new TestAuthError(401, 'auth.test')
    expect(err.name).not.toBe('Error')
    expect(err.name).not.toBe('DomainException')
  })
})

describe('QueueException', () => {
  it('Test 1: is instanceof QueueException, InfrastructureException, GravitoException, Error', () => {
    const err = new TestQueueError(503, 'queue.test', { message: 'test queue error', retryable: true })
    expect(err).toBeInstanceOf(QueueException)
    expect(err).toBeInstanceOf(InfrastructureException)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(Error)
  })

  it('Test 3: carries .status, .code, .retryable fields', () => {
    assertGravitoException(new TestQueueError(503, 'queue.test', { retryable: true }), {
      expectedCode: 'queue.test',
      expectedStatus: 503,
      expectedInstanceOf: [QueueException, InfrastructureException],
      expectRetryable: true,
    })
  })

  it('Test 5: instanceof works across ESM boundary (new.target.prototype)', () => {
    const err = new TestQueueError(503, 'queue.test')
    expect(Object.getPrototypeOf(err)).toBe(TestQueueError.prototype)
    expect(err instanceof QueueException).toBe(true)
  })

  it('Test 6: QueueException.name is not generic Error or InfrastructureException', () => {
    const err = new TestQueueError(503, 'queue.test')
    expect(err.name).not.toBe('Error')
    expect(err.name).not.toBe('InfrastructureException')
  })
})

describe('StorageException', () => {
  it('Test 1: is instanceof StorageException, InfrastructureException, GravitoException, Error', () => {
    const err = new TestStorageError(500, 'storage.test', { message: 'test storage error', retryable: false })
    expect(err).toBeInstanceOf(StorageException)
    expect(err).toBeInstanceOf(InfrastructureException)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(Error)
  })

  it('Test 3: carries .status, .code, .retryable fields', () => {
    assertGravitoException(new TestStorageError(500, 'storage.test', { retryable: false }), {
      expectedCode: 'storage.test',
      expectedStatus: 500,
      expectedInstanceOf: [StorageException, InfrastructureException],
      expectRetryable: false,
    })
  })

  it('Test 5: instanceof works across ESM boundary (new.target.prototype)', () => {
    const err = new TestStorageError(500, 'storage.test')
    expect(Object.getPrototypeOf(err)).toBe(TestStorageError.prototype)
    expect(err instanceof StorageException).toBe(true)
  })

  it('Test 6: StorageException.name is not generic Error or InfrastructureException', () => {
    const err = new TestStorageError(500, 'storage.test')
    expect(err.name).not.toBe('Error')
    expect(err.name).not.toBe('InfrastructureException')
  })
})

describe('StreamException', () => {
  it('Test 1: is instanceof StreamException, InfrastructureException, GravitoException, Error', () => {
    const err = new TestStreamError(503, 'stream.test', { message: 'test stream error', retryable: true })
    expect(err).toBeInstanceOf(StreamException)
    expect(err).toBeInstanceOf(InfrastructureException)
    expect(err).toBeInstanceOf(GravitoException)
    expect(err).toBeInstanceOf(Error)
  })

  it('Test 3: carries .status, .code, .retryable fields', () => {
    assertGravitoException(new TestStreamError(503, 'stream.test', { retryable: true }), {
      expectedCode: 'stream.test',
      expectedStatus: 503,
      expectedInstanceOf: [StreamException, InfrastructureException],
      expectRetryable: true,
    })
  })

  it('Test 5: instanceof works across ESM boundary (new.target.prototype)', () => {
    const err = new TestStreamError(503, 'stream.test')
    expect(Object.getPrototypeOf(err)).toBe(TestStreamError.prototype)
    expect(err instanceof StreamException).toBe(true)
  })

  it('Test 6: StreamException.name is not generic Error or InfrastructureException', () => {
    const err = new TestStreamError(503, 'stream.test')
    expect(err.name).not.toBe('Error')
    expect(err.name).not.toBe('InfrastructureException')
  })
})
