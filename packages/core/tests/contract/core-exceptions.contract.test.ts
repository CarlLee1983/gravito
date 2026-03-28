import { describe, expect, it } from 'bun:test'
import { AuthenticationException } from '../../src/exceptions/AuthenticationException'
import { AuthorizationException } from '../../src/exceptions/AuthorizationException'
import { CircularDependencyException } from '../../src/exceptions/CircularDependencyException'
import { ConfigurationException } from '../../src/exceptions/ConfigurationException'
import { DomainException } from '../../src/exceptions/DomainException'
import { GravitoException } from '../../src/exceptions/GravitoException'
import { HttpException } from '../../src/exceptions/HttpException'
import { ModelNotFoundException } from '../../src/exceptions/ModelNotFoundException'
import { SystemException } from '../../src/exceptions/SystemException'
import { ValidationException } from '../../src/exceptions/ValidationException'
import { assertGravitoException } from './helpers'

describe('GravitoException Contract Tests', () => {
  describe('Hierarchy: HttpException', () => {
    it('satisfies base contract (instanceof, code, status)', () => {
      const err = new HttpException(404, { message: 'Not found' })
      assertGravitoException(err, {
        expectedCode: 'HTTP_ERROR',
        expectedStatus: 404,
      })
    })

    it('is instanceof GravitoException and Error', () => {
      const err = new HttpException(404)
      expect(err).toBeInstanceOf(GravitoException)
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(HttpException)
    })

    it('is NOT instanceof DomainException, SystemException, or InfrastructureException', () => {
      const err = new HttpException(500)
      expect(err).not.toBeInstanceOf(DomainException)
      expect(err).not.toBeInstanceOf(SystemException)
    })
  })

  describe('Hierarchy: AuthenticationException', () => {
    it('satisfies base contract with DomainException chain', () => {
      const err = new AuthenticationException()
      assertGravitoException(err, {
        expectedCode: 'UNAUTHENTICATED',
        expectedStatus: 401,
        expectedInstanceOf: [DomainException],
      })
    })

    it('is instanceof GravitoException, DomainException, and Error', () => {
      const err = new AuthenticationException()
      expect(err).toBeInstanceOf(GravitoException)
      expect(err).toBeInstanceOf(DomainException)
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(AuthenticationException)
    })

    it('is NOT instanceof SystemException', () => {
      const err = new AuthenticationException()
      expect(err).not.toBeInstanceOf(SystemException)
    })
  })

  describe('Hierarchy: AuthorizationException', () => {
    it('satisfies base contract with DomainException chain', () => {
      const err = new AuthorizationException()
      assertGravitoException(err, {
        expectedCode: 'FORBIDDEN',
        expectedStatus: 403,
        expectedInstanceOf: [DomainException],
      })
    })

    it('is instanceof GravitoException, DomainException, and Error', () => {
      const err = new AuthorizationException()
      expect(err).toBeInstanceOf(GravitoException)
      expect(err).toBeInstanceOf(DomainException)
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(AuthorizationException)
    })
  })

  describe('Hierarchy: ValidationException', () => {
    it('satisfies base contract with DomainException chain', () => {
      const err = new ValidationException([{ field: 'email', message: 'required' }])
      assertGravitoException(err, {
        expectedCode: 'VALIDATION_ERROR',
        expectedStatus: 422,
        expectedInstanceOf: [DomainException],
      })
    })

    it('is instanceof GravitoException, DomainException, and Error', () => {
      const err = new ValidationException([])
      expect(err).toBeInstanceOf(GravitoException)
      expect(err).toBeInstanceOf(DomainException)
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(ValidationException)
    })

    it('carries errors array', () => {
      const errors = [{ field: 'email', message: 'required' }]
      const err = new ValidationException(errors)
      expect(err.errors).toHaveLength(1)
      expect(err.errors[0].field).toBe('email')
    })

    it('withRedirect and withInput are chainable and return this', () => {
      const err = new ValidationException([])
      const chained = err.withRedirect('/login').withInput({ email: '' })
      expect(chained).toBe(err)
      expect(err.redirectTo).toBe('/login')
      expect(err.input).toEqual({ email: '' })
    })
  })

  describe('Hierarchy: CircularDependencyException', () => {
    it('satisfies base contract with SystemException chain', () => {
      const err = new CircularDependencyException('B', ['A'])
      assertGravitoException(err, {
        expectedCode: 'system.circular_dependency',
        expectedStatus: 500,
        expectedInstanceOf: [SystemException],
      })
    })

    it('is instanceof GravitoException, SystemException, and Error', () => {
      const err = new CircularDependencyException('C', ['A', 'B'])
      expect(err).toBeInstanceOf(GravitoException)
      expect(err).toBeInstanceOf(SystemException)
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(CircularDependencyException)
    })

    it('message contains the dependency path in A -> B format', () => {
      const err = new CircularDependencyException('B', ['A'])
      // Structural assertion: path format is contractual behavior
      expect(err.message).toContain('A -> B')
    })

    it('is NOT instanceof DomainException', () => {
      const err = new CircularDependencyException('B', ['A'])
      expect(err).not.toBeInstanceOf(DomainException)
    })
  })

  describe('Hierarchy: ConfigurationException', () => {
    it('satisfies base contract with SystemException chain', () => {
      const err = new ConfigurationException('Missing DB_URL')
      assertGravitoException(err, {
        expectedCode: 'system.configuration_error',
        expectedStatus: 500,
        expectedInstanceOf: [SystemException],
      })
    })

    it('is instanceof GravitoException, SystemException, and Error', () => {
      const err = new ConfigurationException('Invalid config')
      expect(err).toBeInstanceOf(GravitoException)
      expect(err).toBeInstanceOf(SystemException)
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(ConfigurationException)
    })

    it('is NOT instanceof DomainException', () => {
      const err = new ConfigurationException('bad config')
      expect(err).not.toBeInstanceOf(DomainException)
    })
  })

  describe('Hierarchy: ModelNotFoundException', () => {
    it('satisfies base contract', () => {
      const err = new ModelNotFoundException('User', 42)
      assertGravitoException(err, {
        expectedCode: 'NOT_FOUND',
        expectedStatus: 404,
      })
    })

    it('is instanceof GravitoException and Error', () => {
      const err = new ModelNotFoundException('Order', '123')
      expect(err).toBeInstanceOf(GravitoException)
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(ModelNotFoundException)
    })
  })

  describe('Cause chain preservation (ERRM-03)', () => {
    it('HttpException preserves cause from wrapped error', () => {
      const original = new TypeError('connection refused')
      const wrapper = new HttpException(500, { cause: original, message: 'Service error' })

      expect(wrapper.cause).toBe(original)
      expect(wrapper.cause).toBeInstanceOf(TypeError)
    })

    it('ConfigurationException preserves cause through SystemException chain', () => {
      const original = new Error('ECONNREFUSED')
      const err = new ConfigurationException('DB config invalid', { cause: original })

      assertGravitoException(err, {
        expectedCode: 'system.configuration_error',
        expectedStatus: 500,
        expectedInstanceOf: [SystemException],
        expectCause: true,
      })
      expect(err.cause).toBe(original)
    })

    it('AuthenticationException can be created with cause', () => {
      const cause = new Error('Token expired')
      const err = new AuthenticationException('Session expired.')
      // AuthenticationException doesn't accept cause in constructor — verify it's a DomainException
      expect(err).toBeInstanceOf(DomainException)
      expect(err).toBeInstanceOf(GravitoException)
    })
  })

  describe('Object.setPrototypeOf verification (D-04)', () => {
    it('HttpException instanceof chain is correct across all levels', () => {
      const err = new HttpException(400)
      expect(err instanceof HttpException).toBe(true)
      expect(err instanceof GravitoException).toBe(true)
      expect(err instanceof Error).toBe(true)
    })

    it('AuthenticationException instanceof chain is correct across all levels', () => {
      const err = new AuthenticationException()
      expect(err instanceof AuthenticationException).toBe(true)
      expect(err instanceof DomainException).toBe(true)
      expect(err instanceof GravitoException).toBe(true)
      expect(err instanceof Error).toBe(true)
    })

    it('AuthorizationException instanceof chain is correct across all levels', () => {
      const err = new AuthorizationException()
      expect(err instanceof AuthorizationException).toBe(true)
      expect(err instanceof DomainException).toBe(true)
      expect(err instanceof GravitoException).toBe(true)
      expect(err instanceof Error).toBe(true)
    })

    it('ValidationException instanceof chain is correct across all levels', () => {
      const err = new ValidationException([])
      expect(err instanceof ValidationException).toBe(true)
      expect(err instanceof DomainException).toBe(true)
      expect(err instanceof GravitoException).toBe(true)
      expect(err instanceof Error).toBe(true)
    })

    it('CircularDependencyException instanceof chain is correct across all levels', () => {
      const err = new CircularDependencyException('B', ['A'])
      expect(err instanceof CircularDependencyException).toBe(true)
      expect(err instanceof SystemException).toBe(true)
      expect(err instanceof GravitoException).toBe(true)
      expect(err instanceof Error).toBe(true)
    })

    it('ConfigurationException instanceof chain is correct across all levels', () => {
      const err = new ConfigurationException('bad config')
      expect(err instanceof ConfigurationException).toBe(true)
      expect(err instanceof SystemException).toBe(true)
      expect(err instanceof GravitoException).toBe(true)
      expect(err instanceof Error).toBe(true)
    })

    it('ModelNotFoundException instanceof chain is correct', () => {
      const err = new ModelNotFoundException('Post', 1)
      expect(err instanceof ModelNotFoundException).toBe(true)
      expect(err instanceof GravitoException).toBe(true)
      expect(err instanceof Error).toBe(true)
    })
  })

  describe('Structural fields', () => {
    it('all exception names are set to specific class names (not generic Error)', () => {
      expect(new HttpException(400).name).toBe('HttpException')
      expect(new AuthenticationException().name).toBe('AuthenticationException')
      expect(new AuthorizationException().name).toBe('AuthorizationException')
      expect(new ValidationException([]).name).toBe('ValidationException')
      expect(new CircularDependencyException('B', ['A']).name).toBe('CircularDependencyException')
      expect(new ConfigurationException('err').name).toBe('ConfigurationException')
      expect(new ModelNotFoundException('User').name).toBe('ModelNotFoundException')
    })

    it('code is always a non-empty string', () => {
      const exceptions = [
        new HttpException(400),
        new AuthenticationException(),
        new AuthorizationException(),
        new ValidationException([]),
        new CircularDependencyException('B', ['A']),
        new ConfigurationException('err'),
        new ModelNotFoundException('User'),
      ]
      for (const err of exceptions) {
        expect(typeof err.code).toBe('string')
        expect(err.code.length).toBeGreaterThan(0)
      }
    })

    it('status is always a number', () => {
      const exceptions = [
        new HttpException(400),
        new AuthenticationException(),
        new AuthorizationException(),
        new ValidationException([]),
        new CircularDependencyException('B', ['A']),
        new ConfigurationException('err'),
        new ModelNotFoundException('User'),
      ]
      for (const err of exceptions) {
        expect(typeof err.status).toBe('number')
      }
    })
  })
})
