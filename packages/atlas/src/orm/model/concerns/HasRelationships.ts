/**
 * HasRelationships Concern
 *
 * Provides relationship management functionality including:
 * - Defining relationships
 * - Loading relationships
 * - Eager loading
 */

import { getRelationships } from '../relationships'

export class HasRelationships {
  /**
   * Define a hasMany relationship
   *
   * @param related - Related model class
   * @param foreignKey - Foreign key on related model
   * @param localKey - Local key on this model
   * @returns Query builder for relationship
   */
  hasMany(related: any, foreignKey?: string, localKey?: string): any {
    const relatedModel = new related()
    const relatedCtor = relatedModel.constructor as any

    const foreign = foreignKey ?? `${this.constructor.name.toLowerCase()}_id`
    const local = localKey ?? (this.constructor as any).primaryKey

    return relatedCtor.query().where(foreign, (this as any)[local])
  }

  /**
   * Define a belongsTo relationship
   *
   * @param related - Related model class
   * @param foreignKey - Foreign key on this model
   * @param ownerKey - Owner key on related model
   * @returns Query builder for relationship
   */
  belongsTo(related: any, foreignKey?: string, ownerKey?: string): any {
    const relatedModel = new related()
    const relatedCtor = relatedModel.constructor as any

    const foreign = foreignKey ?? `${relatedModel.constructor.name.toLowerCase()}_id`
    const owner = ownerKey ?? relatedCtor.primaryKey

    return relatedCtor.where(owner, (this as any)[foreign])
  }

  /**
   * Define a belongsToMany relationship (many-to-many)
   *
   * @param related - Related model class
   * @param foreignPivotKey - Foreign key on pivot table for related model
   * @param relatedPivotKey - Foreign key on pivot table for this model
   * @param table - Pivot table name
   * @returns Query builder for relationship
   */
  belongsToMany(
    related: any,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    table?: string
  ): any {
    const relatedModel = new related()
    const relatedCtor = relatedModel.constructor as any

    const thisCtor = this.constructor as any
    const thisPivotKey = relatedPivotKey ?? `${thisCtor.name.toLowerCase()}_id`
    const relatedPivot = foreignPivotKey ?? `${relatedModel.constructor.name.toLowerCase()}_id`
    const pivotTable = table ?? `${thisCtor.table}_${relatedCtor.table}`

    return relatedCtor
      .query()
      .join(
        pivotTable,
        `${pivotTable}.${relatedPivot}`,
        `${relatedCtor.table}.${relatedCtor.primaryKey}`
      )
      .where(`${pivotTable}.${thisPivotKey}`, (this as any)[thisCtor.primaryKey])
  }

  /**
   * Define a morphOne relationship
   *
   * @param related - Related model class
   * @param name - Relationship name
   * @param type - Type field name
   * @param id - ID field name
   * @returns Query builder for relationship
   */
  morphOne(related: any, name: string, type: string, id: string): any {
    const relatedModel = new related()
    const relatedCtor = relatedModel.constructor as any

    return relatedCtor
      .query()
      .where(type, this.constructor.name)
      .where(id, (this as any)[(this.constructor as any).primaryKey])
  }

  /**
   * Define a morphMany relationship
   *
   * @param related - Related model class
   * @param name - Relationship name
   * @param type - Type field name
   * @param id - ID field name
   * @returns Query builder for relationship
   */
  morphMany(related: any, name: string, type: string, id: string): any {
    const relatedModel = new related()
    const relatedCtor = relatedModel.constructor as any

    return relatedCtor
      .query()
      .where(type, this.constructor.name)
      .where(id, (this as any)[(this.constructor as any).primaryKey])
  }

  /**
   * Define a morphTo relationship
   *
   * @param name - Relationship name
   * @param type - Type field name
   * @param id - ID field name
   * @returns Query builder for the relationship
   */
  morphTo(name: string, type: string, id: string): any {
    const typeName = (this as any)[type]
    const idValue = (this as any)[id]

    if (!typeName || !idValue) {
      return null
    }

    // This would need to resolve the actual model class from type
    // For now, return a placeholder
    return null
  }

  /**
   * Eager load relationship(s)
   *
   * @param relations - Relationship name(s)
   * @returns This model instance
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
   * Load relationships and return new instance
   *
   * @param relations - Relationship name(s)
   * @returns New model instance with loaded relationships
   */
  async with(relation: string | string[]): Promise<this> {
    return this.load(relation)
  }
}
