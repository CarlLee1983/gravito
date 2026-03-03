import type { Model, ModelConstructor } from '../Model'
/**
 * HasRelationships Concern
 * @description Provides relationship management functionality including defining and loading relationships.
 */
export declare class HasRelationships {
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
  ): any
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
  ): any
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
  ): any
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
  belongsToMany<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    pivotTable: string,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    localKey?: string,
    relatedKey?: string
  ): Promise<R[]>
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
  hasManyStream<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    chunkSize?: number,
    localKey?: string
  ): AsyncGenerator<R[], void, unknown>
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
  ): any
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
  ): any
  /**
   * Define a polymorphic inverse relationship.
   *
   * @template R - The related model type.
   * @param name - The polymorphic relationship name.
   * @param typeField - Optional explicit type field name.
   * @param idField - Optional explicit ID field name.
   * @returns A QueryBuilder for the resolved related model, or null if not resolvable.
   */
  morphTo<R extends Model>(name: string, typeField?: string, idField?: string): any
  /**
   * Lazy load relationships for the current model
   * @example await user.load('posts')
   */
  load(relation: string | string[]): Promise<this>
  /**
   * Alias for load(), used for fluent eager loading on an instance.
   *
   * @param relation - The relationship name or an array of names
   * @returns A promise that resolves to the model instance
   */
  with(relation: string | string[]): Promise<this>
}
