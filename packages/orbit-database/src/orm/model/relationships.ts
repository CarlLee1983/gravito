/**
 * Relationship Types and Base Classes
 * @description Declarative relationship definitions for ORM
 */

import { DB } from '../../DB'
import type { Model, ModelConstructor } from './Model'

/**
 * Relationship Type
 */
export type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany'

/**
 * Relationship Options
 */
export interface RelationshipOptions {
  foreignKey?: string
  localKey?: string
  pivotTable?: string
  relatedKey?: string
  pivotColumns?: string[]
}

/**
 * Relationship Metadata
 */
export interface RelationshipMeta {
  type: RelationType
  related: () => ModelConstructor<Model> & typeof Model
  foreignKey: string
  localKey: string
  pivotTable?: string | undefined
  relatedKey?: string | undefined
  pivotColumns?: string[] | undefined
}

/**
 * Model Relationships Map
 */
const relationships = new Map<typeof Model, Map<string, RelationshipMeta>>()

/**
 * Get relationships for a model
 */
export function getRelationships(model: typeof Model): Map<string, RelationshipMeta> {
  const map = relationships.get(model)
  if (map) {
    return map
  }

  // Fallback: search for a model with the same name if it's a bound function/proxy
  // This helps when the class identity is lost but the name is preserved or slightly modified
  const modelName = model.name.replace('bound ', '')
  for (const [m, mRels] of relationships.entries()) {
    if (m.name === modelName) {
      return mRels
    }
  }

  return new Map()
}

/**
 * Define a relationship on a model
 */
export function defineRelationship(
  model: typeof Model,
  name: string,
  meta: RelationshipMeta
): void {
  let map = relationships.get(model)
  if (!map) {
    map = new Map()
    relationships.set(model, map)
  }
  map.set(name, meta)
}

// ============================================================================
// Relationship Decorators
// ============================================================================

/**
 * HasOne Relationship Decorator
 * @example
 * ```typescript
 * class User extends Model {
 *   @HasOne(() => Profile)
 *   profile!: Profile
 * }
 * ```
 */
export function HasOne(
  related: () => ModelConstructor<Model> & typeof Model,
  options: Omit<RelationshipOptions, 'pivotTable'> = {}
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const model = target.constructor as typeof Model

    defineRelationship(model, String(propertyKey), {
      type: 'hasOne',
      related,
      foreignKey: options.foreignKey ?? `${model.table.replace(/s$/, '')}_id`,
      localKey: options.localKey ?? model.primaryKey,
    })
  }
}

/**
 * HasMany Relationship Decorator
 * @example
 * ```typescript
 * class User extends Model {
 *   @HasMany(() => Post)
 *   posts!: Post[]
 * }
 * ```
 */
export function HasMany(
  related: () => ModelConstructor<Model> & typeof Model,
  options: Omit<RelationshipOptions, 'pivotTable'> = {}
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const model = target.constructor as typeof Model

    defineRelationship(model, String(propertyKey), {
      type: 'hasMany',
      related,
      foreignKey: options.foreignKey ?? `${model.table.replace(/s$/, '')}_id`,
      localKey: options.localKey ?? model.primaryKey,
    })
  }
}

/**
 * BelongsTo Relationship Decorator
 * @example
 * ```typescript
 * class Post extends Model {
 *   @BelongsTo(() => User)
 *   author!: User
 * }
 * ```
 */
export function BelongsTo(
  related: () => ModelConstructor<Model> & typeof Model,
  options: Omit<RelationshipOptions, 'pivotTable'> = {}
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const model = target.constructor as typeof Model
    const relatedModel = related()

    defineRelationship(model, String(propertyKey), {
      type: 'belongsTo',
      related,
      foreignKey: options.foreignKey ?? `${relatedModel.table.replace(/s$/, '')}_id`,
      localKey: options.localKey ?? relatedModel.primaryKey,
    })
  }
}

/**
 * BelongsToMany Relationship Decorator
 * @example
 * ```typescript
 * class User extends Model {
 *   @BelongsToMany(() => Role, { pivotTable: 'user_roles' })
 *   roles!: Role[]
 * }
 * ```
 */
export function BelongsToMany(
  related: () => ModelConstructor<Model> & typeof Model,
  options: RelationshipOptions = {}
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const model = target.constructor as typeof Model
    const relatedModel = related()

    // Auto-generate pivot table name (alphabetical order)
    const tables = [model.table, relatedModel.table].sort()
    const pivotTable = options.pivotTable ?? `${tables[0]}_${tables[1]}`

    defineRelationship(model, String(propertyKey), {
      type: 'belongsToMany',
      related,
      foreignKey: options.foreignKey ?? `${model.table.replace(/s$/, '')}_id`,
      localKey: options.localKey ?? model.primaryKey,
      pivotTable,
      relatedKey: options.relatedKey ?? `${relatedModel.table.replace(/s$/, '')}_id`,
      pivotColumns: options.pivotColumns,
    })
  }
}

// ============================================================================
// Eager Loading
// ============================================================================

/**
 * Load related models for a collection of parent models
 * Uses batch queries to avoid N+1 problem
 */
