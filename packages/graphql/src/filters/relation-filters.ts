import { applyFilter, applyLogicalOperators, type WhereCondition } from './operators'

/**
 * Configuration for filtering records based on their relationships.
 *
 * Defines the metadata required to perform sub-queries (WHERE EXISTS) across
 * different relationship types (hasOne, hasMany, belongsTo, etc.).
 */
export interface RelationFilterConfig {
  /** The table name of the source model */
  modelTable: string
  /** The primary key of the source model (usually 'id') */
  modelPrimaryKey: string
  /** The table name of the related model */
  relationTable: string
  /** The foreign key used to link the models */
  relationForeignKey: string
  /** The type of relationship defined in Atlas */
  relationType: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany' | 'morphOne' | 'morphMany'
  /** The local key for belongsTo relationships */
  localKey?: string
  /** Name of the junction table for belongsToMany */
  pivotTable?: string
  /** Foreign key pointing to the source model in the pivot table */
  pivotForeignKey?: string
  /** Foreign key pointing to the related model in the pivot table */
  pivotRelatedKey?: string
}

/**
 * Internal interface for QueryBuilder with existence support.
 *
 * Extends the basic QueryBuilder to include methods required for
 * relational filtering via subqueries.
 */
interface QueryBuilder {
  where(
    columnOrFn: string | ((query: QueryBuilder) => void),
    operator?: string,
    value?: unknown
  ): this
  /** Adds a WHERE EXISTS clause */
  whereExists(fn: (query: QueryBuilder) => void): this
  /** Adds a WHERE NOT EXISTS clause */
  whereNotExists(fn: (query: QueryBuilder) => void): this
  /** Compares two columns for equality */
  whereColumn(first: string, operator: string, second: string): this
  /** Sets the FROM clause for subqueries */
  from(table: string): this
  /** Applies a WHERE IN clause */
  whereIn(column: string, values: unknown[]): this
  /** Applies a raw SQL clause */
  whereRaw(sql: string, bindings?: unknown[]): this
  /** Applies a BETWEEN clause */
  whereBetween(column: string, range: [unknown, unknown]): this
  /** Applies an OR WHERE clause */
  orWhere(fn: (query: QueryBuilder) => void): this
  /** Applies a WHERE NOT clause */
  whereNot(fn: (query: QueryBuilder) => void): this
}

/**
 * Applies relational attribute filtering using WHERE EXISTS subqueries.
 *
 * This allows filtering models based on properties of their related entities.
 * Supports standard Atlas relationship types.
 *
 * @param query - The active QueryBuilder instance
 * @param config - Relational metadata for the link
 * @param filter - Nested where conditions for the related entity
 *
 * @example
 * ```typescript
 * applyRelationFilter(query, {
 *   relationType: 'hasMany',
 *   relationTable: 'posts',
 *   relationForeignKey: 'user_id',
 *   modelTable: 'users',
 *   modelPrimaryKey: 'id'
 * }, { title: { contains: 'GraphQL' } });
 * ```
 */
export function applyRelationFilter(
  query: unknown,
  config: RelationFilterConfig,
  filter: WhereCondition
): void {
  // biome-ignore lint/suspicious/noExplicitAny: QueryBuilder cast
  const qb = query as QueryBuilder

  qb.whereExists((subQuery: QueryBuilder) => {
    switch (config.relationType) {
      case 'hasOne':
      case 'hasMany':
      case 'morphOne':
      case 'morphMany':
        subQuery
          .from(config.relationTable)
          .whereColumn(
            `${config.relationTable}.${config.relationForeignKey}`,
            '=',
            `${config.modelTable}.${config.modelPrimaryKey}`
          )
        break

      case 'belongsTo':
        subQuery
          .from(config.relationTable)
          .whereColumn(
            `${config.relationTable}.${config.relationForeignKey}`,
            '=',
            `${config.modelTable}.${config.localKey}`
          )
        break

      case 'belongsToMany':
        subQuery
          .from(config.pivotTable!)
          .whereColumn(
            `${config.pivotTable}.${config.pivotForeignKey}`,
            '=',
            `${config.modelTable}.${config.modelPrimaryKey}`
          )

        subQuery.whereExists((pivotSub: QueryBuilder) => {
          pivotSub
            .from(config.relationTable)
            .whereColumn(
              `${config.relationTable}.${config.modelPrimaryKey}`,
              '=',
              `${config.pivotTable}.${config.pivotRelatedKey}`
            )

          applyRecursiveFilters(pivotSub, filter)
        })
        return

      default:
        throw new Error(`Unsupported relation type: ${config.relationType}`)
    }

    applyRecursiveFilters(subQuery, filter)
  })
}

/**
 * Helper to recursively apply logical and field filters within a relationship context.
 *
 * @internal
 */
function applyRecursiveFilters(query: QueryBuilder, filter: WhereCondition): void {
  // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
  applyLogicalOperators(query as unknown as any, filter, (q, field, val) => {
    // biome-ignore lint/suspicious/noExplicitAny: Recursive apply
    applyFilter(q as unknown as any, field, val as any)
  })
}
