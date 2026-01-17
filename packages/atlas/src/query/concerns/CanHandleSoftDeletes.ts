/**
 * Trait for managing Soft Deletes in QueryBuilder.
 *
 * @public
 * @since 3.0.0
 */
export abstract class CanHandleSoftDeletes {
  /**
   * Include soft deleted records in the query
   */
  withTrashed(this: any): this {
    this.withoutGlobalScope('softDeletes')
    return this
  }

  /**
   * Only include soft deleted records in the query
   */
  onlyTrashed(this: any): this {
    this.withTrashed()
    const model = this.getModel()
    const column = (model as any)?.softDeleteColumn || 'deleted_at'
    return this.whereNotNull(column)
  }

  /**
   * Restore soft deleted records
   */
  async restore(this: any): Promise<number> {
    const model = this.getModel()
    const column = (model as any)?.softDeleteColumn || 'deleted_at'
    return this.withTrashed().update({ [column]: null } as any)
  }

  /**
   * Force delete records (physical delete)
   */
  async forceDelete(this: any): Promise<number> {
    return this.withTrashed().delete()
  }
}