export async function eagerLoad<T extends Model>(
  parents: T[],
  relationName: string,
  callback?: (query: any) => void
): Promise<void> {
  if (parents.length === 0) {
    return
  }

  // Handle nested relations (e.g., 'posts.comments')
  const parts = relationName.split('.')
  const currentRelation = parts[0] as string
  const nestedRelation = parts.slice(1).join('.')

  const firstParent = parents[0]
  if (!firstParent) {
    return
  }

  const parentModel = firstParent.constructor as typeof Model
  const rels = getRelationships(parentModel)
  const relationMeta = rels.get(currentRelation)

  if (!relationMeta) {
    throw new Error(`Relationship "${currentRelation}" not found on ${parentModel.name}`)
  }

  const Related = relationMeta.related()
  const { type, foreignKey, localKey } = relationMeta

  // Get parent keys
  const parentKeys = parents.map((p) => (p as any)[localKey])
  const validParentKeys = parentKeys.filter((k) => k !== undefined && k !== null)

  if (validParentKeys.length === 0) {
    return
  }

  // Build and execute the query based on relationship type
  switch (type) {
    case 'hasOne':
    case 'hasMany': {
      const query = Related.query().whereIn(foreignKey, validParentKeys)

      // Apply constraint callback if provided
      if (callback) {
        callback(query)
      }

      // Check if we should use LATERAL optimization (PostgreSQL + limit/offset)
      const connection = DB.connection(Related.connection)
      const grammar = (connection as any).getGrammar?.()

      const useLateral =
        query.hasLimitOrOffset() && grammar && typeof grammar.compileLateralEagerLoad === 'function'

      let models: any[] = []

      if (useLateral) {
        const compiled = query.getCompiledQuery()
        const { sql, bindings } = grammar.compileLateralEagerLoad(
          Related.table,
          foreignKey,
          validParentKeys,
          compiled
        )
        const result = await (connection as any).raw(sql, bindings)
        models = result.rows.map((row: any) => Related.hydrate(row))
      } else {
        // Fallback to whereIn
        query.whereIn(foreignKey, validParentKeys)

        if (nestedRelation) {
          query.with(nestedRelation)
        }

        models = await query.get()
      }

      // Map results back to parents
      const relatedByFk = new Map<unknown, any[]>()
      for (const model of models) {
        const fk = (model as any)[foreignKey]
        if (!relatedByFk.has(fk)) {
          relatedByFk.set(fk, [])
        }
        relatedByFk.get(fk)?.push(model)
      }

      // Assign to parents
      for (const parent of parents) {
        const pk = (parent as any)[localKey]
        const items = relatedByFk.get(pk) ?? []

        if (type === 'hasOne') {
          ;(parent as any)[currentRelation] = items[0] ?? null
        } else {
          ;(parent as any)[currentRelation] = items
        }
      }
      break
    }

    case 'belongsTo': {
      // Get foreign keys from parents
      const fks = parents
        .map((p) => (p as any)[foreignKey])
        .filter((k) => k !== undefined && k !== null)

      if (fks.length === 0) {
        return
      }

      const query = Related.query().whereIn(localKey, fks)

      if (callback) {
        callback(query)
      }

      if (nestedRelation) {
        query.with(nestedRelation)
      }

      const models = await query.get()

      // Map results
      const relatedByPk = new Map<unknown, any>()
      for (const model of models) {
        relatedByPk.set((model as any)[localKey], model)
      }

      // Assign to parents
      for (const parent of parents) {
        const fk = (parent as any)[foreignKey]
        const row = relatedByPk.get(fk)
        ;(parent as any)[currentRelation] = row ?? null
      }
      break
    }

    case 'belongsToMany': {
      const { pivotTable, relatedKey } = relationMeta
      if (!pivotTable || !relatedKey) {
        return
      }

      const connection = DB.connection(Related.connection)

      // 1. Get pivot records
      const pivots = await connection
        .table<Record<string, unknown>>(pivotTable)
        .whereIn(foreignKey, validParentKeys)
        .get()

      // 2. Get related models
      const relatedIds = [...new Set(pivots.map((p) => p[relatedKey]))]
      if (relatedIds.length === 0) {
        return
      }

      const query = Related.query().whereIn(localKey, relatedIds)

      if (callback) {
        callback(query)
      }

      if (nestedRelation) {
        query.with(nestedRelation)
      }

      const models = await query.get()

      // Map related by primary key
      const relatedByPk = new Map<unknown, any>()
      for (const model of models) {
        relatedByPk.set((model as any)[localKey], model)
      }

      // Map pivots by parent FK
      const pivotsByParent = new Map<unknown, unknown[]>()
      for (const pivot of pivots) {
        const pk = pivot[foreignKey]
        if (!pivotsByParent.has(pk)) {
          pivotsByParent.set(pk, [])
        }
        pivotsByParent.get(pk)?.push(pivot[relatedKey])
      }

      // Assign to parents
      for (const parent of parents) {
        const pk = (parent as any)[relationMeta.localKey]
        const relatedPks = pivotsByParent.get(pk) ?? []
        const relatedModels = relatedPks
          .map((rpk) => relatedByPk.get(rpk))
          .filter((r): r is any => r !== undefined)

        ;(parent as any)[currentRelation] = relatedModels
      }
      break
    }
  }
}

/**
 * Load multiple relationships
 */
export async function eagerLoadMany<T extends Model>(
  parents: T[],
  relations: string[] | Record<string, any> | Map<string, (query: any) => void>
): Promise<void> {
  if (relations instanceof Map) {
    for (const [rel, callback] of relations.entries()) {
      await eagerLoad(parents, rel, callback)
    }
  } else if (Array.isArray(relations)) {
    for (const rel of relations) {
      await eagerLoad(parents, rel)
    }
  } else {
    for (const [rel, callbackOrLimit] of Object.entries(relations)) {
      if (typeof callbackOrLimit === 'function') {
        await eagerLoad(parents, rel, callbackOrLimit)
      } else if (typeof callbackOrLimit === 'number') {
        await eagerLoad(parents, rel, (q) => q.limit(callbackOrLimit))
      } else {
        await eagerLoad(parents, rel)
      }
    }
  }
}
