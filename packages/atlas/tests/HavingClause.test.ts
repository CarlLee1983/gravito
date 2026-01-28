import { describe, expect, it } from 'bun:test'
import { HavingClause } from '../src/query/clauses/HavingClause'
import { Expression } from '../src/query/Expression'

describe('HavingClause', () => {
  it('should be empty by default', () => {
    const clause = new HavingClause()
    expect(clause.getHavings()).toEqual([])
    expect(clause.hasHavings()).toBe(false)
    expect(clause.toSQL()).toBe('')
  })

  it('should add basic having', () => {
    const clause = new HavingClause()
    clause.having('count(*)', '>', 10)
    expect(clause.getHavings()).toHaveLength(1)
    expect(clause.toSQL()).toBe('HAVING count(*) > ?')
    expect(clause.getBindings()).toEqual([10])
  })

  it('should add multiple havings', () => {
    const clause = new HavingClause()
    clause.having('sum(amount)', '>', 100)
    clause.having('avg(price)', '<', 50)
    expect(clause.toSQL()).toBe('HAVING sum(amount) > ? AND avg(price) < ?')
  })

  it('should handle raw expressions', () => {
    const clause = new HavingClause()
    clause.havingRaw('count(*) > ?', [5])
    expect(clause.toSQL()).toBe('HAVING count(*) > ?')
    expect(clause.getBindings()).toEqual([5])
  })

  it('should handle Expression in havingRaw', () => {
    const clause = new HavingClause()
    const expr = new Expression('sum(total) > ?', [1000])
    clause.havingRaw(expr)
    expect(clause.toSQL()).toBe('HAVING sum(total) > ?')
    expect(clause.getBindings()).toEqual([1000])
  })

  it('should reset state', () => {
    const clause = new HavingClause()
    clause.having('id', '>', 0)
    clause.reset()
    expect(clause.hasHavings()).toBe(false)
    expect(clause.getBindings()).toEqual([])
  })

  it('should clone correctly', () => {
    const clause = new HavingClause()
    clause.having('id', '>', 0)
    const cloned = clause.clone()
    cloned.having('name', '=', 'test')
    expect(clause.getHavings()).toHaveLength(1)
    expect(cloned.getHavings()).toHaveLength(2)
  })
})
