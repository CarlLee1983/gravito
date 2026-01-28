import { describe, expect, it } from 'bun:test'
import { GroupByClause } from '../src/query/clauses/GroupByClause'

describe('GroupByClause', () => {
  it('should be empty by default', () => {
    const clause = new GroupByClause()
    expect(clause.getGroups()).toEqual([])
    expect(clause.hasGroups()).toBe(false)
    expect(clause.toSQL()).toBe('')
  })

  it('should add group columns', () => {
    const clause = new GroupByClause()
    clause.groupBy('category', 'status')
    expect(clause.getGroups()).toEqual(['category', 'status'])
    expect(clause.hasGroups()).toBe(true)
    expect(clause.toSQL()).toBe('GROUP BY "category", "status"')
  })

  it('should handle raw expressions', () => {
    const clause = new GroupByClause()
    clause.groupBy('DATE(created_at)')
    expect(clause.toSQL()).toBe('GROUP BY DATE(created_at)')
  })

  it('should reset state', () => {
    const clause = new GroupByClause()
    clause.groupBy('id')
    clause.reset()
    expect(clause.hasGroups()).toBe(false)
    expect(clause.toSQL()).toBe('')
  })
})
