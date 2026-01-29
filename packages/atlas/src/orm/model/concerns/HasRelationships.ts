import { DB } from '../../../DB'
import type { Model, ModelConstructor } from '../Model'
import { ModelRegistry } from '../ModelRegistry'

/**
 * HasRelationships Concern
 * @description Provides relationship management functionality including defining and loading relationships.
 */
export class HasRelationships {
  /**
   * Define a one-to-many relationship.
   * Returns a QueryBuilder scoped to the related records.
   *
   * @template R - The related model type.
   * @param related - The related model constructor.
   * @param foreignKey - The foreign key on the related table.
   * @param localKey - The local key on this table.
   * @returns A QueryBuilder for the related model.
   * @example
   * ```typescript
   * const posts = await user.hasMany(Post).where('published', true).get()
   * ```
   */
  hasMany<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    localKey?: string
  ) {
    const modelCtor = this.constructor as typeof Model
    const table = modelCtor.getTable()
    const fk = foreignKey ?? `${table.replace(/s$/, '')}_id`
    const lk = localKey ?? modelCtor.primaryKey
    const localValue = (this as any)._attributes[lk]

    const builder = related.query().where(fk, localValue)
    return builder as any
  }

  /**
   * Define a one-to-one relationship.
   *
   * @template R - The related model type.
   * @param related - The related model constructor.
   * @param foreignKey - The foreign key on the related table.
   * @param localKey - The local key on this table.
   * @returns A QueryBuilder for the related model, limited to 1 result.
   */
  hasOne<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    localKey?: string
  ) {
    return this.hasMany(related, foreignKey, localKey).limit(1)
  }

  /**
   * Define an inverse one-to-one or one-to-many relationship.
   *
   * @template R - The related model type.
   * @param related - The related model constructor.
   * @param foreignKey - The foreign key on this table.
   * @param ownerKey - The owner key on the related table.
   * @returns A QueryBuilder for the related model.
   * @example
   * ```typescript
   * const user = await post.belongsTo(User).first()
   * ```
   */
  belongsTo<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    ownerKey?: string
  ) {
    const table = related.getTable()
    const fk = foreignKey ?? `${table.replace(/s$/, '')}_id`
    const ok = ownerKey ?? related.primaryKey
    const foreignValue = (this as any)._attributes[fk]

    const builder = related.query().where(ok, foreignValue)
    return builder as any
  }

  /**
   * Define a many-to-many relationship through a pivot table.
   *
   * @template R - The related model type.
   * @param related - The related model constructor.
   * @param pivotTable - The name of the join table.
   * @param foreignPivotKey - The key on the pivot table pointing to this model.
   * @param relatedPivotKey - The key on the pivot table pointing to the related model.
   * @param localKey - The local key on this table.
   * @param relatedKey - The related key on the related table.
   * @returns Promise resolving to an array of related models.
   */
  async belongsToMany<R extends Model>(
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
    const localValue = (this as any)._attributes[lk]

    const connection = DB.connection(related.connection)

    // Get related IDs from pivot table
    const pivots = await connection
      .table<Record<string, unknown>>(pivotTable)
      .where(fpk, localValue)
      .pluck<unknown>(rpk)

    if (pivots.length === 0) {
      return []
    }

    // Get related models
    return (await related.query().whereIn(rk, pivots).get()) as R[]
  }

  /**
   * Stream hasMany relationship with cursor-based iteration
   * Memory-safe for large relationship sets
   *
   * @example
   * ```typescript
   * for await (const posts of user.hasManyStream(Post, 'user_id', 100)) {
   *   for (const post of posts) {
   *     await processPost(post)
   *   }
   * }
   * ```
   */
  async *hasManyStream<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    chunkSize = 1000,
    localKey?: string
  ): AsyncGenerator<R[], void, unknown> {
    const modelCtor = this.constructor as typeof Model
    const table = modelCtor.getTable()
    const fk = foreignKey ?? `${table.replace(/s$/, '')}_id`
    const lk = localKey ?? modelCtor.primaryKey
    const localValue = (this as any)._attributes[lk]

    const query = related.query().where(fk, localValue).orderBy(related.primaryKey)
    let offset = 0

    while (true) {
      const rows = (await query.limit(chunkSize).offset(offset).get()) as R[]

      if (rows.length === 0) {
        break
      }

      yield rows

      if (rows.length < chunkSize) {
        break
      }
      offset += chunkSize
    }
  }

  /**
   * Define a polymorphic one-to-one relationship.
   *
   * @template R - The related model type.
   * @param related - The related model constructor.
   * @param name - The polymorphic relationship name (used to derive type and id fields).
   * @param foreignKey - Optional explicit foreign key.
   * @param localKey - Optional explicit local key.
   * @returns A QueryBuilder for the related model.
   */
  morphOne<R extends Model>(
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
   * Define a polymorphic one-to-many relationship.
   *
   * @template R - The related model type.
   * @param related - The related model constructor.
   * @param name - The polymorphic relationship name.
   * @param foreignKey - Optional explicit foreign key.
   * @param localKey - Optional explicit local key.
   * @returns A QueryBuilder for the related model.
   */
  morphMany<R extends Model>(
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
   * Define a polymorphic inverse relationship.
   *
   * @template R - The related model type.
   * @param name - The polymorphic relationship name.
   * @param typeField - Optional explicit type field name.
   * @param idField - Optional explicit ID field name.
   * @returns A QueryBuilder for the resolved related model, or null if not resolvable.
   */
  morphTo<R extends Model>(name: string, typeField?: string, idField?: string) {
    const tf = typeField ?? `${name}_type`
    const ifld = idField ?? `${name}_id`

    const typeValue = (this as any)[tf]
    const idValue = (this as any)[ifld]

    if (!typeValue || !idValue) {
      return null
    }

    const RelatedModel = ModelRegistry.get(typeValue)
    if (!RelatedModel) {
      return null
    }

    const builder = (RelatedModel as any).query().where(RelatedModel.primaryKey, idValue)

    // Wrap first to hydrate (similar to belongsTo)
    const originalFirst = builder.first.bind(builder)
    builder.first = (async (): Promise<R | null> => {
      const row = await originalFirst()
      return row ? (RelatedModel as any).hydrate(row) : null
    }) as any

    return builder
  }

  /**
   * Lazy load relationships for the current model
   * @example await user.load('posts')
   */
  async load(relation: string | string[]): Promise<this> {
    const { eagerLoadMany } = await import('../relationships')
    const relations = Array.isArray(relation) ? relation : [relation]
    await eagerLoadMany([this as unknown as any], relations)
    return this
  }

  /**
   * Alias for load(), used for fluent eager loading on an instance.
   *
   * @param relation - The relationship name or an array of names
   * @returns A promise that resolves to the model instance
   */
  async with(relation: string | string[]): Promise<this> {
    return this.load(relation)
  }
}
