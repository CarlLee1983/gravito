import { DB } from '../../../DB'
import { COLUMN_KEY, SOFT_DELETES_KEY } from '../decorators'
import type { Model, ModelAttributes } from '../Model'

/**
 * Trait for managing model persistence (save, delete, refresh).
 *
 * @public
 * @since 3.0.0
 */
export abstract class HasPersistence {
  /**
   * Save the model (insert or update)
   */
  async save(this: any): Promise<this> {
    await this.emit('saving')

    for (const key of this._dirtyTracker.getDirty()) {
      await this._validateAttribute(key as string, this._attributes[key as string])
    }

    let result: this
    if (this._exists) {
      result = await this._performUpdate()
    } else {
      result = await this._performInsert()
    }

    await this.emit('saved')
    return result
  }

  /**
   * Perform insert
   */
  protected async _performInsert(this: any): Promise<this> {
    const modelCtor = this.constructor as typeof Model
    const connection = DB.connection(modelCtor.connection)

    await this.emit('creating')

    if (modelCtor.timestamps) {
      const now = new Date()
      if (!this._attributes[modelCtor.createdAtColumn]) {
        this._setAttribute(modelCtor.createdAtColumn, now)
      }
      if (modelCtor.timestamps !== 'created_only' && !this._attributes[modelCtor.updatedAtColumn]) {
        this._setAttribute(modelCtor.updatedAtColumn, now)
      }
    }

    const columns = (modelCtor as any)[COLUMN_KEY]
    if (columns) {
      for (const [prop, options] of Object.entries(columns)) {
        if ((options as any).autoCreate && !this._attributes[prop]) {
          this._setAttribute(prop, new Date())
        }
      }
    }

    const result = await connection
      .table<ModelAttributes>(modelCtor.getTable())
      .insert(this._attributes)

    if (Array.isArray(result) && result.length > 0) {
      const pk = result[0]
      if (typeof pk === 'object' && pk !== null) {
        this._attributes[modelCtor.primaryKey] = (pk as Record<string, unknown>)[
          modelCtor.primaryKey
        ]
      } else {
        this._attributes[modelCtor.primaryKey] = pk
      }
    }

    this._exists = true
    this._dirtyTracker.sync(this._attributes)

    await this.emit('created')
    return this
  }

  /**
   * Perform update
   */
  protected async _performUpdate(this: any): Promise<this> {
    const modelCtor = this.constructor as typeof Model
    const connection = DB.connection(modelCtor.connection)

    await this.emit('updating')

    if (modelCtor.timestamps && modelCtor.timestamps !== 'created_only') {
      this._setAttribute(modelCtor.updatedAtColumn, new Date())
    }

    const columns = (modelCtor as any)[COLUMN_KEY]
    if (columns) {
      for (const [prop, options] of Object.entries(columns)) {
        if ((options as any).autoUpdate) {
          this._setAttribute(prop, new Date())
        }
      }
    }

    const dirty = this.getDirty()
    if (Object.keys(dirty).length === 0) {
      return this
    }

    await connection
      .table(modelCtor.getTable())
      .where(modelCtor.primaryKey, this.getKey())
      .update(dirty)

    this._dirtyTracker.sync(this._attributes)

    await this.emit('updated')
    return this
  }

  /**
   * Delete the model
   */
  async delete(this: any): Promise<boolean> {
    if (!this._exists) return false

    await this.emit('deleting')

    const modelCtor = this.constructor as any
    const softDeletes = modelCtor[SOFT_DELETES_KEY]
    let result: boolean

    if (softDeletes) {
      const column = softDeletes.column || 'deleted_at'
      this._setAttribute(column, new Date())
      await this.save()
      result = true
    } else {
      const connection = DB.connection(modelCtor.connection)
      const affected = await connection
        .table(modelCtor.getTable())
        .where(modelCtor.primaryKey, this.getKey())
        .delete()
      result = affected > 0
    }

    if (result) {
      this._exists = !softDeletes
      await this.emit('deleted')
    }

    return result
  }

  /**
   * Restore a soft deleted model
   */
  async restore(this: any): Promise<boolean> {
    const modelCtor = this.constructor as any
    const softDeletes = modelCtor[SOFT_DELETES_KEY]
    if (!softDeletes) return false

    const column = softDeletes.column || 'deleted_at'
    this._setAttribute(column, null)
    await this.save()
    return true
  }

  /**
   * Force delete a soft deleted model physically
   */
  async forceDelete(this: any): Promise<boolean> {
    const modelCtor = this.constructor as any
    const connection = DB.connection(modelCtor.connection)
    const affected = await connection
      .table(modelCtor.getTable())
      .where(modelCtor.primaryKey, this.getKey())
      .forceDelete()

    if (affected > 0) {
      this._exists = false
      await this.emit('deleted')
      return true
    }

    return false
  }

  /**
   * Refresh the model from database
   */
  async refresh(this: any): Promise<this> {
    if (!this._exists) return this

    const modelCtor = this.constructor as typeof Model
    const connection = DB.connection(modelCtor.connection)

    const row = await connection
      .table<ModelAttributes>(modelCtor.getTable())
      .where(modelCtor.primaryKey, this.getKey())
      .first()

    if (row) {
      this._attributes = row
      this._dirtyTracker.sync(row)
    }

    return this
  }
}
