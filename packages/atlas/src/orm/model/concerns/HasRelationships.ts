import type { QueryBuilderContract } from '../../../types'
import type { Model, ModelConstructor } from '../Model'
import { getRelationships } from '../relationships'

/**
 * HasRelationships Concern
 * @description Provides relationship management functionality including defining and loading relationships.
 */
export class HasRelationships {
  /**
   * Define a one-to-many relationship.
   *
   * @template T - The related model type
   * @param related - The related model constructor
   * @param foreignKey - The foreign key on the related model (defaults to this model name + _id)
   * @param localKey - The local key on this model (defaults to primary key)
   * @returns A query builder for the related model
   *
   * @example
   * ```typescript
   * user.hasMany(Post, 'user_id')
   * ```
   */
  hasMany<T extends Model>(
    related: ModelConstructor<T>,
    foreignKey?: string,
    localKey?: string
  ): QueryBuilderContract<T> {
    const relatedModel = new related()
    const relatedCtor = relatedModel.constructor as ModelConstructor<T> &
      typeof import('../Model').Model

    const foreign = foreignKey ?? `${this.constructor.name.toLowerCase()}_id`
    const local = localKey ?? (this.constructor as typeof import('../Model').Model).primaryKey

    return relatedCtor
      .query()
      .where(
        foreign,
        (this as Model & Record<string, unknown>)[local] as unknown
      ) as QueryBuilderContract<T>
  }

  /**
   * Define an inverse one-to-one or one-to-many relationship.
   *
   * @template T - The related model type
   * @param related - The related model constructor
   * @param foreignKey - The foreign key on this model (defaults to related model name + _id)
   * @param ownerKey - The owner key on the related model (defaults to its primary key)
   * @returns A query builder for the related model
   *
   * @example
   * ```typescript
   * post.belongsTo(User, 'user_id')
   * ```
   */
  belongsTo<T extends Model>(
    related: ModelConstructor<T>,
    foreignKey?: string,
    ownerKey?: string
  ): QueryBuilderContract<T> {
    const relatedModel = new related()
    const relatedCtor = relatedModel.constructor as ModelConstructor<T> &
      typeof import('../Model').Model

    const foreign = foreignKey ?? `${relatedModel.constructor.name.toLowerCase()}_id`
    const owner = ownerKey ?? relatedCtor.primaryKey

    return relatedCtor.where(
      owner,
      (this as Model & Record<string, unknown>)[foreign] as unknown
    ) as QueryBuilderContract<T>
  }

  /**
   * Define a many-to-many relationship.
   *
   * @template T - The related model type
   * @param related - The related model constructor
   * @param foreignPivotKey - The foreign key on the pivot table for the related model
   * @param relatedPivotKey - The foreign key on the pivot table for this model
   * @param table - The pivot table name (defaults to alphabetical order of both tables)
   * @returns A query builder for the related model
   *
   * @example
   * ```typescript
   * user.belongsToMany(Role, 'role_id', 'user_id', 'user_roles')
   * ```
   */
  belongsToMany<T extends Model>(
    related: ModelConstructor<T>,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    table?: string
  ): QueryBuilderContract<T> {
    const relatedModel = new related()
    const relatedCtor = relatedModel.constructor as ModelConstructor<T> &
      typeof import('../Model').Model

    const thisCtor = this.constructor as typeof import('../Model').Model
    const thisPivotKey = relatedPivotKey ?? `${thisCtor.name.toLowerCase()}_id`
    const relatedPivot = foreignPivotKey ?? `${relatedModel.constructor.name.toLowerCase()}_id`
    const pivotTable = table ?? `${thisCtor.table}_${relatedCtor.table}`

    return relatedCtor
      .query()
      .join(
        pivotTable,
        `${pivotTable}.${relatedPivot}`,
        '=',
        `${relatedCtor.table}.${relatedCtor.primaryKey}`
      )
      .where(
        `${pivotTable}.${thisPivotKey}`,
        (this as Model & Record<string, unknown>)[thisCtor.primaryKey] as unknown
      ) as QueryBuilderContract<T>
  }

  /**
   * Define a polymorphic one-to-one relationship.
   *
   * @template T - The related model type
   * @param related - The related model constructor
   * @param _name - The relationship name
   * @param type - The type field name on the related model
   * @param id - The ID field name on the related model
   * @returns A query builder for the related model
   */
  morphOne<T extends Model>(
    related: ModelConstructor<T>,
    _name: string,
    type: string,
    id: string
  ): QueryBuilderContract<T> {
    const relatedModel = new related()
    const relatedCtor = relatedModel.constructor as ModelConstructor<T> &
      typeof import('../Model').Model

    const thisCtor = this.constructor as typeof import('../Model').Model
    return relatedCtor
      .query()
      .where(type, thisCtor.name)
      .where(
        id,
        (this as Model & Record<string, unknown>)[thisCtor.primaryKey] as unknown
      ) as QueryBuilderContract<T>
  }

  /**
   * Define a polymorphic one-to-many relationship.
   *
   * @template T - The related model type
   * @param related - The related model constructor
   * @param _name - The relationship name
   * @param type - The type field name on the related model
   * @param id - The ID field name on the related model
   * @returns A query builder for the related model
   */
  morphMany<T extends Model>(
    related: ModelConstructor<T>,
    _name: string,
    type: string,
    id: string
  ): QueryBuilderContract<T> {
    const relatedModel = new related()
    const relatedCtor = relatedModel.constructor as ModelConstructor<T> &
      typeof import('../Model').Model

    const thisCtor = this.constructor as typeof import('../Model').Model
    return relatedCtor
      .query()
      .where(type, thisCtor.name)
      .where(
        id,
        (this as Model & Record<string, unknown>)[thisCtor.primaryKey] as unknown
      ) as QueryBuilderContract<T>
  }

  /**
   * Define a polymorphic inverse relationship.
   *
   * @param name - The relationship name
   * @param type - The type field name on this model
   * @param id - The ID field name on this model
   * @returns A query builder for the resolved model, or null if not resolvable
   */
  morphTo(_name: string, type: string, id: string): QueryBuilderContract<Model> | null {
    const typeName = (this as Model & Record<string, unknown>)[type] as string | undefined
    const idValue = (this as Model & Record<string, unknown>)[id] as unknown

    if (!typeName || !idValue) {
      return null
    }

    // This would need to resolve the actual model class from type
    // For now, return a placeholder
    return null
  }

  /**
   * Lazy load one or more relationships onto the model instance.
   *
   * @param relation - The relationship name or an array of names
   * @returns A promise that resolves to the model instance
   *
   * @example
   * ```typescript
   * await user.load('posts')
   * ```
   */
  async load(relation: string | string[]): Promise<this> {
    const relations = Array.isArray(relation) ? relation : [relation]
    const modelCtor = this.constructor as any

    for (const rel of relations) {
      const relationships = getRelationships(modelCtor)
      if (relationships.has(rel)) {
        // Build and execute the relationship query
        // This is a simplified implementation
        const builderFn = (this as any)[rel]
        if (typeof builderFn === 'function') {
          const query = builderFn.call(this)
          const results = await query.get()

          // For hasMany, set as array
          if (Array.isArray(results)) {
            ;(this as any)._attributes[rel] = results
          } else {
            // For hasOne/belongsTo, set as single value
            ;(this as any)._attributes[rel] = results[0] || null
          }
        }
      }
    }

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
