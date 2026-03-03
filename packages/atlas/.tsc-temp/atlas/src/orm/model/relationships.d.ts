/**
 * Relationship Types and Base Classes
 * @description Declarative relationship definitions for ORM
 */
import type { QueryBuilderContract } from '../../types'
import type { Model, ModelConstructor } from './Model'
/**
 * Relationship Type
 */
export type RelationType =
  | 'hasOne'
  | 'hasMany'
  | 'belongsTo'
  | 'belongsToMany'
  | 'morphOne'
  | 'morphMany'
  | 'morphTo'
/**
 * Options for defining relationships between models.
 */
export interface RelationshipOptions {
  /**
   * The foreign key column name.
   * - For `HasOne`/`HasMany`: Defaults to `parent_table_id` on the related table.
   * - For `BelongsTo`: Defaults to `related_table_id` on the local table.
   * - For `BelongsToMany`: Defaults to `parent_table_id` on the pivot table.
   */
  foreignKey?: string
  /**
   * The local key column name.
   * - For `HasOne`/`HasMany`: Defaults to the primary key of the local table.
   * - For `BelongsTo`: Defaults to the primary key of the related table.
   */
  localKey?: string
  /**
   * The name of the pivot table for many-to-many relationships.
   * Defaults to an alphabetical concatenation of the two table names (e.g., `roles_users`).
   */
  pivotTable?: string
  /**
   * The related key column name in the pivot table.
   * Defaults to `related_table_id`.
   */
  relatedKey?: string
  /**
   * Additional columns to select from the pivot table.
   */
  pivotColumns?: string[]
}
/**
 * Relationship Metadata
 */
export interface RelationshipMeta {
  type: RelationType
  related?: () => ModelConstructor<Model> & typeof Model
  foreignKey?: string
  localKey?: string
  pivotTable?: string | undefined
  relatedKey?: string | undefined
  pivotColumns?: string[] | undefined
  morphName?: string
  morphTypeField?: string
  morphIdField?: string
}
/**
 * Get relationships for a model
 */
export declare function getRelationships(model: typeof Model): Map<string, RelationshipMeta>
/**
 * Define a relationship on a model
 */
export declare function defineRelationship(
  model: typeof Model,
  name: string,
  meta: RelationshipMeta
): void
/**
 * HasOne Relationship Decorator
 *
 * Defines a one-to-one relationship where the related model's table
 * contains the foreign key.
 *
 * @param related - A factory function that returns the related Model class.
 * @param options - Configuration for the relationship.
 *
 * @example
 * ```typescript
 * class User extends Model {
 *   @HasOne(() => Profile)
 *   declare profile: Profile
 * }
 * ```
 */
export declare function HasOne(
  related: () => ModelConstructor<Model> & typeof Model,
  options?: Omit<RelationshipOptions, 'pivotTable'>
): PropertyDecorator
/**
 * HasMany Relationship Decorator
 *
 * Defines a one-to-many relationship where the related model's table
 * contains the foreign key.
 *
 * @param related - A factory function that returns the related Model class.
 * @param options - Configuration for the relationship.
 *
 * @example
 * ```typescript
 * class User extends Model {
 *   @HasMany(() => Post)
 *   declare posts: Post[]
 * }
 * ```
 */
export declare function HasMany(
  related: () => ModelConstructor<Model> & typeof Model,
  options?: Omit<RelationshipOptions, 'pivotTable'>
): PropertyDecorator
/**
 * BelongsTo Relationship Decorator
 *
 * Defines an inverse relationship where the local model's table
 * contains the foreign key.
 *
 * @param related - A factory function that returns the related Model class.
 * @param options - Configuration for the relationship.
 *
 * @example
 * ```typescript
 * class Post extends Model {
 *   @BelongsTo(() => User)
 *   declare author: User
 * }
 * ```
 */
export declare function BelongsTo(
  related: () => ModelConstructor<Model> & typeof Model,
  options?: Omit<RelationshipOptions, 'pivotTable'>
): PropertyDecorator
/**
 * BelongsToMany Relationship Decorator
 *
 * Defines a many-to-many relationship using a pivot table.
 *
 * @param related - A factory function that returns the related Model class.
 * @param options - Configuration for the relationship, including pivot table details.
 *
 * @example
 * ```typescript
 * class User extends Model {
 *   @BelongsToMany(() => Role, { pivotTable: 'user_roles' })
 *   declare roles: Role[]
 * }
 * ```
 */
export declare function BelongsToMany(
  related: () => ModelConstructor<Model> & typeof Model,
  options?: RelationshipOptions
): PropertyDecorator
/**
 * MorphOne Relationship Decorator
 *
 * Defines a polymorphic one-to-one relationship.
 *
 * @param related - A factory function that returns the related Model class.
 * @param name - The name of the polymorphic relationship (e.g., 'imageable').
 * @param options - Configuration for the relationship.
 *
 * @example
 * ```typescript
 * class Post extends Model {
 *   @MorphOne(() => Image, 'imageable')
 *   declare image: Image
 * }
 * ```
 */
export declare function MorphOne(
  related: () => ModelConstructor<Model> & typeof Model,
  name: string,
  options?: {
    foreignKey?: string
    localKey?: string
  }
): PropertyDecorator
/**
 * MorphMany Relationship Decorator
 *
 * Defines a polymorphic one-to-many relationship.
 *
 * @param related - A factory function that returns the related Model class.
 * @param name - The name of the polymorphic relationship (e.g., 'commentable').
 * @param options - Configuration for the relationship.
 *
 * @example
 * ```typescript
 * class Post extends Model {
 *   @MorphMany(() => Comment, 'commentable')
 *   declare comments: Comment[]
 * }
 * ```
 */
export declare function MorphMany(
  related: () => ModelConstructor<Model> & typeof Model,
  name: string,
  options?: {
    foreignKey?: string
    localKey?: string
  }
): PropertyDecorator
/**
 * MorphTo Relationship Decorator
 *
 * Defines the inverse of a polymorphic relationship.
 *
 * @param options - Configuration for the polymorphic relationship.
 *
 * @example
 * ```typescript
 * class Comment extends Model {
 *   @MorphTo()
 *   declare commentable: Post | Video
 * }
 * ```
 */
export declare function MorphTo(options?: {
  name?: string
  typeField?: string
  idField?: string
}): PropertyDecorator
/**
 * Load related models for a collection of parent models
 * Uses batch queries to avoid N+1 problem
 */
export declare function eagerLoad<T extends Model, R extends Model = Model>(
  parents: T[],
  relationName: string,
  callback?: (query: QueryBuilderContract<R>) => void
): Promise<void>
/**
 * Load multiple relationships
 */
export declare function eagerLoadMany<T extends Model, R extends Model = Model>(
  parents: T[],
  relations:
    | string[]
    | Record<string, unknown>
    | Map<string, (query: QueryBuilderContract<R>) => void>
): Promise<void>
