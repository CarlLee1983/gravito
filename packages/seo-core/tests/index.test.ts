import { describe, expect, it } from 'bun:test'
import * as seo from '../src/index'

describe('@gravito/seo-core', () => {
  it('exports public API', () => {
    expect(seo).toBeDefined()
    expect(typeof seo).toBe('object')
  })

  describe('Core Engine Exports', () => {
    it('exports SeoEngine', () => {
      expect(seo.SeoEngine).toBeDefined()
      expect(typeof seo.SeoEngine).toBe('function')
    })

    it('exports ConfigLoader', () => {
      expect(seo.ConfigLoader).toBeDefined()
    })
  })

  describe('Strategy Exports', () => {
    it('exports DynamicStrategy', () => {
      expect(seo.DynamicStrategy).toBeDefined()
      expect(typeof seo.DynamicStrategy).toBe('function')
    })

    it('exports CachedStrategy', () => {
      expect(seo.CachedStrategy).toBeDefined()
      expect(typeof seo.CachedStrategy).toBe('function')
    })

    it('exports IncrementalStrategy', () => {
      expect(seo.IncrementalStrategy).toBeDefined()
      expect(typeof seo.IncrementalStrategy).toBe('function')
    })
  })

  describe('Storage Exports', () => {
    it('exports JsonlLogger', () => {
      expect(seo.JsonlLogger).toBeDefined()
      expect(typeof seo.JsonlLogger).toBe('function')
    })

    it('exports Compactor', () => {
      expect(seo.Compactor).toBeDefined()
      expect(typeof seo.Compactor).toBe('function')
    })

    it('exports MemoryCache', () => {
      expect(seo.MemoryCache).toBeDefined()
      expect(typeof seo.MemoryCache).toBe('function')
    })
  })

  describe('XML Builder Exports', () => {
    it('exports XmlStreamBuilder', () => {
      expect(seo.XmlStreamBuilder).toBeDefined()
      expect(typeof seo.XmlStreamBuilder).toBe('function')
    })

    it('exports GRAVITO_WATERMARK', () => {
      expect(seo.GRAVITO_WATERMARK).toBeDefined()
      expect(typeof seo.GRAVITO_WATERMARK).toBe('string')
    })
  })

  describe('Robots Exports', () => {
    it('exports RobotsBuilder', () => {
      expect(seo.RobotsBuilder).toBeDefined()
      expect(typeof seo.RobotsBuilder).toBe('function')
    })
  })
})
