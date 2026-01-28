import { describe, expect, it } from 'bun:test'
import { LimitClause } from '../src/query/clauses/LimitClause'

describe('LimitClause', () => {
  it('should be empty by default', () => {
    const clause = new LimitClause()
    expect(clause.getLimit()).toBeUndefined()
    expect(clause.getOffset()).toBeUndefined()
    expect(clause.hasLimit()).toBe(false)
    expect(clause.hasOffset()).toBe(false)
    expect(clause.toSQL()).toBe('')
  })

  it('should set limit', () => {
    const clause = new LimitClause()
    clause.setLimit(10)
    expect(clause.getLimit()).toBe(10)
    expect(clause.hasLimit()).toBe(true)
    expect(clause.toSQL()).toBe('LIMIT 10')
  })

  it('should set offset', () => {
    const clause = new LimitClause()
    clause.setOffset(20)
    expect(clause.getOffset()).toBe(20)
    expect(clause.hasOffset()).toBe(true)
    expect(clause.toSQL()).toBe('OFFSET 20')
  })

  it('should set both limit and offset', () => {
    const clause = new LimitClause()
    clause.setLimit(10)
    clause.setOffset(20)
    expect(clause.toSQL()).toBe('LIMIT 10 OFFSET 20')
  })

  it('should handle take and skip aliases', () => {
    const clause = new LimitClause()
    clause.take(5)
    clause.skip(15)
    expect(clause.getLimit()).toBe(5)
    expect(clause.getOffset()).toBe(15)
  })

  it('should reset state', () => {
    const clause = new LimitClause()
    clause.setLimit(10)
    clause.reset()
    expect(clause.hasLimit()).toBe(false)
    expect(clause.toSQL()).toBe('')
  })

  it('should clone correctly', () => {
    const clause = new LimitClause()
    clause.setLimit(10)
    const cloned = clause.clone()
    cloned.setLimit(20)
    expect(clause.getLimit()).toBe(10)
    expect(cloned.getLimit()).toBe(20)
  })
})
