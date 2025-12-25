/**
 * Model Module Index
 */

export { DirtyTracker } from './DirtyTracker'
export { column, SoftDeletes } from './decorators'
export {
  ColumnNotFoundError,
  ModelNotFoundError,
  NullableConstraintError,
  TypeMismatchError,
} from './errors'
export { Model, type ModelAttributes, type ModelConstructor, type ModelStatic } from './Model'
export { ModelRegistry } from './ModelRegistry'
export {
  BelongsTo,
  BelongsToMany,
  eagerLoad,
  eagerLoadMany,
  getRelationships,
  HasMany,
  HasOne,
  MorphMany,
  MorphOne,
  MorphTo,
  type RelationshipMeta,
  type RelationshipOptions,
  type RelationType,
} from './relationships'
