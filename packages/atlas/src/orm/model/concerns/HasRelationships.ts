import { DB } from '../../../DB'
import type { Model, ModelAttributes, ModelConstructor } from '../Model'

/**
 * Trait for managing model relationships.
 *
 * @public
 * @since 3.0.0
 */
export abstract class HasRelationships {
  /**
   * Define a hasMany relationship that returns a QueryBuilder
   * @example
   * ```typescript
   * const posts = await user.hasMany(Post, 'user_id').where('published', true).get()
   * ```
   */
  hasMany<R extends Model>(
    this: any,
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    localKey?: string
  ) {
    const modelCtor = this.constructor as typeof Model
    const table = modelCtor.getTable()
    const fk = foreignKey ?? `${table.replace(/s$/, '')}_id`
    const lk = localKey ?? modelCtor.primaryKey
    const localValue = this._attributes[lk]

    const connection = DB.connection(related.connection)
    const builder = connection.table<ModelAttributes>(related.getTable()).where(fk, localValue)

    const originalGet = builder.get.bind(builder)
    ;(builder as any).get = async (): Promise<R[]> => {
      const rows = await originalGet()
      return rows.map((row: any) => related.hydrate<R>(row))
    }

    return builder
  }

  /**
   * Define a hasOne relationship that returns a QueryBuilder
   */
  hasOne<R extends Model>(
    this: any,
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    localKey?: string
  ) {
    return this.hasMany(related, foreignKey, localKey).limit(1)
  }

  /**
   * Define a belongsTo relationship that returns a QueryBuilder
   * @example
   * ```typescript
   * const author = await post.belongsTo(User, 'user_id').first()
   * ```
   */
  belongsTo<R extends Model>(
    this: any,
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    ownerKey?: string
  ) {
    const table = related.getTable()
    const fk = foreignKey ?? `${table.replace(/s$/, '')}_id`
    const ok = ownerKey ?? related.primaryKey
    const foreignValue = this._attributes[fk]

    const connection = DB.connection(related.connection)
    const builder = connection.table<ModelAttributes>(table).where(ok, foreignValue)

    const originalFirst = builder.first.bind(builder)
    builder.first = (async (): Promise<R | null> => {
      const row = await originalFirst()
      return row ? related.hydrate<R>(row) : null
    }) as any

    return builder
  }

  /**
   * Define a belongsToMany relationship (through pivot table)
   * @example
   * ```typescript
   * const roles = await user.belongsToMany(Role, 'user_roles', 'user_id', 'role_id').get()
   * ```
   */
  async belongsToMany<R extends Model>(
    this: any,
    related: ModelConstructor<R> & typeof Model,
    pivotTable: string,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    localKey?: string,
    relatedKey?: string
  ): Promise<R[]> {
    const modelCtor = this.constructor as typeof Model
    const table = modelCtor.getTable()
    const relatedTable = related.getTable()
    const fpk = foreignPivotKey ?? `${table.replace(/s$/, '')}_id`
    const rpk = relatedPivotKey ?? `${relatedTable.replace(/s$/, '')}_id`
    const lk = localKey ?? modelCtor.primaryKey
    const rk = relatedKey ?? related.primaryKey
    const localValue = this._attributes[lk]

    const connection = DB.connection(related.connection)

    const pivots = await connection
      .table<Record<string, unknown>>(pivotTable)
      .where(fpk, localValue)
      .pluck<unknown>(rpk)

    if (pivots.length === 0) return []

    const rows = await connection.table<ModelAttributes>(relatedTable).whereIn(rk, pivots).get()
    return rows.map((row: any) => related.hydrate<R>(row))
  }

  /**
   * Stream hasMany relationship with cursor-based iteration
   */
  async *hasManyStream<R extends Model>(
    this: any,
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    chunkSize = 1000,
    localKey?: string
  ): AsyncGenerator<R[], void, unknown> {
    const modelCtor = this.constructor as typeof Model
    const table = modelCtor.getTable()
    const fk = foreignKey ?? `${table.replace(/s$/, '')}_id`
    const lk = localKey ?? modelCtor.primaryKey
    const localValue = this._attributes[lk]

    const connection = DB.connection(related.connection)
    let offset = 0

    while (true) {
      const rows = await connection
        .table<ModelAttributes>(related.getTable())
        .where(fk, localValue)
        .orderBy(related.primaryKey)
        .limit(chunkSize)
        .offset(offset)
        .get()

      if (rows.length === 0) break
      yield rows.map((row: any) => related.hydrate<R>(row))
      if (rows.length < chunkSize) break
      offset += chunkSize
    }
  }

  /**
   * Define a polymorphic hasOne relationship
   */
  morphOne<R extends Model>(
    this: any,
    related: ModelConstructor<R> & typeof Model,
    name: string,
    foreignKey?: string,
    localKey?: string
  ) {
    const fk = foreignKey ?? `${name}_id`
    const typeField = `${name}_type`
    const modelCtor = this.constructor as typeof Model
    return this.hasMany(related, fk, localKey).where(typeField, modelCtor.name).limit(1)
  }

  /**
   * Define a polymorphic hasMany relationship
   */
  morphMany<R extends Model>(
    this: any,
    related: ModelConstructor<R> & typeof Model,
    name: string,
    foreignKey?: string,
    localKey?: string
  ) {
    const fk = foreignKey ?? `${name}_id`
    const typeField = `${name}_type`
    const modelCtor = this.constructor as typeof Model
    return this.hasMany(related, fk, localKey).where(typeField, modelCtor.name)
  }

  /**
   * Define a polymorphic belongsTo relationship
   */
  morphTo(this: any, name: string, typeField?: string, idField?: string) {
    const tf = typeField ?? `${name}_type`
    const ifld = idField ?? `${name}_id`
    const type = this._attributes[tf] as string
    const id = this._attributes[ifld]

    if (!type || !id) return null

    const { ModelRegistry } = require('../ModelRegistry')
    const Related = ModelRegistry.get(type)
    if (!Related) return null

    return this.belongsTo(Related, ifld, (Related as any).primaryKey)
  }

  /**
   * Lazy load relationships for the current model
   */
  async load(this: any, relation: string | string[]): Promise<this> {
    const { eagerLoadMany } = await import('../relationships')
    const relations = Array.isArray(relation) ? relation : [relation]
    await eagerLoadMany([this], relations)
    return this as any
  }
}
