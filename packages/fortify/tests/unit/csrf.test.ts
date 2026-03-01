import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'

let getCsrfTokenCalls: Array<{ context: any; options: any }> = []

mock.module('@gravito/photon', () => ({
  getCsrfToken: (c: any, options: any) => {
    getCsrfTokenCalls.push({ context: c, options })
    return 'mock-csrf-token'
  },
}))

let resolveCsrfOptions: typeof import('../../src/csrf').resolveCsrfOptions
let ensureCsrfToken: typeof import('../../src/csrf').ensureCsrfToken

beforeEach(async () => {
  getCsrfTokenCalls = []
  ;({ resolveCsrfOptions, ensureCsrfToken } = await import('../../src/csrf'))
})

describe('csrf.ts', () => {
  describe('resolveCsrfOptions', () => {
    it('should return null when csrf is disabled (false)', () => {
      const config = { csrf: false } as any
      const result = resolveCsrfOptions(config)
      expect(result).toBeNull()
    })

    it('should return empty object when csrf is enabled (true)', () => {
      const config = { csrf: true } as any
      const result = resolveCsrfOptions(config)
      expect(result).toEqual({})
    })

    it('should return custom csrf options when object is provided', () => {
      const customOptions = {
        cookieName: 'custom-csrf',
        headerName: 'X-Custom-CSRF',
      }
      const config = { csrf: customOptions } as any
      const result = resolveCsrfOptions(config)
      expect(result).toEqual(customOptions)
    })

    it('should return empty object when csrf is undefined (default enabled)', () => {
      const config = {} as any
      const result = resolveCsrfOptions(config)
      expect(result).toEqual({})
    })
  })

  describe('ensureCsrfToken', () => {
    it('should return null when csrf is disabled', () => {
      const nativeContext = { mockData: 'test' }
      const context = { native: nativeContext } as GravitoContext
      const config = { csrf: false } as any

      const result = ensureCsrfToken(context, config)

      expect(result).toBeNull()
      expect(getCsrfTokenCalls.length).toBe(0)
    })

    it('should call getCsrfToken with empty options when csrf is true', () => {
      const nativeContext = { mockData: 'test' }
      const context = { native: nativeContext } as GravitoContext
      const config = { csrf: true } as any

      const result = ensureCsrfToken(context, config)

      expect(result).toBe('mock-csrf-token')
      expect(getCsrfTokenCalls.length).toBe(1)
      expect(getCsrfTokenCalls[0].context).toBe(nativeContext)
      expect(getCsrfTokenCalls[0].options).toEqual({})
    })

    it('should call getCsrfToken with custom options when object is provided', () => {
      const nativeContext = { mockData: 'test' }
      const context = { native: nativeContext } as GravitoContext
      const customOptions = {
        cookieName: 'custom-csrf',
        headerName: 'X-Custom-CSRF',
      }
      const config = { csrf: customOptions } as any

      const result = ensureCsrfToken(context, config)

      expect(result).toBe('mock-csrf-token')
      expect(getCsrfTokenCalls.length).toBe(1)
      expect(getCsrfTokenCalls[0].context).toBe(nativeContext)
      expect(getCsrfTokenCalls[0].options).toEqual(customOptions)
    })

    it('should handle undefined csrf config (default to enabled)', () => {
      const nativeContext = { mockData: 'test' }
      const context = { native: nativeContext } as GravitoContext
      const config = {} as any

      const result = ensureCsrfToken(context, config)

      expect(result).toBe('mock-csrf-token')
      expect(getCsrfTokenCalls.length).toBe(1)
      expect(getCsrfTokenCalls[0].options).toEqual({})
    })

    it('should preserve context reference when calling getCsrfToken', () => {
      const nativeContext = { mockData: 'test' }
      const context = { native: nativeContext } as any
      const config = { csrf: true } as any

      ensureCsrfToken(context, config)

      expect(getCsrfTokenCalls[0].context).toBe(nativeContext)
      expect(getCsrfTokenCalls[0].context.mockData).toBe('test')
    })
  })
})
