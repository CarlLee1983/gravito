/**
 * Query Builder
 * @description Fluent query builder for constructing SQL queries
 */

import { DB } from '../DB'
import type {
  CompiledQuery,
  ConnectionContract,
  GrammarContract,
  HavingClause,
  JoinClause,
  Operator,
  OrderClause,
  OrderDirection,
  PaginateResult,
  QueryBuilderContract,
  WhereClause,
} from '../types'
import { applyMixins } from '../utils/applyMixins'
import { CanEagerLoad } from './concerns/CanEagerLoad'
import { CanExecute } from './concerns/CanExecute'
import { CanFilter } from './concerns/CanFilter'
import { CanGroup } from './concerns/CanGroup'
import { CanHandleSoftDeletes } from './concerns/CanHandleSoftDeletes'
import { CanJoin } from './concerns/CanJoin'
import { CanPaginate } from './concerns/CanPaginate'
import { CanSelect } from './concerns/CanSelect'
import { CanSort } from './concerns/CanSort'

/**
 * Query Builder Error
 */
export class QueryBuilderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueryBuilderError'
  }
}

/**
 * Record Not Found Error
 */
export class RecordNotFoundError extends Error {
  constructor(message = 'Record not found') {
    super(message)
    this.name = 'RecordNotFoundError'
  }
}

/**
 * Query Builder
 * Provides a fluent interface for building and executing SQL queries
 */
// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: Intentional mixin pattern for QueryBuilder
export class QueryBuilder<T = Record<string, unknown>> implements QueryBuilderContract<T> {
  // Query state (Made public for concerns to access)
  public tableName: string
  public modelClass?: any
  public columns: string[] = ['*']
  public distinctValue = false
  public wheres: WhereClause[] = []
  public orders: OrderClause[] = []
  public groups: string[] = []
  public havings: HavingClause[] = []
  public joins: JoinClause[] = []
  public limitValue: number | undefined = undefined
  public offsetValue: number | undefined = undefined
  public bindingsList: unknown[] = []
  public isReadOnly = false
  public eagerLoads = new Map<string, (query: QueryBuilderContract<any>) => void>()
  public _cache?: { ttl: number; key?: string }

  // Global Scopes
  public globalScopes = new Map<string, (query: QueryBuilderContract<any>) => void>()
  public removedScopes = new Set<string>()
  public _isApplyingScopes = false

  constructor(
    public readonly connection: ConnectionContract,
    public readonly grammar: GrammarContract,
    table: string
  ) {
    this.tableName = table
  }

  /**
   * Set the model class for this query
   */
  setModel(model: any): this {
    this.modelClass = model
    return this
  }

  /**
   * Get the model class
   */
  getModel(): any {
    return this.modelClass
  }

  // ============================================================================
  // Method signatures for Mixins
  // ============================================================================

  // CanSelect
  select(..._columns: string[]): this {
    return this
  }
  selectRaw(_sql: any, _bindings: any[] = []): this {
    return this
  }
  distinct(): this {
    return this
  }
  cache(_ttl: number, _key?: string): this {
    return this
  }

  // CanFilter
  where(_column: any, _operatorOrValue?: any, _value?: any): this {
    return this
  }
  orWhere(_column: any, _operatorOrValue?: any, _value?: any): this {
    return this
  }
  whereIn(_column: string, _values: any[]): this {
    return this
  }
  whereNotIn(_column: string, _values: any[]): this {
    return this
  }
  orWhereIn(_column: string, _values: any[]): this {
    return this
  }
  orWhereNotIn(_column: string, _values: any[]): this {
    return this
  }
  whereNull(_column: string): this {
    return this
  }
  whereNotNull(_column: string): this {
    return this
  }
  orWhereNull(_column: string): this {
    return this
  }
  orWhereNotNull(_column: string): this {
    return this
  }
  whereBetween(_column: string, _values: [any, any]): this {
    return this
  }
  whereNotBetween(_column: string, _values: [any, any]): this {
    return this
  }
  whereRaw(_sql: any, _bindings: any[] = []): this {
    return this
  }
  orWhereRaw(_sql: any, _bindings: any[] = []): this {
    return this
  }
  whereColumn(_first: string, _operator: any, _second: string): this {
    return this
  }
  whereJson(_column: string, _value: any): this {
    return this
  }
  orWhereJson(_column: string, _value: any): this {
    return this
  }
  whereJsonContains(_column: string, _value: any): this {
    return this
  }
  orWhereJsonContains(_column: string, _value: any): this {
    return this
  }
  whereHas(_relation: string, _callback?: any): this {
    return this
  }
  protected whereNested(_callback: any, _boolean: any): this {
    return this
  }
  applyScope(_name: string, _callback: any): this {
    return this
  }
  withoutGlobalScope(_name: string): this {
    return this
  }
  protected applyGlobalScopes(): void {}

