import { describe, expect, it } from 'bun:test'
import { HttpException } from '../src/exceptions/HttpException'
import { ValidationException } from '../src/exceptions/ValidationException'

// HttpException 是 GravitoException 的具體子類別，用來測試基底類別的行為
// HttpException constructor: (status, options?) - 只有兩個參數

describe('GravitoException (via HttpException)', () => {
  describe('constructor', () => {
    it('should set status and default code HTTP_ERROR', () => {
      const err = new HttpException(500)
      expect(err.status).toBe(500)
      expect(err.code).toBe('HTTP_ERROR')
    })

    it('should set message from options', () => {
      const err = new HttpException(400, {
        message: 'Invalid input',
      })
      expect(err.message).toBe('Invalid input')
    })

    it('should set cause from options', () => {
      const cause = new Error('original')
      const err = new HttpException(500, { cause })
      expect(err.cause).toBe(cause)
    })

    it('should set i18nKey from options', () => {
      const err = new HttpException(404, {
        i18nKey: 'errors.not_found',
      })
      expect(err.i18nKey).toBe('errors.not_found')
    })

    it('should set i18nParams from options', () => {
      const err = new HttpException(404, {
        i18nKey: 'errors.not_found',
        i18nParams: { resource: 'User', id: 42 },
      })
      expect(err.i18nParams).toEqual({ resource: 'User', id: 42 })
    })

    it('should not set i18nKey when not provided', () => {
      const err = new HttpException(500)
      expect(err.i18nKey).toBeUndefined()
    })

    it('should not set i18nParams when not provided', () => {
      const err = new HttpException(500)
      expect(err.i18nParams).toBeUndefined()
    })

    it('should set name to HttpException', () => {
      const err = new HttpException(500)
      expect(err.name).toBe('HttpException')
    })
  })

  describe('getLocalizedMessage', () => {
    it('should use i18n translator when i18nKey is set', () => {
      const err = new HttpException(404, {
        i18nKey: 'errors.not_found',
        i18nParams: { resource: 'User' },
      })

      const t = (key: string, params?: Record<string, string | number>) =>
        `Translated: ${key} [${JSON.stringify(params)}]`

      const message = err.getLocalizedMessage(t)
      expect(message).toContain('errors.not_found')
      expect(message).toContain('User')
    })

    it('should fallback to message when no i18nKey', () => {
      const err = new HttpException(500, {
        message: 'Something went wrong',
      })

      const t = (key: string) => `Translated: ${key}`

      const message = err.getLocalizedMessage(t)
      expect(message).toBe('Something went wrong')
    })

    it('should return empty string when no i18nKey and no message', () => {
      const err = new HttpException(500)

      const t = (key: string) => `Translated: ${key}`

      // message 為 undefined 時，Error 會將 .message 設為 ''
      const message = err.getLocalizedMessage(t)
      expect(message).toBe('')
    })
  })
})

describe('ValidationException', () => {
  describe('constructor', () => {
    it('should set validation errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'name', message: 'Name is required' },
      ]
      const err = new ValidationException(errors)

      expect(err.errors).toEqual(errors)
      expect(err.status).toBe(422)
      expect(err.code).toBe('VALIDATION_ERROR')
      expect(err.message).toBe('Validation failed')
    })

    it('should accept custom message', () => {
      const err = new ValidationException(
        [{ field: 'email', message: 'Invalid' }],
        'Custom validation error'
      )
      expect(err.message).toBe('Custom validation error')
    })

    it('should set i18nKey', () => {
      const err = new ValidationException([])
      expect(err.i18nKey).toBe('errors.validation.failed')
    })
  })

  describe('withRedirect', () => {
    it('should set redirectTo and return this', () => {
      const err = new ValidationException([{ field: 'email', message: 'Invalid' }])
      const result = err.withRedirect('/login')

      expect(result).toBe(err)
      expect(err.redirectTo).toBe('/login')
    })
  })

  describe('withInput', () => {
    it('should set input and return this', () => {
      const input = { email: 'bad@', name: '' }
      const err = new ValidationException([{ field: 'email', message: 'Invalid' }])
      const result = err.withInput(input)

      expect(result).toBe(err)
      expect(err.input).toEqual(input)
    })
  })

  describe('chaining', () => {
    it('should support fluent chaining of withRedirect and withInput', () => {
      const err = new ValidationException([{ field: 'email', message: 'Invalid' }])
        .withRedirect('/form')
        .withInput({ email: 'test' })

      expect(err.redirectTo).toBe('/form')
      expect(err.input).toEqual({ email: 'test' })
    })
  })

  describe('error codes in validation errors', () => {
    it('should preserve error code in validation error', () => {
      const errors = [{ field: 'email', message: 'Invalid format', code: 'INVALID_FORMAT' }]
      const err = new ValidationException(errors)

      expect(err.errors[0].code).toBe('INVALID_FORMAT')
    })
  })

  describe('getLocalizedMessage', () => {
    it('should use i18nKey from ValidationException', () => {
      const err = new ValidationException([{ field: 'email', message: 'Invalid' }])

      const t = (key: string) => `Localized: ${key}`
      const message = err.getLocalizedMessage(t)
      expect(message).toBe('Localized: errors.validation.failed')
    })
  })
})
