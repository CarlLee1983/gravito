import { describe, expect, it } from 'bun:test'
import { SelectClause } from '../src/query/clauses/SelectClause'

describe('SelectClause', () => {
  it('should default to *', () => {
    const clause = new SelectClause()
    expect(clause.getColumns()).toEqual(['*'])
    expect(clause.toSQL()).toBe('SELECT *')
  })

  it('should set columns', () => {
    const clause = new SelectClause()
    clause.setColumns('id', 'name')
    expect(clause.getColumns()).toEqual(['id', 'name'])
    expect(clause.toSQL()).toBe('SELECT "id", "name"')
  })

  it('should handle distinct', () => {
    const clause = new SelectClause()
    clause.setDistinct()
    expect(clause.isDistinct()).toBe(true)
    expect(clause.toSQL()).toBe('SELECT DISTINCT *')
  })

  it('should handle raw expressions', () => {
    const clause = new SelectClause()
    clause.addRaw('COUNT(*) as total', [1])
    expect(clause.getColumns()).toContain('COUNT(*) as total')
    expect(clause.getBindings()).toEqual([1])
    expect(clause.toSQL()).toBe('SELECT *, COUNT(*) as total')
  })

  it('should escape columns correctly', () => {
    const clause = new SelectClause()
    clause.setColumns('id', 'first_name', 'COUNT(*)')
    // Simple columns quoted, expressions with ( or as should not be quoted automatically by simple logic
    expect(clause.toSQL()).toBe('SELECT "id", "first_name", COUNT(*)')
  })

  it('should reset state', () => {
    const clause = new SelectClause()
    clause.setColumns('id')
    clause.setDistinct()
    clause.reset()
    expect(clause.getColumns()).toEqual(['*'])
    expect(clause.isDistinct()).toBe(false)
  })

  it('should clone correctly', () => {
    const clause = new SelectClause()
    clause.setColumns('id')
    const cloned = clause.clone()
    cloned.setColumns('name')
    expect(clause.getColumns()).toEqual(['id'])
    expect(cloned.getColumns()).toEqual(['name'])
  })
})