  // CanJoin
  join(_table: string, _first: string, _operator: string, _second: string): this {
    return this
  }
  leftJoin(_table: string, _first: string, _operator: string, _second: string): this {
    return this
  }
  rightJoin(_table: string, _first: string, _operator: string, _second: string): this {
    return this
  }
  crossJoin(_table: string): this {
    return this
  }
  addJoin(_type: any, _table: string, _first: string, _operator: string, _second: string): this {
    return this
  }

  // CanGroup
  groupBy(..._columns: string[]): this {
    return this
  }
  having(_column: string, _operator: any, _value: any): this {
    return this
  }
  havingRaw(_sql: any, _bindings: any[] = []): this {
    return this
  }

  // CanSort
  orderBy(_column: string, _direction: any = 'asc'): this {
    return this
  }
  orderByDesc(_column: string): this {
    return this
  }
  orderByRaw(_sql: any, _bindings: any[] = []): this {
    return this
  }
  latest(_column = 'created_at'): this {
    return this
  }
  oldest(_column = 'created_at'): this {
    return this
  }
  limit(_value: number): this {
    return this
  }
  offset(_value: number): this {
    return this
  }
  skip(_value: number): this {
    return this
  }
  take(_value: number): this {
    return this
  }

  // CanExecute
  async get(): Promise<T[]> {
    return []
  }
  async first(): Promise<T | null> {
    return null
  }
  async firstOrFail(): Promise<T> {
    throw new RecordNotFoundError()
  }
  async find(_id: any, _primaryKey = 'id'): Promise<T | null> {
    return null
  }
  async findOrFail(_id: any, _primaryKey = 'id'): Promise<T> {
    throw new RecordNotFoundError()
  }
  async value<V = any>(_column: string): Promise<V | null> {
    return null
  }
  async pluck<V = any>(_column: string): Promise<V[]> {
    return []
  }
  async exists(): Promise<boolean> {
    return false
  }
  async doesntExist(): Promise<boolean> {
    return true
  }
  async count(_column = '*'): Promise<number> {
    return 0
  }
  async max<V = number>(_column: string): Promise<V | null> {
    return null
  }
  async min<V = number>(_column: string): Promise<V | null> {
    return null
  }
  async avg(_column: string): Promise<number | null> {
    return null
  }
  async sum(_column: string): Promise<number> {
    return 0
  }
  protected async aggregate(_func: string, _column: string): Promise<number | null> {
    return null
  }
  async insert(_data: any): Promise<T[]> {
    return []
  }
  async insertGetId(_data: any, _primaryKey = 'id'): Promise<number | bigint> {
    return 0
  }
  async update(_data: any): Promise<number> {
    return 0
  }
  async updateJson(_column: string, _value: any): Promise<number> {
    return 0
  }
  async delete(): Promise<number> {
    return 0
  }
  async truncate(): Promise<void> {}
  async increment(_column: string, _amount = 1, _extra: any = {}): Promise<number> {
    return 0
  }
  async decrement(_column: string, _amount = 1, _extra: any = {}): Promise<number> {
    return 0
  }
  async upsert(_data: any, _uniqueBy: string | string[], _update?: string[]): Promise<number> {
    return 0
  }

