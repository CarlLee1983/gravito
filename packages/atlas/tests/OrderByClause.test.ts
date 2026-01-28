import { describe, expect, it } from 'bun:test'
import { OrderByClause } from '../src/query/clauses/OrderByClause'
import { Expression } from '../src/query/Expression'

describe('OrderByClause', () => {
  it('should be empty by default', () => {
    const clause = new OrderByClause()
    expect(clause.getOrders()).toEqual([])
    expect(clause.hasOrders()).toBe(false)
    expect(clause.toSQL()).toBe('')
  })

  it('should add order by column', () => {
    const clause = new OrderByClause()
    clause.orderBy('created_at', 'desc')
    expect(clause.getOrders()).toEqual([{ column: 'created_at', direction: 'desc' }])
    expect(clause.toSQL()).toBe('ORDER BY "created_at" DESC')
  })

  it('should handle multiple order by columns', () => {
    const clause = new OrderByClause()
    clause.orderBy('priority', 'desc')
    clause.orderBy('name', 'asc')
    expect(clause.toSQL()).toBe('ORDER BY "priority" DESC, "name" ASC')
  })

  it('should handle raw order by', () => {
    const clause = new OrderByClause()
    clause.orderByRaw('FIELD(status, "active", "pending", "closed")')
    expect(clause.toSQL()).toBe('ORDER BY FIELD(status, "active", "pending", "closed") ASC')
  })

  it('should handle Expression in orderByRaw', () => {
    const clause = new OrderByClause()
    const expr = new Expression('RAND(?)', [123])
    clause.orderByRaw(expr)
    expect(clause.toSQL()).toBe('ORDER BY RAND(?) ASC')
    expect(clause.getBindings()).toEqual([123])
  })

  it('should reset state', () => {
    const clause = new OrderByClause()
    clause.orderBy('id')
    clause.reset()
    expect(clause.hasOrders()).toBe(false)
    expect(clause.getBindings()).toEqual([])
  })

  it('should clone correctly', () => {
    const clause = new OrderByClause()
    clause.orderBy('id')
    const cloned = clause.clone()
    cloned.orderBy('name')
    expect(clause.getOrders()).toHaveLength(1)
    expect(cloned.getOrders()).toHaveLength(2)
  })
})
