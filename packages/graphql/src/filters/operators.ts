/**
 * Filter configuration for string-based fields.
 *
 * Provides various matching strategies including exact equality, pattern matching,
 * and regular expressions. Used in GraphQL 'where' inputs to filter database records.
 */
export interface StringFilter {
  /** Exact match */
  eq?: string
  /** SQL LIKE pattern matching (e.g., 'user%') */
  like?: string
  /** Match any value in the provided list */
  in?: string[]
  /** Substring match (auto-wraps with %) */
  contains?: string
  /** Prefix match (auto-appends %) */
  startsWith?: string
  /** Suffix match (auto-prepends %) */
  endsWith?: string
  /** Regular expression match */
  match?: string
}

/**
 * Filter configuration for numeric fields.
 *
 * Supports comparison operators, range queries, and set membership.
 * Applicable to Int, Float, and BigInt types.
 */
export interface NumberFilter {
  /** Exact equality */
  eq?: number
  /** Greater than */
  gt?: number
  /** Greater than or equal to */
  gte?: number
  /** Less than */
  lt?: number
  /** Less than or equal to */
  lte?: number
  /** Match any value in the provided list */
  in?: number[]
  /** Range match (inclusive) */
  between?: { from: number; to: number }
}

/**
 * Filter configuration for date and timestamp fields.
 *
 * Handles both Date objects and ISO string representations.
 * Supports chronological comparisons and range queries.
 */
export interface DateFilter {
  /** Exact match */
  eq?: Date | string
  /** Chronologically after */
  gt?: Date | string
  /** Chronologically at or after */
  gte?: Date | string
  /** Chronologically before */
  lt?: Date | string
  /** Chronologically at or before */
  lte?: Date | string
  /** Temporal range match (inclusive) */
  between?: { from: Date | string; to: Date | string }
}

/**
 * Recursive where condition structure for complex queries.
 *
 * Combines field-level filters with logical operators (_and, _or, _not)
 * to build complex nested queries.
 */
export interface WhereCondition {
  /** All conditions must be true (logical AND) */
  _and?: WhereCondition[]
  /** At least one condition must be true (logical OR) */
  _or?: WhereCondition[]
  /** Condition must be false (logical NOT) */
  _not?: WhereCondition
  /** Field-specific filters */
  [field: string]: StringFilter | NumberFilter | DateFilter | unknown
}

/**
 * Represents the logical operator structure for query processing.
 */
export interface LogicalOperators {
  _and?: WhereCondition[]
  _or?: WhereCondition[]
  _not?: WhereCondition
  [key: string]: unknown
}

/**
 * Minimal interface for an Atlas-compatible Query Builder.
 *
 * Defines the contract for applying filters to the underlying database driver.
 */
interface QueryBuilder {
  /** Applies a standard WHERE clause */
  where(column: string | ((query: QueryBuilder) => void), operator?: string, value?: unknown): this
  /** Applies a raw SQL WHERE clause with bindings for safety */
  whereRaw(sql: string, bindings?: unknown[]): this
  /** Applies a BETWEEN clause */
  whereBetween(column: string, range: [unknown, unknown]): this
  /** Applies an OR WHERE clause (optional depending on driver) */
  orWhere?(fn: (query: QueryBuilder) => void): this
  /** Applies a WHERE NOT clause (optional depending on driver) */
  whereNot?(fn: (query: QueryBuilder) => void): this
}

