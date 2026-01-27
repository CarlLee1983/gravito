import { describe, expect, it } from 'bun:test'
import {
  BigIntScalar,
  DateTimeScalar,
  JSONScalar,
  SCALAR_RESOLVERS,
  SCALAR_TYPE_DEFS,
} from '../../src/scalars/index'

describe('Scalars Module', () => {
  describe('exports', () => {
    it('should export JSONScalar', () => {
      expect(JSONScalar).toBeDefined()
      expect(JSONScalar.name).toBe('JSON')
    })

    it('should export DateTimeScalar', () => {
      expect(DateTimeScalar).toBeDefined()
      expect(DateTimeScalar.name).toBe('DateTime')
    })

    it('should export BigIntScalar', () => {
      expect(BigIntScalar).toBeDefined()
      expect(BigIntScalar.name).toBe('BigInt')
    })
  })

  describe('SCALAR_TYPE_DEFS', () => {
    it('should be a string', () => {
      expect(typeof SCALAR_TYPE_DEFS).toBe('string')
    })

    it('should contain JSON scalar definition', () => {
      expect(SCALAR_TYPE_DEFS).toContain('scalar JSON')
    })

    it('should contain DateTime scalar definition', () => {
      expect(SCALAR_TYPE_DEFS).toContain('scalar DateTime')
    })

    it('should contain BigInt scalar definition', () => {
      expect(SCALAR_TYPE_DEFS).toContain('scalar BigInt')
    })
  })

  describe('SCALAR_RESOLVERS', () => {
    it('should be an object', () => {
      expect(typeof SCALAR_RESOLVERS).toBe('object')
    })

    it('should have JSON resolver', () => {
      expect(SCALAR_RESOLVERS.JSON).toBe(JSONScalar)
    })

    it('should have DateTime resolver', () => {
      expect(SCALAR_RESOLVERS.DateTime).toBe(DateTimeScalar)
    })

    it('should have BigInt resolver', () => {
      expect(SCALAR_RESOLVERS.BigInt).toBe(BigIntScalar)
    })

    it('should have exactly 6 resolvers', () => {
      expect(Object.keys(SCALAR_RESOLVERS)).toHaveLength(6)
    })
  })
})
