import { beforeEach, describe, expect, test } from 'bun:test'
import {
  applyLogicalOperators,
  applyNumberFilter,
  applyStringFilter,
  type LogicalOperators,
  type NumberFilter,
  type StringFilter,
} from '../../src/filters/operators'

describe('進階過濾器 - 字串運算符', () => {
  let mockQuery: unknown

  beforeEach(() => {
    mockQuery = {
      conditions: [] as unknown[],
      where(column: string, operator: string, value: unknown) {
        this.conditions.push({ column, operator, value })
        return this
      },
      whereRaw(sql: string, bindings?: unknown[]) {
        this.conditions.push({ type: 'raw', sql, bindings })
        return this
      },
    }
  })

  test('contains - 包含字串', () => {
    const filter: StringFilter = { contains: 'test' }
    applyStringFilter(mockQuery, 'name', filter)

    expect(mockQuery.conditions).toEqual([{ column: 'name', operator: 'like', value: '%test%' }])
  })

  test('startsWith - 以字串開頭', () => {
    const filter: StringFilter = { startsWith: 'John' }
    applyStringFilter(mockQuery, 'name', filter)

    expect(mockQuery.conditions).toEqual([{ column: 'name', operator: 'like', value: 'John%' }])
  })

  test('endsWith - 以字串結尾', () => {
    const filter: StringFilter = { endsWith: '.com' }
    applyStringFilter(mockQuery, 'email', filter)

    expect(mockQuery.conditions).toEqual([{ column: 'email', operator: 'like', value: '%.com' }])
  })

  test('match - Regex 匹配', () => {
    const filter: StringFilter = { match: '^[A-Z]' }
    applyStringFilter(mockQuery, 'code', filter)

    expect(mockQuery.conditions[0]).toMatchObject({
      type: 'raw',
      sql: expect.stringContaining('REGEXP'),
    })
  })

  test('eq - 等於', () => {
    const filter: StringFilter = { eq: 'exact' }
    applyStringFilter(mockQuery, 'status', filter)

    expect(mockQuery.conditions).toEqual([{ column: 'status', operator: '=', value: 'exact' }])
  })

  test('in - 在列表中', () => {
    const filter: StringFilter = { in: ['active', 'pending'] }
    applyStringFilter(mockQuery, 'status', filter)

    expect(mockQuery.conditions).toEqual([
      { column: 'status', operator: 'in', value: ['active', 'pending'] },
    ])
  })

  test('組合多個條件', () => {
    const filter: StringFilter = {
      contains: 'test',
      startsWith: 'T',
    }
    applyStringFilter(mockQuery, 'name', filter)

    expect(mockQuery.conditions).toHaveLength(2)
    expect(mockQuery.conditions[0]).toMatchObject({
      column: 'name',
      operator: 'like',
      value: '%test%',
    })
    expect(mockQuery.conditions[1]).toMatchObject({
      column: 'name',
      operator: 'like',
      value: 'T%',
    })
  })
})

describe('進階過濾器 - 數值運算符', () => {
  let mockQuery: unknown

  beforeEach(() => {
    mockQuery = {
      conditions: [] as unknown[],
      where(column: string, operator: string, value: unknown) {
        this.conditions.push({ column, operator, value })
        return this
      },
      whereBetween(column: string, range: [unknown, unknown]) {
        this.conditions.push({ column, operator: 'between', value: range })
        return this
      },
    }
  })

  test('gt - 大於', () => {
    const filter: NumberFilter = { gt: 10 }
    applyNumberFilter(mockQuery, 'age', filter)

    expect(mockQuery.conditions).toEqual([{ column: 'age', operator: '>', value: 10 }])
  })

  test('gte - 大於等於', () => {
    const filter: NumberFilter = { gte: 18 }
    applyNumberFilter(mockQuery, 'age', filter)

    expect(mockQuery.conditions).toEqual([{ column: 'age', operator: '>=', value: 18 }])
  })

  test('lt - 小於', () => {
    const filter: NumberFilter = { lt: 100 }
    applyNumberFilter(mockQuery, 'score', filter)

    expect(mockQuery.conditions).toEqual([{ column: 'score', operator: '<', value: 100 }])
  })

  test('lte - 小於等於', () => {
    const filter: NumberFilter = { lte: 65 }
    applyNumberFilter(mockQuery, 'age', filter)

    expect(mockQuery.conditions).toEqual([{ column: 'age', operator: '<=', value: 65 }])
  })

  test('between - 範圍', () => {
    const filter: NumberFilter = { between: { from: 10, to: 50 } }
    applyNumberFilter(mockQuery, 'price', filter)

    expect(mockQuery.conditions).toEqual([
      { column: 'price', operator: 'between', value: [10, 50] },
    ])
  })

  test('eq - 等於', () => {
    const filter: NumberFilter = { eq: 42 }
    applyNumberFilter(mockQuery, 'answer', filter)

    expect(mockQuery.conditions).toEqual([{ column: 'answer', operator: '=', value: 42 }])
  })

  test('in - 在列表中', () => {
    const filter: NumberFilter = { in: [1, 2, 3] }
    applyNumberFilter(mockQuery, 'level', filter)

    expect(mockQuery.conditions).toEqual([{ column: 'level', operator: 'in', value: [1, 2, 3] }])
  })

  test('組合多個條件（範圍查詢）', () => {
    const filter: NumberFilter = {
      gte: 18,
      lte: 65,
    }
    applyNumberFilter(mockQuery, 'age', filter)

    expect(mockQuery.conditions).toHaveLength(2)
    expect(mockQuery.conditions[0]).toMatchObject({
      column: 'age',
      operator: '>=',
      value: 18,
    })
    expect(mockQuery.conditions[1]).toMatchObject({
      column: 'age',
      operator: '<=',
      value: 65,
    })
  })
})