/**
 * Applies string-specific filters to an Atlas QueryBuilder.
 *
 * Maps GraphQL StringFilter properties to corresponding SQL operations.
 * Handles pattern matching (contains, startsWith, etc.) and RegEx.
 *
 * @param query - The active QueryBuilder instance
 * @param column - Name of the database column to filter
 * @param filter - The string filter criteria
 *
 * @example
 * ```typescript
 * applyStringFilter(query, 'email', { contains: '@gmail.com' });
 * ```
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
    query.whereRaw(`${column} REGEXP ?`, [filter.match])
  }

  if (filter.in !== undefined && filter.in.length > 0) {
    // biome-ignore lint/suspicious/noExplicitAny: Standard whereIn logic
    ;(query as any).whereIn?.(column, filter.in) || query.where(column, 'in', filter.in)
  }
}

/**
 * Applies numeric filters to an Atlas QueryBuilder.
 *
 * Supports comparison operators and range queries.
 *
 * @param query - The active QueryBuilder instance
 * @param column - Name of the database column to filter
 * @param filter - The numeric filter criteria
 *
 * @example
 * ```typescript
 * applyNumberFilter(query, 'price', { gte: 100, lte: 500 });
 * ```
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
    // biome-ignore lint/suspicious/noExplicitAny: Standard whereIn logic
    ;(query as any).whereIn?.(column, filter.in) || query.where(column, 'in', filter.in)
  }
}

/**
 * Applies date filters to an Atlas QueryBuilder.
 *
 * @param query - The active QueryBuilder instance
 * @param column - Name of the database column to filter
 * @param filter - The date filter criteria
 *
 * @example
 * ```typescript
 * applyDateFilter(query, 'created_at', { gt: '2023-01-01' });
 * ```
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
 * Recursively applies logical operators (_and, _or, _not) to a QueryBuilder.
 *
 * This function handles the recursive nature of complex filters, branching the
 * query based on the logical operators provided in the input.
 *
 * @param query - The active QueryBuilder instance
 * @param filter - Object containing logical operators and field filters
 * @param applyFieldFilter - Callback to apply specific field-level logic
 *
 * @example
 * ```typescript
 * applyLogicalOperators(query, { _or: [{ status: { eq: 'active' } }] }, applyFieldFilter);
 * ```
 */
export function applyLogicalOperators(
  query: QueryBuilder,
  filter: LogicalOperators,
  applyFieldFilter: (q: QueryBuilder, field: string, value: unknown) => void
): void {
  if (filter._and) {
    for (const condition of filter._and) {
      // biome-ignore lint/suspicious/noExplicitAny: Simplified QueryBuilder interface
      ;(query as any).where((subQuery: QueryBuilder) => {
        applyFiltersRecursive(subQuery, condition, applyFieldFilter)
      })
    }
  }

  if (filter._or) {
    // biome-ignore lint/suspicious/noExplicitAny: Check for driver-specific orWhere method
    if (typeof (query as any).orWhere === 'function') {
      for (const condition of filter._or) {
        // biome-ignore lint/suspicious/noExplicitAny: Recursive branching
        ;(query as any).orWhere((subQuery: QueryBuilder) => {
          applyFiltersRecursive(subQuery, condition, applyFieldFilter)
        })
      }
    }
  }

  if (filter._not) {
    // biome-ignore lint/suspicious/noExplicitAny: Check for driver-specific whereNot method
    if (typeof (query as any).whereNot === 'function') {
      // biome-ignore lint/suspicious/noExplicitAny: Recursive negation
      ;(query as any).whereNot((subQuery: QueryBuilder) => {
        applyFiltersRecursive(subQuery, filter._not!, applyFieldFilter)
      })
    }
  }

  for (const [field, value] of Object.entries(filter)) {
    if (!field.startsWith('_')) {
      applyFieldFilter(query, field, value)
    }
  }
}

/**
 * Internal recursive helper for processing nested where conditions.
 *
 * @internal
 */
function applyFiltersRecursive(
  query: QueryBuilder,
  filter: WhereCondition,
  applyFieldFilter: (q: QueryBuilder, field: string, value: unknown) => void
): void {
  if (filter._and || filter._or || filter._not) {
    applyLogicalOperators(
      query as unknown as QueryBuilder,
      filter as unknown as LogicalOperators,
      applyFieldFilter
    )
  } else {
    for (const [field, value] of Object.entries(filter)) {
      applyFieldFilter(query, field, value)
    }
  }
}

/**
 * Dispatches a generic filter to the appropriate type-specific application function.
 *
 * Facilitates loose coupling between the schema generator and the filter logic
 * by using a columnType hint.
 *
 * @param query - The active QueryBuilder instance
 * @param column - Column name
 * @param filter - Filter object (StringFilter, NumberFilter, or DateFilter)
 * @param columnType - Semantic type of the column
 *
 * @example
 * ```typescript
 * applyFilter(query, 'age', { gt: 18 }, 'number');
 * ```
 */
export function applyFilter(
  query: QueryBuilder,
  column: string,
  filter: StringFilter | NumberFilter | DateFilter,
  columnType: 'string' | 'number' | 'date' = 'string'
): void {
  switch (columnType) {
    case 'string':
      applyStringFilter(query, column, filter as StringFilter)
      break
    case 'number':
      applyNumberFilter(query, column, filter as NumberFilter)
      break
    case 'date':
      applyDateFilter(query, column, filter as DateFilter)
      break
  }
}
