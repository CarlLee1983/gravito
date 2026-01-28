import { describe, expect, it } from 'bun:test'
import { WhereClause } from '../src/query/clauses/WhereClause'

describe('WhereClause', () => {
  it('should add basic where', () => {
    const clause = new WhereClause()
    clause.add('id', '=', 1)
    expect(clause.getWheres()).toHaveLength(1)
    expect(clause.getWheres()[0]).toEqual({
      type: 'basic',
      column: 'id',
      operator: '=',
      value: 1,
      boolean: 'and',
    })
    expect(clause.toSQL()).toBe('WHERE "id" = ?')
    expect(clause.getValues()).toEqual([1])
  })

  it('should add multiple wheres with OR', () => {
    const clause = new WhereClause()
    clause.add('id', '=', 1)
    clause.add('status', '=', 'active', 'or')
    expect(clause.toSQL()).toBe('WHERE "id" = ? OR "status" = ?')
    expect(clause.getValues()).toEqual([1, 'active'])
  })

  it('should handle nested wheres', () => {
    const clause = new WhereClause()
    clause.add('active', '=', true)
    clause.addNested(
      [
        { type: 'basic', column: 'age', operator: '>', value: 18, boolean: 'and' },
        { type: 'basic', column: 'role', operator: '=', value: 'admin', boolean: 'or' },
      ],
      'and'
    )
    expect(clause.toSQL()).toBe('WHERE "active" = ? AND ("age" > ? OR "role" = ?)')
    expect(clause.getValues()).toEqual([true, 18, 'admin'])
  })

  it('should handle whereIn', () => {
    const clause = new WhereClause()
    clause.addIn('id', [1, 2, 3])
    expect(clause.toSQL()).toBe('WHERE "id" IN (?, ?, ?)')
    expect(clause.getValues()).toEqual([1, 2, 3])
  })

  it('should handle whereNotIn', () => {
    const clause = new WhereClause()
    clause.addIn('id', [1, 2], 'and', true)
    expect(clause.toSQL()).toBe('WHERE "id" NOT IN (?, ?)')
  })

  it('should handle whereNull', () => {
    const clause = new WhereClause()
    clause.addNull('deleted_at')
    expect(clause.toSQL()).toBe('WHERE "deleted_at" IS NULL')
    expect(clause.getValues()).toEqual([])
  })

  it('should handle whereNotNull', () => {
    const clause = new WhereClause()
    clause.addNotNull('email')
    expect(clause.toSQL()).toBe('WHERE "email" IS NOT NULL')
  })

  it('should handle whereBetween', () => {
    const clause = new WhereClause()
    clause.addBetween('age', [18, 30])
    expect(clause.toSQL()).toBe('WHERE "age" BETWEEN ? AND ?')
    expect(clause.getValues()).toEqual([18, 30])
  })

  it('should handle raw wheres', () => {
    const clause = new WhereClause()
    clause.addRaw('ST_Distance(location, ?) < ?', ['POINT(0 0)', 100])
    expect(clause.toSQL()).toBe('WHERE ST_Distance(location, ?) < ?')
    expect(clause.getValues()).toEqual(['POINT(0 0)', 100])
  })

  it('should handle column comparisons', () => {
    const clause = new WhereClause()
    clause.addColumn('updated_at', '>', 'created_at')
    expect(clause.toSQL()).toBe('WHERE "updated_at" > "created_at"')
  })

  it('should reset state', () => {
    const clause = new WhereClause()
    clause.add('id', '=', 1)
    clause.reset()
    expect(clause.hasConditions()).toBe(false)
    expect(clause.toSQL()).toBe('')
  })

  it('should clone correctly', () => {
    const clause = new WhereClause()
    clause.add('id', '=', 1)
    const cloned = clause.clone()
    cloned.add('status', '=', 'active')
    expect(clause.getWheres()).toHaveLength(1)
    expect(cloned.getWheres()).toHaveLength(2)
  })
})
