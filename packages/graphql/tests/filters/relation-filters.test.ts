import { beforeEach, describe, expect, test } from 'bun:test'
import { applyRelationFilter, type RelationFilterConfig } from '../../src/filters/relation-filters'

// 建立更完整的mock query
function createMockQuery(): unknown {
  const query: unknown = {
    conditions: [] as unknown[],
    subQueries: [] as unknown[],
    existsQueries: [] as unknown[],
    table: '',
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
    whereExists(fn: Function) {
      const subQuery = createMockQuery()
      fn(subQuery)
      this.existsQueries.push(subQuery)
      return this
    },
    from(table: string) {
      this.table = table
      return this
    },
    whereColumn(col1: string, col2: string) {
      this.conditions.push({ type: 'column', col1, col2 })
      return this
    },
  }
  return query
}

describe('進階過濾器 - 關聯篩選', () => {
  let mockQuery: unknown
  let config: RelationFilterConfig

  beforeEach(() => {
    mockQuery = createMockQuery()

    config = {
      modelTable: 'users',
      modelPrimaryKey: 'id',
      relationTable: 'posts',
      relationForeignKey: 'user_id',
      relationType: 'hasMany',
    }
  })

  test('基本關聯篩選 - hasMany', () => {
    applyRelationFilter(mockQuery, config, { title: { contains: 'Gravito' } })

    expect(mockQuery.existsQueries).toHaveLength(1)
    const subQuery = mockQuery.existsQueries[0]
    expect(subQuery.table).toBe('posts')
    expect(subQuery.conditions.some((c: unknown) => c.type === 'column')).toBe(true)
  })

  test('關聯篩選 - belongsTo', () => {
    const belongsToConfig: RelationFilterConfig = {
      modelTable: 'posts',
      modelPrimaryKey: 'id',
      relationTable: 'users',
      relationForeignKey: 'user_id',
      relationType: 'belongsTo',
      localKey: 'user_id',
    }

    applyRelationFilter(mockQuery, belongsToConfig, { name: { contains: 'John' } })

    expect(mockQuery.existsQueries).toHaveLength(1)
  })

  test('關聯篩選 - belongsToMany', () => {
    const manyToManyConfig: RelationFilterConfig = {
      modelTable: 'users',
      modelPrimaryKey: 'id',
      relationTable: 'roles',
      relationForeignKey: 'role_id',
      relationType: 'belongsToMany',
      pivotTable: 'role_user',
      pivotForeignKey: 'user_id',
      pivotRelatedKey: 'role_id',
    }

    applyRelationFilter(mockQuery, manyToManyConfig, { name: { eq: 'admin' } })

    expect(mockQuery.existsQueries).toHaveLength(1)
  })
})

describe('關聯篩選 - 邊界條件', () => {
  test('空過濾條件', () => {
    const mockQuery = createMockQuery()
    const config: RelationFilterConfig = {
      modelTable: 'users',
      modelPrimaryKey: 'id',
      relationTable: 'posts',
      relationForeignKey: 'user_id',
      relationType: 'hasMany',
    }

    applyRelationFilter(mockQuery, config, {})

    expect(mockQuery.existsQueries).toHaveLength(1)
  })

  test('不支援的關聯類型', () => {
    const mockQuery = createMockQuery()
    const config: RelationFilterConfig = {
      modelTable: 'users',
      modelPrimaryKey: 'id',
      relationTable: 'posts',
      relationForeignKey: 'user_id',
      relationType: 'unknown' as RelationFilterConfig['relationType'],
    }

    expect(() => {
      applyRelationFilter(mockQuery, config, { title: { eq: 'test' } })
    }).toThrow()
  })
})
