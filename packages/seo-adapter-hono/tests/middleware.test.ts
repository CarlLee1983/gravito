import { describe, expect, it } from 'bun:test'
import type { SeoConfig } from '@gravito/seo-core'
import { gravitoSeo } from '../src/middleware'

describe('gravitoSeo middleware', () => {
  it('should export gravitoSeo function', () => {
    expect(typeof gravitoSeo).toBe('function')
  })

  it('should return a middleware handler', () => {
    const config: SeoConfig = {
      baseUrl: 'https://example.com',
      mode: 'dynamic',
      resolvers: [],
    }
    const middleware = gravitoSeo(config)
    expect(typeof middleware).toBe('function')
  })
})
