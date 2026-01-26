import { describe, expect, test } from 'bun:test'
import { BeamError, BeamHttpError, BeamNetworkError, BeamTimeoutError } from '../src/errors'

describe('BeamError', () => {
  test('should create error with message', () => {
    const error = new BeamError('Test error')
    expect(error.message).toBe('Test error')
    expect(error).toBeInstanceOf(Error)
  })

  test('should include status code', () => {
    const error = new BeamError('Not found', 404)
    expect(error.status).toBe(404)
  })

  test('should include error code', () => {
    const error = new BeamError('Custom error', undefined, 'CUSTOM_CODE')
    expect(error.code).toBe('CUSTOM_CODE')
  })

  test('should capture cause', () => {
    const originalError = new Error('Original')
    const error = new BeamError('Wrapped', undefined, undefined, originalError)
    expect(error.cause).toBe(originalError)
  })

  test('should have correct name property', () => {
    const error = new BeamError('Test')
    expect(error.name).toBe('BeamError')
  })
})

describe('BeamNetworkError', () => {
  test('should have NETWORK_ERROR code', () => {
    const error = new BeamNetworkError('Connection failed')
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.name).toBe('BeamNetworkError')
  })

  test('should capture original error as cause', () => {
    const originalError = new Error('DNS lookup failed')
    const error = new BeamNetworkError('Network error', originalError)
    expect(error.cause).toBe(originalError)
  })

  test('should be instance of BeamError', () => {
    const error = new BeamNetworkError('Test')
    expect(error).toBeInstanceOf(BeamError)
    expect(error).toBeInstanceOf(Error)
  })
})

describe('BeamTimeoutError', () => {
  test('should have TIMEOUT code', () => {
    const error = new BeamTimeoutError(5000)
    expect(error.code).toBe('TIMEOUT')
    expect(error.name).toBe('BeamTimeoutError')
  })

  test('should include timeout duration in message', () => {
    const error = new BeamTimeoutError(3000)
    expect(error.message).toContain('3000')
    expect(error.message).toContain('ms')
  })

  test('should be instance of BeamError', () => {
    const error = new BeamTimeoutError(1000)
    expect(error).toBeInstanceOf(BeamError)
    expect(error).toBeInstanceOf(Error)
  })
})

describe('BeamHttpError', () => {
  test('should include HTTP status', () => {
    const error = new BeamHttpError('Not found', 404)
    expect(error.status).toBe(404)
    expect(error.code).toBe('HTTP_404')
  })

  test('should include response body when available', () => {
    const responseBody = { error: 'Resource not found' }
    const error = new BeamHttpError('Not found', 404, responseBody)
    expect(error.response).toEqual(responseBody)
  })

  test('should work without response body', () => {
    const error = new BeamHttpError('Server error', 500)
    expect(error.status).toBe(500)
    expect(error.response).toBeUndefined()
  })

  test('should be instance of BeamError', () => {
    const error = new BeamHttpError('Test', 400)
    expect(error).toBeInstanceOf(BeamError)
    expect(error).toBeInstanceOf(Error)
  })

  test('should have correct name property', () => {
    const error = new BeamHttpError('Test', 500)
    expect(error.name).toBe('BeamHttpError')
  })
})
