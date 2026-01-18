/**
 * HasPersistence Concern
 *
 * Provides database persistence functionality including:
 * - Saving (insert/update)
 * - Deleting (soft/hard)
 * - Refreshing
 */

export class HasPersistence {
  protected _exists = false

  /**
   * Check if model exists in database
   *
   * @returns True if exists
   */
  exists(): boolean {
    return this._exists
  }

  /**
   * Save model (insert or update)
   *
   * @returns This model instance
   */
  async save(): Promise<this> {
    if (this._exists) {
      return this._performUpdate()
    } else {
      return this._performInsert()
    }
  }

  /**
   * Perform insert operation
   *
   * @returns This model instance
   */
  protected async _performInsert(): Promise<this> {
    const modelCtor = this.constructor as any

    // Trigger 'creating' event
    await this.emit('creating')

    // Get attributes to insert (from HasAttributes concern)
    const getDirtyAttributes = (this as any).getDirtyAttributes || (() => ({}) as any)
    const attributes = getDirtyAttributes.call(this)

    // Auto-manage timestamps
    if (modelCtor.timestamps) {
      const now = new Date()
      if (modelCtor.timestamps !== 'created_only') {
        attributes[modelCtor.updatedAtColumn] = now
      }
      attributes[modelCtor.createdAtColumn] = now
    }

    // Build query
    const primaryKey = modelCtor.primaryKey || 'id'
    const { DB } = await import('../../../DB')

    // Insert
    const result = await DB.table(modelCtor.table).insert(attributes)

    // Set primary key if returned
    if (result?.[primaryKey]) {
      ;(this as any)[primaryKey] = result[primaryKey]
    }

    // Mark as existing
    this._exists = true

    // Sync dirty tracker
    const dirtyTracker = (this as any)._dirtyTracker
    if (dirtyTracker) {
      const getAttributes = (this as any).getAttributes || (() => ({}) as any)
      dirtyTracker.sync(getAttributes.call(this))
    }

    // Trigger 'created' event
    await this.emit('created')

    return this
  }

  /**
   * Perform update operation
   *
   * @returns This model instance
   */
  protected async _performUpdate(): Promise<this> {
    const modelCtor = this.constructor as any

    // Get attributes to update
    const getDirtyAttributes = (this as any).getDirtyAttributes || (() => ({}) as any)
    const attributes = getDirtyAttributes.call(this)

    // Skip if no changes
    if (Object.keys(attributes).length === 0) {
      return this
    }

    // Trigger 'updating' event
    await this.emit('updating')

    // Auto-manage timestamps
    if (modelCtor.timestamps && modelCtor.timestamps !== 'created_only') {
      attributes[modelCtor.updatedAtColumn] = new Date()
    }

    // Build query
    const primaryKey = modelCtor.primaryKey || 'id'
    const { DB } = await import('../../../DB')

    // Update
    await DB.table(modelCtor.table)
      .where(primaryKey, (this as any)[primaryKey])
      .update(attributes)

    // Sync dirty tracker
    const dirtyTracker = (this as any)._dirtyTracker
    if (dirtyTracker) {
      const getAttributes = (this as any).getAttributes || (() => ({}) as any)
      dirtyTracker.sync(getAttributes.call(this))
    }

    // Trigger 'updated' event
    await this.emit('updated')

    return this
  }

  /**
   * Delete model (soft if enabled, otherwise hard)
   *
   * @returns True if deleted
   */
  async delete(): Promise<boolean> {
    const modelCtor = this.constructor as any

    // Check if soft deletes are enabled
    const softDeletes = modelCtor.softDeletes || false

    if (softDeletes) {
      return this._performSoftDelete()
    } else {
      return this._performHardDelete()
    }
  }

  /**
   * Perform soft delete
   *
   * @returns True if deleted
   */
  protected async _performSoftDelete(): Promise<boolean> {
    const modelCtor = this.constructor as any

    // Trigger 'deleting' event
    await this.emit('deleting')

    // Set deleted at timestamp
    const deletedAtColumn = modelCtor.deletedAtColumn || 'deleted_at'
    ;(this as any)[deletedAtColumn] = new Date()

    // Update record
    await this.save()

    // Trigger 'deleted' event
    await this.emit('deleted')

    return true
  }

  /**
   * Perform hard delete
   *
   * @returns True if deleted
   */
  protected async _performHardDelete(): Promise<boolean> {
    const modelCtor = this.constructor as any

    // Trigger 'deleting' event
    await this.emit('deleting')

    // Build query
    const primaryKey = modelCtor.primaryKey || 'id'
    const { DB } = await import('../../../DB')

    // Delete
    await DB.table(modelCtor.table)
      .where(primaryKey, (this as any)[primaryKey])
      .delete()

    // Mark as not existing
    this._exists = false

    // Trigger 'deleted' event
    await this.emit('deleted')

    return true
  }

  /**
   * Restore soft-deleted model
   *
   * @returns True if restored
   */
  async restore(): Promise<boolean> {
    const modelCtor = this.constructor as any

    // Set deleted at to null
    const deletedAtColumn = modelCtor.deletedAtColumn || 'deleted_at'
    ;(this as any)[deletedAtColumn] = null

    // Save
    await this.save()

    return true
  }

  /**
   * Force hard delete (even if soft deletes enabled)
   *
   * @returns True if deleted
   */
  async forceDelete(): Promise<boolean> {
    return this._performHardDelete()
  }

  /**
   * Refresh model from database
   *
   * @returns This model instance
   */
  async refresh(): Promise<this> {
    const modelCtor = this.constructor as any
    const primaryKey = modelCtor.primaryKey || 'id'
    const primaryValue = (this as any)[primaryKey]

    if (!primaryValue) {
      return this
    }

    // Fetch from database
    const { DB } = await import('../../../DB')
    const row = await DB.table(modelCtor.table).where(primaryKey, primaryValue).first()

    if (row) {
      // Update attributes (from HasAttributes concern)
      const _attributes = (this as any)._attributes
      if (_attributes) {
        Object.assign(_attributes, row)
      }

      // Sync dirty tracker
      const dirtyTracker = (this as any)._dirtyTracker
      if (dirtyTracker) {
        const getAttributes = (this as any).getAttributes || (() => ({}) as any)
        dirtyTracker.sync(getAttributes.call(this))
      }
    }

    return this
  }

  /**
   * Emit model event
   *
   * @param event - Event name
   */
  protected async emit(event: string): Promise<void> {
    const modelCtor = this.constructor as any
    const observers = modelCtor.observers || []

    for (const observer of observers) {
      if (typeof observer[event] === 'function') {
        await observer[event](this)
      }
    }
  }
}
