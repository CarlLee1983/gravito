import { DB } from '../../../DB'
import { COLUMN_KEY, SOFT_DELETES_KEY, VERSION_KEY } from '../decorators'
import { StaleModelError } from '../errors'

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
  get exists(): boolean {
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
    // Trigger saving event
    await (this as any).emit('saving')

    // Validate all dirty attributes
    const dirtyTracker = (this as any)._dirtyTracker
    if (dirtyTracker) {
      const dirtyKeys = dirtyTracker.getDirty()
      const attributes = (this as any)._attributes || {}
      for (const key of dirtyKeys) {
        const validateAttribute = (this as any)._validateAttribute
        if (validateAttribute) {
          await validateAttribute.call(this, key as string, attributes[key as string])
        }
      }
    }

    let result: this
    if (this._exists) {
      result = await this._performUpdate()
    } else {
      result = await this._performInsert()
    }

    // Trigger saved event
    await (this as any).emit('saved')
    return result
  }

  /**
   * Perform an insert operation for a new model instance.
   *
   * @returns A promise that resolves to the model instance
   * @internal
   */
  protected async _performInsert(): Promise<this> {
    const modelCtor = this.constructor as any
    const connection = DB.connection(modelCtor.connection)

    // Trigger 'creating' event
    await (this as any).emit('creating')

    // Handle Timestamps
    if (modelCtor.timestamps) {
      const now = new Date()
      if (!(this as any)._attributes[modelCtor.createdAtColumn]) {
        ;(this as any)._setAttribute(modelCtor.createdAtColumn, now)
      }
      // Only set updated_at if timestamps is not 'created_only'
      if (
        modelCtor.timestamps !== 'created_only' &&
        !(this as any)._attributes[modelCtor.updatedAtColumn]
      ) {
        ;(this as any)._setAttribute(modelCtor.updatedAtColumn, now)
      }
    }

    // Handle @column(autoCreate)
    const columns = (modelCtor as any)[COLUMN_KEY]
    if (columns) {
      for (const [prop, options] of Object.entries(columns)) {
        if ((options as any).autoCreate && !(this as any)._attributes[prop]) {
          ;(this as any)._setAttribute(prop, new Date())
        }
      }
    }

    const versionKey = (modelCtor as any)[VERSION_KEY] as string | undefined
    if (versionKey && (this as any)._attributes[versionKey] === undefined) {
      ;(this as any)._setAttribute(versionKey, 1)
    }

    const result = await connection.table(modelCtor.getTable()).insert((this as any)._attributes)

    // Set primary key from result
    if (Array.isArray(result) && result.length > 0) {
      const pk = result[0]
      if (typeof pk === 'object' && pk !== null) {
        // Merge all returned attributes (e.g. version, timestamps)
        Object.assign((this as any)._attributes, pk)
      } else {
        ;(this as any)._attributes[modelCtor.primaryKey] = pk
      }
    } else if ((this as any)._attributes[modelCtor.primaryKey] === undefined) {
      // Fallback: If result is empty but we don't have an ID, try to get it
      // This helps with drivers that don't support RETURNING or return empty results
      try {
        const lastId = await connection.table(modelCtor.getTable()).max(modelCtor.primaryKey)
        if (lastId) {
          ;(this as any)._attributes[modelCtor.primaryKey] = lastId
        }
      } catch (_e) {
        // Ignore fallback errors
      }
    }

    this._exists = true
    const dirtyTracker = (this as any)._dirtyTracker
    if (dirtyTracker) {
      dirtyTracker.sync((this as any)._attributes)
    }

    // Trigger 'created' event
    await (this as any).emit('created')

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
    const connection = DB.connection(modelCtor.connection)

    // Trigger 'updating' event
    await (this as any).emit('updating')

    // Handle Timestamps
    // Only update updated_at if timestamps is enabled and not 'created_only'
    if (modelCtor.timestamps && modelCtor.timestamps !== 'created_only') {
      ;(this as any)._setAttribute(modelCtor.updatedAtColumn, new Date())
    }

    // Handle @column(autoUpdate)
    const columns = (modelCtor as any)[COLUMN_KEY]
    if (columns) {
      for (const [prop, options] of Object.entries(columns)) {
        if ((options as any).autoUpdate) {
          ;(this as any)._setAttribute(prop, new Date())
        }
      }
    }

    const versionKey = (modelCtor as any)[VERSION_KEY] as string | undefined
    let currentVersion: unknown

    if (versionKey) {
      currentVersion = (this as any)._attributes[versionKey]
      if (currentVersion === undefined || currentVersion === null) {
        currentVersion = 1
      }
      if (typeof currentVersion === 'number') {
        ;(this as any)._setAttribute(versionKey, currentVersion + 1)
      }
    }

    const getDirty = (this as any).getDirty || (() => ({}) as any)
    const dirty = getDirty.call(this)
    if (Object.keys(dirty).length === 0) {
      return this
    }

    const query = connection
      .table(modelCtor.getTable())
      .where(modelCtor.primaryKey, (this as any).getKey())

    // Add version check
    if (versionKey && currentVersion !== undefined) {
      query.where(versionKey, currentVersion)
    }

    const affected = await query.update(dirty)

    // Check for Stale Object
    if (versionKey && affected === 0) {
      throw new StaleModelError(modelCtor.name, (this as any).getKey())
    }

    const dirtyTracker = (this as any)._dirtyTracker
    if (dirtyTracker) {
      dirtyTracker.sync((this as any)._attributes)
    }

    // Trigger 'updated' event
    await (this as any).emit('updated')

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
    if (!this._exists) {
      return false
    }

    await (this as any).emit('deleting')

    const modelCtor = this.constructor as any
    const softDeletes = modelCtor[SOFT_DELETES_KEY]
    let result: boolean

    if (softDeletes) {
      const column = softDeletes.column || 'deleted_at'
      ;(this as any)._setAttribute(column, new Date())
      await this.save()
      result = true
    } else {
      const connection = DB.connection(modelCtor.connection)
      const affected = await connection
        .table(modelCtor.getTable())
        .where(modelCtor.primaryKey, (this as any).getKey())
        .delete()
      result = affected > 0
    }
    if (result) {
      this._exists = !softDeletes
      await (this as any).emit('deleted')
    }

    return result
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
    const softDeletes = modelCtor[SOFT_DELETES_KEY]
    if (!softDeletes) {
      return false
    }

    const column = softDeletes.column || 'deleted_at'
    ;(this as any)._setAttribute(column, null)
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
    const modelCtor = this.constructor as any
    const connection = DB.connection(modelCtor.connection)
    const affected = await connection
      .table(modelCtor.getTable())
      .where(modelCtor.primaryKey, (this as any).getKey())
      .forceDelete()

    if (affected > 0) {
      this._exists = false
      await (this as any).emit('deleted')
      return true
    }

    return false
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
    const connection = DB.connection(modelCtor.connection)
    const row = await connection.table(modelCtor.getTable()).where(primaryKey, primaryValue).first()

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
}
