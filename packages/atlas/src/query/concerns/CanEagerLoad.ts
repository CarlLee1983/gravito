import type { QueryBuilderContract } from '../../types'

/**
 * Trait for managing query eager loading.
 *
 * @public
 * @since 3.0.0
 */
export abstract class CanEagerLoad {
  /**
   * Set the relationships to be eager loaded
   */
  with(
    this: any,
    relation: string | string[] | Record<string, (query: QueryBuilderContract<any>) => void>
  ): this {
    if (Array.isArray(relation)) {
      for (const rel of relation) {
        this.eagerLoads.set(rel, () => {})
      }
    } else if (typeof relation === 'string') {
      this.eagerLoads.set(relation, () => {})
    } else {
      for (const [rel, callback] of Object.entries(relation)) {
        this.eagerLoads.set(rel, callback)
      }
    }
    return this
  }

  /**
   * Load relationships for a set of models
   */
  async eagerLoad(this: any, models: any[]): Promise<void> {
    if (models.length === 0 || this.eagerLoads.size === 0) {
      return
    }

    const { eagerLoadMany } = await import('../../orm/model/relationships')
    await eagerLoadMany(models, this.eagerLoads)
  }

  /**
   * Lateral Join Eager Loading (Experimental)
   * Efficiently loads related records using LATERAL JOINs for large datasets
   * Currently supported in Postgres and MySQL 8.0.14+
   */
  async withLateral(
    this: any,
    relationName: string,
    callback?: (query: QueryBuilderContract<any>) => void
  ): Promise<this> {
    const modelCtor = this.getModel()
    if (!modelCtor) {
      throw new Error('Lateral loading requires a model to be set on the query builder')
    }

    const { getRelationships } = await import('../../orm/model/relationships')
    const relationships = getRelationships(modelCtor)
    const relation = relationships.get(relationName)

    if (!relation) {
      throw new Error(`Relationship [${relationName}] not found on model [${modelCtor.name}]`)
    }

    if (relation.type === 'hasMany' || relation.type === 'hasOne') {
      return this.addLateralJoin(relationName, relation, callback)
    }

    throw new Error(`Lateral loading is not yet supported for [${relation.type}] relationships`)
  }

  /**
   * Add a LATERAL JOIN for a relation
   */
  protected addLateralJoin(
    this: any,
    relationName: string,
    relation: any,
    callback?: (query: QueryBuilderContract<any>) => void
  ): this {
    const relatedCtor = relation.related()
    const table = relatedCtor.getTable()
    const fk = relation.options.foreignKey || `${this.tableName.replace(/s$/, '')}_id`
    const lk = relation.options.localKey || (this.getModel() as any).primaryKey

    // Create subquery for the lateral join
    const subQuery = this.connection
      .table(table)
      .whereColumn(`${table}.${fk}`, '=', `${this.tableName}.${lk}`)

    if (callback) {
      callback(subQuery)
    }

    // Apply lateral join via grammar
    const lateralSql = this.grammar.compileLateralJoin(subQuery.getCompiledQuery(), relationName)

    // We use a raw join for now as QueryBuilder doesn't have a specific lateralJoin method
    return this.joinRaw(lateralSql)
  }

  /**
   * Add a raw JOIN clause
   */
  joinRaw(this: any, sql: string, bindings: unknown[] = []): this {
    this.joins.push({
      type: 'raw',
      sql,
      bindings,
      table: '',
      first: '',
      operator: '',
      second: '',
    } as any)
    this.bindingsList.push(...bindings)
    return this
  }
}
