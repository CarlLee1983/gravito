/**
 * HasPersistence Concern
 * @description Provides database persistence functionality including saving, deleting, and refreshing.
 */
export class HasPersistence {
  /**
   * Indicates if the model exists in the database.
   * @internal
   */
  protected _exists = false

  /**
   * Check if the model instance exists in the database.
   *
   * @returns True if the model has been persisted
   */
  exists(): boolean {
    return this._exists
  }

  /**
   * Save the model instance to the database (insert or update).
   *
   * @returns A promise that resolves to the model instance
   *
   * @example
   * ```typescript
   * await user.save()
   * ```
   */
  async save(): Promise<this> {
    if (this._exists) {
      return this._performUpdate()
    } else {
      return this._performInsert()
    }
  }

  /**
   * Perform an insert operation for a new model instance.
   *
   * @returns A promise that resolves to the model instance
   * @internal
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
   * Perform an update operation for an existing model instance.
   *
   * @returns A promise that resolves to the model instance
   * @internal
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
   * Delete the model instance from the database.
   * Supports soft deletes if configured on the model.
   *
   * @returns A promise that resolves to true if deleted successfully
   *
   * @example
   * ```typescript
   * await user.delete()
   * ```
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
   * Perform a soft delete operation.
   *
   * @returns A promise that resolves to true
   * @internal
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
   * Perform a hard delete operation (physical removal).
   *
   * @returns A promise that resolves to true
   * @internal
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
   * Restore a soft-deleted model instance.
   *
   * @returns A promise that resolves to true
   *
   * @example
   * ```typescript
   * await user.restore()
   * ```
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
   * Force a hard delete even if soft deletes are enabled.
   *
   * @returns A promise that resolves to true
   *
   * @example
   * ```typescript
   * await user.forceDelete()
   * ```
   */
  async forceDelete(): Promise<boolean> {
    return this._performHardDelete()
  }

  /**
   * Refresh the model instance with fresh data from the database.
   *
   * @returns A promise that resolves to the model instance
   *
   * @example
   * ```typescript
   * await user.refresh()
   * ```
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
   * Emit a model lifecycle event.
   *
   * @param event - The event name
   * @internal
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