// Helper function to create mock query with full support for nested queries
function createMockQuery(): unknown {
  const query: unknown = {
    conditions: [] as unknown[],
    subQueries: [] as unknown[],
    where(columnOrFn: string | Function, operator?: string, value?: unknown) {
      if (typeof columnOrFn === 'function') {
        const subQuery = createMockQuery()
        columnOrFn(subQuery)
        this.subQueries.push(subQuery)
      } else {
        this.conditions.push({ column: columnOrFn, operator, value })
      }
      return this
    },
    orWhere(fn: Function) {
      const subQuery = createMockQuery()
      fn(subQuery)
      this.subQueries.push({ type: 'or', query: subQuery })
      return this
    },
    whereNot(fn: Function) {
      const subQuery = createMockQuery()
      fn(subQuery)
      this.subQueries.push({ type: 'not', query: subQuery })
      return this
    },
    whereRaw(sql: string, bindings?: unknown[]) {
      this.conditions.push({ type: 'raw', sql, bindings })
      return this
    },
    whereBetween(column: string, range: [unknown, unknown]) {
      this.conditions.push({ column, operator: 'between', value: range })
      return this
    },
  }
  return query
}

describe('進階過濾器 - 邏輯運算符', () => {
  let mockQuery: unknown

  beforeEach(() => {
    mockQuery = createMockQuery()
  })

  test('_and - 邏輯 AND', () => {
    const filter: LogicalOperators = {
      _and: [{ name: { eq: 'John' } }, { age: { gt: 18 } }],
    }

    applyLogicalOperators(mockQuery, filter, (q, field, value) => {
      if (field === 'name') {
        applyStringFilter(q, field, value)
      } else if (field === 'age') {
        applyNumberFilter(q, field, value)
      }
    })

    expect(mockQuery.subQueries).toHaveLength(2)
  })

  test('_or - 邏輯 OR', () => {
    const filter: LogicalOperators = {
      _or: [{ status: { eq: 'active' } }, { status: { eq: 'pending' } }],
    }

    applyLogicalOperators(mockQuery, filter, (q, field, value) => {
      applyStringFilter(q, field, value)
    })

    expect(mockQuery.subQueries.some((sq: unknown) => sq.type === 'or')).toBe(true)
  })

  test('_not - 邏輯 NOT', () => {
    const filter: LogicalOperators = {
      _not: { status: { eq: 'deleted' } },
    }

    applyLogicalOperators(mockQuery, filter, (q, field, value) => {
      applyStringFilter(q, field, value)
    })

    expect(mockQuery.subQueries.some((sq: unknown) => sq.type === 'not')).toBe(true)
  })

  test('複雜的巢狀邏輯', () => {
    const filter: LogicalOperators = {
      _and: [
        {
          _or: [{ name: { contains: 'John' } }, { name: { contains: 'Jane' } }],
        },
        { age: { gte: 18 } },
      ],
    }

    applyLogicalOperators(mockQuery, filter, (q, field, value) => {
      if (field === 'name') {
        applyStringFilter(q, field, value)
      } else if (field === 'age') {
        applyNumberFilter(q, field, value)
      }
    })

    expect(mockQuery.subQueries.length).toBeGreaterThan(0)
  })
})