  // CanEagerLoad
  with(_relation: any): this {
    return this
  }
  async eagerLoad(_models: any[]): Promise<void> {}
  async withLateral(_relationName: string, _callback?: any): Promise<this> {
    return this
  }
  protected addLateralJoin(_relationName: string, _relation: any, _callback?: any): this {
    return this
  }
  joinRaw(_sql: string, _bindings: any[] = []): this {
    return this
  }

  // CanPaginate
  async chunk(_size: number, _callback: any): Promise<void> {}
  async paginate(_perPage = 15, _page = 1, _primaryKey = 'id'): Promise<PaginateResult<T>> {
    return {} as any
  }
  async simplePaginate(_perPage = 15, _page = 1, _primaryKey = 'id'): Promise<PaginateResult<T>> {
    return {} as any
  }
  protected ensureDeterministicOrder(_primaryKey: string): void {}

  // CanHandleSoftDeletes
  withTrashed(): this {
    return this
  }
  onlyTrashed(): this {
    return this
  }
  async restore(): Promise<number> {
    return 0
  }
  async forceDelete(): Promise<number> {
    return 0
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Clone the query builder
   */
  clone(): QueryBuilderContract<T> {
    const cloned = new QueryBuilder<T>(this.connection, this.grammar, this.tableName)
    cloned.columns = [...this.columns]
    cloned.distinctValue = this.distinctValue
    cloned.wheres = [...this.wheres]
    cloned.orders = [...this.orders]
    cloned.groups = [...this.groups]
    cloned.havings = [...this.havings]
    cloned.joins = [...this.joins]
    cloned.limitValue = this.limitValue
    cloned.offsetValue = this.offsetValue
    cloned.bindingsList = [...this.bindingsList]
    cloned.isReadOnly = this.isReadOnly
    cloned.globalScopes = new Map(this.globalScopes)
    cloned.removedScopes = new Set(this.removedScopes)
    cloned.eagerLoads = new Map(this.eagerLoads)
    cloned.modelClass = this.modelClass
    if (this._cache) cloned._cache = { ...this._cache }
    return cloned
  }

  /**
   * Get the compiled query structure
   */
  getCompiledQuery(): CompiledQuery {
    this.applyGlobalScopes()
    return {
      table: this.tableName,
      columns: this.columns,
      distinct: this.distinctValue,
      wheres: this.wheres,
      orders: this.orders,
      groups: this.groups,
      havings: this.havings,
      joins: this.joins,
      limit: this.limitValue,
      offset: this.offsetValue,
      bindings: this.bindingsList,
    }
  }

  /**
   * Get SQL representation
   */
  toSql(): string {
    return this.grammar.compileSelect(this.getCompiledQuery())
  }

  /**
   * Get bindings
   */
  getBindings(): unknown[] {
    return [...this.bindingsList]
  }

  /**
   * Dump query
   */
  dump(): this {
    console.log('SQL:', this.toSql())
    console.log('Bindings:', this.getBindings())
    return this
  }

  /**
   * Dump and die
   */
  dd(): never {
    this.dump()
    process.exit(1)
  }

  /**
   * Set read only mode
   */
  readonly(value = true): this {
    this.isReadOnly = value
    return this
  }

  /**
   * Check if the query has limit or offset
   */
  hasLimitOrOffset(): boolean {
    return this.limitValue !== undefined || this.offsetValue !== undefined
  }
}

// Apply Mixins
export interface QueryBuilder<T>
  extends CanSelect,
    CanFilter<T>,
    CanJoin,
    CanSort,
    CanGroup,
    CanExecute,
    CanEagerLoad,
    CanPaginate,
    CanHandleSoftDeletes {}

applyMixins(QueryBuilder, [
  CanSelect,
  CanFilter,
  CanJoin,
  CanSort,
  CanGroup,
  CanExecute,
  CanEagerLoad,
  CanPaginate,
  CanHandleSoftDeletes,
])
