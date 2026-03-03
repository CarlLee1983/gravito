/**
 * Abstract SQL Grammar providing base logic for SQL generation.
 *
 * Handles the structural assembly of SELECT, INSERT, UPDATE, and DELETE
 * statements. Includes a sophisticated compilation cache to minimize
 * string manipulation overhead for repetitive query structures.
 */
import { LRUCache } from 'lru-cache'
import type {
  CompiledQuery,
  GrammarContract,
  HavingClause,
  JoinClause,
  OrderClause,
  WhereClause,
} from '../types'
export declare abstract class Grammar implements GrammarContract {
  /**
   * Optional prefix for all table names.
   */
  protected tablePrefix: string
  /**
   * Database-specific character for wrapping identifiers (e.g., " or `).
   */
  protected abstract wrapChar: string
  /**
   * Internal cache for compiled SQL templates.
   * Keyed by structural hash to allow reuse across different parameter values.
   */
  private static compilationCache
  /**
   * Metrics for cache performance monitoring.
   */
  private static cacheStats
  /**
   * Global toggle for SQL compilation caching.
   */
  static useCache: boolean
  /**
   * Determines if the cache is shared globally or isolated per grammar instance.
   */
  static cacheScope: 'global' | 'instance'
  private _instanceCache?
  private _instanceCacheStats
  /**
   * Retrieves performance metrics for the compilation cache.
   *
   * @returns Stats including hit rate and utilization.
   */
  static getCacheStats(): {
    size: number
    maxSize: number
    hits: number
    misses: number
    sets: number
    hitRate: number
    missRate: number
    totalRequests: number
    utilization: number
  }
  /**
   * Retrieves metrics for the instance-level cache.
   *
   * @returns Stats object or null if instance caching is disabled.
   */
  getInstanceCacheStats(): {
    size: number
    maxSize: number
    hits: number
    misses: number
    sets: number
    hitRate: number
    missRate: number
    totalRequests: number
    utilization: number
  }
  /**
   * Flushes all performance counters.
   */
  static resetCacheStats(): void
  /**
   * Wipes the compilation cache.
   */
  static clearCache(): void
  /**
   * Resizes the global compilation cache.
   *
   * @param max - Maximum number of templates to store.
   */
  static setCacheSize(max: number): void
  /**
   * Resolves the active cache instance based on scope configuration.
   * @internal
   */
  protected getCompilationCache(): LRUCache<string, string>
  /**
   * Returns the database-specific placeholder (e.g., ?, $1, :name).
   *
   * @param index - The zero-based binding index.
   */
  abstract getPlaceholder(index: number): string
  /**
   * Compiles an INSERT statement that returns the primary key.
   */
  abstract compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    primaryKey: string
  ): string
  /**
   * Transforms a query structure into a SELECT SQL string.
   *
   * Leverages caching by generating a structural key that ignores binding values.
   *
   * @param query - The structural definition of the query.
   * @returns The compiled SQL string.
   */
  compileSelect(query: CompiledQuery): string
  /**
   * Generates a unique hash representing the SQL structure.
   *
   * Ignores specific binding values to allow cache hits for similar queries.
   * Uses efficient array joining for performance.
   *
   * @param query - The query structure.
   * @returns A deterministic string key.
   */
  getStructuralKey(query: CompiledQuery): string
  /**
   * Compiles the SELECT list.
   * @internal
   */
  protected compileColumns(query: CompiledQuery): string
  /**
   * Compiles the FROM clause.
   * @internal
   */
  protected compileFrom(query: CompiledQuery): string
  /**
   * Compiles UNION clauses.
   * @internal
   */
  protected compileUnions(query: CompiledQuery): string
  /**
   * Compiles all WHERE constraints.
   *
   * @param query - The query definition.
   * @param bindingOffset - Initial parameter index.
   * @returns Compiled SQL snippet.
   * @internal
   */
  protected compileWheres(query: CompiledQuery, bindingOffset?: number): string
  /**
   * @deprecated Use compileWhereWithOffset.
   */
  protected compileWhere(where: WhereClause, _query: CompiledQuery): string
  /**
   * Compiles a single WHERE clause with offset awareness.
   * @internal
   */
  protected compileWhereWithOffset(
    where: WhereClause,
    offset: number
  ): {
    sql: string
    bindingsUsed: number
  }
  /**
   * Compiles a standard equality or comparison clause.
   * @internal
   */
  protected compileWhereBasicWithOffset(where: WhereClause, offset: number): string
  /**
   * Compiles an IN clause.
   * @internal
   */
  protected compileWhereInWithOffset(where: WhereClause, offset: number): string
  /**
   * Wraps nested SQL in parentheses.
   * @internal
   */
  protected compileWhereNested(where: WhereClause): string
  /**
   * Compiles IS NULL constraints.
   * @internal
   */
  protected compileWhereNull(where: WhereClause): string
  /**
   * Compiles BETWEEN constraints.
   * @internal
   */
  protected compileWhereBetweenWithOffset(where: WhereClause, offset: number): string
  /**
   * Compiles column-to-column comparisons.
   * @internal
   */
  protected compileWhereColumn(where: WhereClause): string
  /**
   * Compiles all JOIN clauses.
   * @internal
   */
  protected compileJoins(query: CompiledQuery): string
  /**
   * Compiles a single JOIN relationship.
   * @internal
   */
  protected compileJoin(join: JoinClause): string
  /**
   * Compiles the GROUP BY clause.
   * @internal
   */
  protected compileGroups(query: CompiledQuery): string
  /**
   * Compiles all HAVING constraints.
   * @internal
   */
  protected compileHavings(query: CompiledQuery, bindingOffset?: number): string
  /**
   * Sums bindings across all WHERE clauses.
   * @internal
   */
  protected countAllWhereBindings(wheres: WhereClause[]): number
  /**
   * Counts bindings for a specific WHERE type.
   * @internal
   */
  protected countWhereBindings(where: WhereClause): number
  /**
   * Compiles a single HAVING clause.
   * @internal
   */
  protected compileHavingWithOffset(
    having: HavingClause,
    offset: number
  ): {
    sql: string
    bindingsUsed: number
  }
  /**
   * @deprecated
   */
  protected compileHaving(having: HavingClause, _query: CompiledQuery): string
  /**
   * Compiles the full ORDER BY clause.
   * @internal
   */
  protected compileOrders(query: CompiledQuery): string
  /**
   * Compiles a single sorting rule.
   * @internal
   */
  protected compileOrder(order: OrderClause): string
  /**
   * Compiles the LIMIT clause.
   * @internal
   */
  protected compileLimit(query: CompiledQuery): string
  /**
   * Compiles the OFFSET clause.
   * @internal
   */
  protected compileOffset(query: CompiledQuery): string
  /**
   * Compiles a multi-row INSERT statement.
   *
   * @param query - The query definition.
   * @param values - Records to insert.
   * @returns The SQL string.
   */
  compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string
  /**
   * Compiles an UPDATE statement with WHERE constraints.
   *
   * @param query - The query definition.
   * @param values - Fields and values to update.
   * @returns The SQL string.
   */
  compileUpdate(query: CompiledQuery, values: Record<string, unknown>): string
  /**
   * Adjusts placeholders in a pre-compiled snippet.
   * @internal
   */
  protected offsetPlaceholders(sql: string, _offset: number): string
  /**
   * Compiles a DELETE statement.
   */
  compileDelete(query: CompiledQuery): string
  /**
   * Compiles a TRUNCATE statement to wipe a table.
   */
  compileTruncate(query: CompiledQuery): string
  /**
   * Compiles an aggregate function selection (COUNT, MAX, etc.).
   */
  compileAggregate(
    query: CompiledQuery,
    aggregate: {
      function: string
      column: string
    }
  ): string
  /**
   * Compiles an EXISTS check.
   */
  compileExists(query: CompiledQuery): string
  /**
   * Escapes a column name for SQL safety.
   *
   * Handles table aliases, raw expressions, and wildcards.
   *
   * @param column - The column identifier.
   */
  wrapColumn(column: string): string
  /**
   * Escapes a table name.
   */
  wrapTable(table: string): string
  /**
   * Internal string escaping.
   * @internal
   */
  protected wrapValue(value: string): string
  /**
   * Manually quotes a value for literal injection.
   *
   * Warning: Prefer bindings over manual quoting for security.
   *
   * @param value - The value to quote.
   */
  quoteValue(value: unknown): string
  /**
   * Configures a prefix for all table references.
   */
  setTablePrefix(prefix: string): void
  /**
   * Retrieves the current table prefix.
   */
  getTablePrefix(): string
  /**
   * Compiles a query for relationship lateral loading.
   * @throws {Error} If unsupported by driver.
   */
  compileLateralEagerLoad(
    _table: string,
    _foreignKey: string,
    _parentKeys: unknown[],
    _query: CompiledQuery
  ): {
    sql: string
    bindings: unknown[]
  }
  /**
   * Compiles a JSON path selector.
   * @throws {Error} If unsupported.
   */
  compileJsonPath(_column: string, _value: unknown): string
  /**
   * Compiles a JSON containment check.
   * @throws {Error} If unsupported.
   */
  compileJsonContains(_column: string, _value: unknown): string
  /**
   * Compiles a partial JSON update.
   * @throws {Error} If unsupported.
   */
  compileUpdateJson(_query: CompiledQuery, _column: string, _value: unknown): string
  /**
   * Compiles an UPSERT statement.
   * @throws {Error} If unsupported.
   */
  compileUpsert(
    _query: CompiledQuery,
    _values: Record<string, unknown>[],
    _uniqueBy: string[],
    _update: string[]
  ): string
}
