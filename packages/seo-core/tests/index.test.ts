import { describe, expect, it } from 'bun:test'
import * as seo from '../src/index'

describe('@gravito/seo-core', () => {
  it('exports public API', () => {
    expect(seo).toBeDefined()
    expect(typeof seo).toBe('object')
  })
})
