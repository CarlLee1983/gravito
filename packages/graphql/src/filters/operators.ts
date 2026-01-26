/**
 * 進階過濾器運算符處理模組
 * 支援字串、數值、邏輯運算符
 */

export interface StringFilter {
  eq?: string
  like?: string
  in?: string[]
  contains?: string
  startsWith?: string
  endsWith?: string
  match?: string // Regex pattern
}

export interface NumberFilter {
  eq?: number
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  in?: number[]
  between?: { from: number; to: number }
}

export interface DateFilter {
  eq?: Date | string
  gt?: Date | string
  gte?: Date | string
  lt?: Date | string
  lte?: Date | string
  between?: { from: Date | string; to: Date | string }
}

export interface WhereCondition {
  [field: string]: StringFilter | NumberFilter | DateFilter | unknown
}

export interface LogicalOperators {
  _and?: WhereCondition[]
  _or?: WhereCondition[]
  _not?: WhereCondition
  [key: string]: unknown
}

// QueryBuilder interface - simplified representation of Atlas QueryBuilder
interface QueryBuilder {
  where(column: string, operator: string, value: unknown): this
  whereRaw(sql: string, bindings?: unknown[]): this
  whereBetween(column: string, range: [unknown, unknown]): this
  orWhere?(fn: (query: QueryBuilder) => void): this
  whereNot?(fn: (query: QueryBuilder) => void): this
}

/**
 * 應用字串過濾器
 */
export function applyStringFilter(query: QueryBuilder, column: string, filter: StringFilter): void {
  if (filter.eq !== undefined) {
    query.where(column, '=', filter.eq)
  }

  if (filter.like !== undefined) {
    query.where(column, 'like', filter.like)
  }

  if (filter.contains !== undefined) {
    query.where(column, 'like', `%${filter.contains}%`)
  }

  if (filter.startsWith !== undefined) {
    query.where(column, 'like', `${filter.startsWith}%`)
  }

  if (filter.endsWith !== undefined) {
    query.where(column, 'like', `%${filter.endsWith}`)
  }

  if (filter.match !== undefined) {
    // 使用 REGEXP 進行正則表達式匹配
    query.whereRaw(`${column} REGEXP ?`, [filter.match])
  }

  if (filter.in !== undefined && filter.in.length > 0) {
    query.where(column, 'in', filter.in)
  }
}

/**
 * 應用數值過濾器
 */
export function applyNumberFilter(query: QueryBuilder, column: string, filter: NumberFilter): void {
  if (filter.eq !== undefined) {
    query.where(column, '=', filter.eq)
  }

  if (filter.gt !== undefined) {
    query.where(column, '>', filter.gt)
  }

  if (filter.gte !== undefined) {
    query.where(column, '>=', filter.gte)
  }

  if (filter.lt !== undefined) {
    query.where(column, '<', filter.lt)
  }

  if (filter.lte !== undefined) {
    query.where(column, '<=', filter.lte)
  }

  if (filter.between !== undefined) {
    query.whereBetween(column, [filter.between.from, filter.between.to])
  }

  if (filter.in !== undefined && filter.in.length > 0) {
    query.where(column, 'in', filter.in)
  }
}

/**
 * 應用日期過濾器
 */
export function applyDateFilter(query: QueryBuilder, column: string, filter: DateFilter): void {
  if (filter.eq !== undefined) {
    query.where(column, '=', filter.eq)
  }

  if (filter.gt !== undefined) {
    query.where(column, '>', filter.gt)
  }

  if (filter.gte !== undefined) {
    query.where(column, '>=', filter.gte)
  }

  if (filter.lt !== undefined) {
    query.where(column, '<', filter.lt)
  }

  if (filter.lte !== undefined) {
    query.where(column, '<=', filter.lte)
  }

  if (filter.between !== undefined) {
    query.whereBetween(column, [filter.between.from, filter.between.to])
  }
}

/**
 * 應用邏輯運算符
 */
export function applyLogicalOperators(
  query: QueryBuilder,
  filter: LogicalOperators,
  applyFieldFilter: (q: QueryBuilder, field: string, value: unknown) => void
): void {
  // 處理 _and
  if (filter._and) {
    for (const condition of filter._and) {
      query.where((subQuery: QueryBuilder) => {
        applyFiltersRecursive(subQuery, condition, applyFieldFilter)
      })
    }
  }

  // 處理 _or
  if (filter._or) {
    for (const condition of filter._or) {
      query.orWhere((subQuery: QueryBuilder) => {
        applyFiltersRecursive(subQuery, condition, applyFieldFilter)
      })
    }
  }

  // 處理 _not
  if (filter._not) {
    query.whereNot((subQuery: QueryBuilder) => {
      applyFiltersRecursive(subQuery, filter._not, applyFieldFilter)
    })
  }

  // 處理其他欄位過濾器
  for (const [field, value] of Object.entries(filter)) {
    if (!field.startsWith('_')) {
      applyFieldFilter(query, field, value)
    }
  }
}

/**
 * 遞迴應用過濾器（處理巢狀邏輯）
 */
function applyFiltersRecursive(
  query: QueryBuilder,
  filter: WhereCondition,
  applyFieldFilter: (q: QueryBuilder, field: string, value: unknown) => void
): void {
  if (filter._and || filter._or || filter._not) {
    applyLogicalOperators(query, filter, applyFieldFilter)
  } else {
    for (const [field, value] of Object.entries(filter)) {
      applyFieldFilter(query, field, value)
    }
  }
}

/**
 * 根據欄位類型自動應用過濾器
 */
export function applyFilter(
  query: QueryBuilder,
  column: string,
  filter: StringFilter | NumberFilter | DateFilter,
  columnType: 'string' | 'number' | 'date' = 'string'
): void {
  switch (columnType) {
    case 'string':
      applyStringFilter(query, column, filter)
      break
    case 'number':
      applyNumberFilter(query, column, filter)
      break
    case 'date':
      applyDateFilter(query, column, filter)
      break
  }
}
