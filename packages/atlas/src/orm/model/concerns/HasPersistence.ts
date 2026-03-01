import { DB } from '../../../DB'
import { COLUMN_KEY, SHARDED_KEY, SOFT_DELETES_KEY, VERSION_KEY } from '../decorators'
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
   * Internal helper to retrieve the correct connection depending on sharding configuration
   * @internal
   */
  protected _getConnection(): import('../../../types').ConnectionContract {
    const modelCtor = this.constructor as any
    const shardedConfig = modelCtor[SHARDED_KEY]

    if (shardedConfig) {
      const shardKey = (this as any)._attributes[shardedConfig.key]
      if (shardKey === undefined || shardKey === null) {
        throw new Error(
          `Shard key '${shardedConfig.key}' is missing on ${modelCtor.name} instance.`
        )
      }
      return DB.getShardingManager(shardedConfig.manager).getShard(shardKey)
    }

    return DB.connection(modelCtor.connection)
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
    const modelCtor = this.constructor as any
    const connection = this._getConnection()
    const tracer = connection.getTracer()
    const span = tracer?.startSpan(
      `Atlas:${this._exists ? 'Update' : 'Insert'}:${modelCtor.name}`,
      {
        'db.system': connection.getDriver().getDriverName(),
        'db.operation': this._exists ? 'update' : 'insert',
        'db.sql.table': modelCtor.getTable(),
      }
    )

    try {
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
    } finally {
      span?.end()
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
    const connection = this._getConnection()

    // Trigger 'creating' event
    await (this as any).emit('creating')

    // Initialize version if exists
    const versionKey = (modelCtor as any)[VERSION_KEY] as string | undefined
    if (versionKey && (this as any)._attributes[versionKey] === undefined) {
      ;(this as any)._setAttribute(versionKey, 1)
    }

    const extensionTable = modelCtor.extensionTable
    const columnMeta = modelCtor[COLUMN_KEY] || {}

    // Function to actually perform the insert (might be called inside or outside transaction)
    const doInsert = async (conn: import('../../../types').ConnectionContract) => {
      const attributes = (this as any)._attributes
      const mainAttributes: Record<string, any> = {}
      const extendedAttributes: Record<string, any> = {}

      if (extensionTable) {
        for (const [prop, value] of Object.entries(attributes)) {
          const options = columnMeta[prop]
          if (options?.deferred) {
            extendedAttributes[options.name || prop] = value
          } else {
            mainAttributes[options?.name || prop] = value
          }
        }
      } else {
        Object.assign(mainAttributes, attributes)
      }

      const result = await conn.table(modelCtor.getTable()).insert(mainAttributes)

      // Extract ID and handle fallbacks
      let lastId: any
      if (Array.isArray(result) && result.length > 0) {
        const pk = result[0]
        if (typeof pk === 'object' && pk !== null) {
          Object.assign((this as any)._attributes, pk)
          lastId = (pk as any)[modelCtor.primaryKey]
        } else {
          ;(this as any)._attributes[modelCtor.primaryKey] = pk
          lastId = pk
        }
      } else {
        // Fallback logic for drivers without RETURNING
        const driver = conn.getDriver()
        const driverName = driver.getDriverName()
        const queryResult = (result as any)._queryResult
        lastId = queryResult?.insertId

        if (lastId === undefined || lastId === 0) {
          if (driverName === 'sqlite') {
            const idRes = await conn.raw<{ id: number }>('SELECT last_insert_rowid() as id', [])
            lastId = idRes.rows[0]?.id
          } else {
            const maxResult = await conn.table(modelCtor.getTable()).max(modelCtor.primaryKey)
            lastId = maxResult ?? undefined
          }
        }

        if (lastId) {
          ;(this as any)._attributes[modelCtor.primaryKey] = lastId
        }
      }

      if (!lastId) {
        throw new Error(`Failed to determine last insert ID for ${modelCtor.name}`)
      }

      // Handle Extension Table
      if (extensionTable && Object.keys(extendedAttributes).length > 0) {
        extendedAttributes[modelCtor.primaryKey] = lastId

        // Apply casting to extended attributes before insert
        const castedExtended: Record<string, any> = {}
        for (const [key, value] of Object.entries(extendedAttributes)) {
          if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            // Transparently stringify objects for extension tables
            castedExtended[key] = JSON.stringify(value)
          } else {
            castedExtended[key] = value
          }
        }

        await conn.table(extensionTable).insert(castedExtended)
      }

      // Fetch the full record to sync all database-side values
      const fullRecord = await conn
        .table<any>(modelCtor.getTable())
        .where(modelCtor.primaryKey, lastId)
        .first()

      if (fullRecord) {
        Object.assign((this as any)._attributes, fullRecord)
      }

      return this
    }

    if (extensionTable) {
      await connection.transaction(async (trx) => {
        await doInsert(trx)
      })
    } else {
      await doInsert(connection)
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

    // Trigger 'updating' event
    await (this as any).emit('updating')

    // Handle Timestamps
    if (modelCtor.timestamps && modelCtor.timestamps !== 'created_only') {
      ;(this as any)._setAttribute(modelCtor.updatedAtColumn, new Date())
    }

    // Handle @column(autoUpdate)
    const columnsMeta = (modelCtor as any)[COLUMN_KEY]
    if (columnsMeta) {
      for (const [prop, options] of Object.entries(columnsMeta)) {
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
      const numericVersion =
        typeof currentVersion === 'string' ? Number.parseInt(currentVersion, 10) : currentVersion

      if (typeof numericVersion === 'number' && !Number.isNaN(numericVersion)) {
        ;(this as any)._setAttribute(versionKey, numericVersion + 1)
        currentVersion = numericVersion
      }
    }

    const getDirty = (this as any).getDirty || (() => ({}) as any)
    const dirty = getDirty.call(this)
    if (Object.keys(dirty).length === 0) {
      return this
    }

    const extensionTable = modelCtor.extensionTable
    const pk = modelCtor.primaryKey || 'id'
    const pkValue = (this as any).getKey()

    const doUpdate = async (conn: import('../../../types').ConnectionContract) => {
      const mainDirty: Record<string, any> = {}
      const extendedDirty: Record<string, any> = {}

      if (extensionTable) {
        for (const [prop, value] of Object.entries(dirty)) {
          const options = columnsMeta[prop]
          if (options?.deferred) {
            extendedDirty[options.name || prop] = value
          } else {
            mainDirty[options?.name || prop] = value
          }
        }
      } else {
        Object.assign(mainDirty, dirty)
      }

      // Update Main Table
      let affected = 0
      if (Object.keys(mainDirty).length > 0) {
        const query = conn.table(modelCtor.getTable()).where(pk, pkValue)
        if (versionKey && currentVersion !== undefined) {
          query.where(versionKey, currentVersion)
        }
        affected = await query.update(mainDirty)

        if (versionKey && affected === 0) {
          throw new StaleModelError(modelCtor.name, pkValue)
        }
      }

      // Update Extension Table (Upsert style)
      if (extensionTable && Object.keys(extendedDirty).length > 0) {
        // Apply casting to extended dirty attributes
        const castedExtended: Record<string, any> = {}
        for (const [key, value] of Object.entries(extendedDirty)) {
          if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            castedExtended[key] = JSON.stringify(value)
          } else {
            castedExtended[key] = value
          }
        }

        // We use upsert to handle cases where the extension record might not exist yet
        await conn
          .table(extensionTable)
          .upsert({ ...castedExtended, [pk]: pkValue }, [pk], Object.keys(castedExtended))
      }

      return true
    }

    if (extensionTable) {
      const connection = this._getConnection()
      await connection.transaction(async (trx) => {
        await doUpdate(trx)
      })
    } else {
      await doUpdate(this._getConnection())
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

    const modelCtor = this.constructor as any
    const connection = this._getConnection()
    const tracer = connection.getTracer()
    const span = tracer?.startSpan(`Atlas:Delete:${modelCtor.name}`, {
      'db.system': connection.getDriver().getDriverName(),
      'db.operation': 'delete',
      'db.sql.table': modelCtor.getTable(),
    })

    try {
      await (this as any).emit('deleting')

      const softDeletes = modelCtor[SOFT_DELETES_KEY]
      let result: boolean

      if (softDeletes) {
        const column = softDeletes.column || 'deleted_at'
        ;(this as any)._setAttribute(column, new Date())
        await this.save()
        result = true
      } else {
        const extensionTable = modelCtor.extensionTable
        const pk = modelCtor.primaryKey || 'id'
        const pkValue = (this as any).getKey()

        const doDelete = async (conn: import('../../../types').ConnectionContract) => {
          if (extensionTable) {
            await conn.table(extensionTable).where(pk, pkValue).delete()
          }
          const affected = await conn.table(modelCtor.getTable()).where(pk, pkValue).delete()
          return affected > 0
        }

        if (extensionTable) {
          result = await connection.transaction(async (trx) => {
            return await doDelete(trx)
          })
        } else {
          result = await doDelete(connection)
        }
      }
      if (result) {
        this._exists = !softDeletes
        await (this as any).emit('deleted')
      }
      return result
    } finally {
      span?.end()
    }
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
    // We must use withTrashed() here because otherwise save() -> _performUpdate()
    // will use query() which filters out soft-deleted records.
    let query: any
    const shardedConfig = modelCtor[SHARDED_KEY]
    if (shardedConfig) {
      const shardKey = (this as any)._attributes[shardedConfig.key]
      query = modelCtor
        .shard(shardKey)
        .withTrashed()
        .where(modelCtor.primaryKey, (this as any).getKey())
    } else {
      query = modelCtor
        .query()
        .withTrashed()
        .where(modelCtor.primaryKey, (this as any).getKey())
    }

    // Manual update to bypass the standard save() which might have versioning conflicts or scope issues
    const affected = await query.update({ [column]: null })

    if (affected > 0) {
      this._exists = true
      const dirtyTracker = (this as any)._dirtyTracker
      if (dirtyTracker) {
        dirtyTracker.sync((this as any)._attributes)
      }
      await (this as any).emit('restored')
      return true
    }

    return false
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
    const connection = this._getConnection()
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
    let row: any
    const shardedConfig = modelCtor[SHARDED_KEY]
    if (shardedConfig) {
      const shardKey = (this as any)._attributes[shardedConfig.key]
      row = await modelCtor.shard(shardKey).where(primaryKey, primaryValue).first()
    } else {
      row = await modelCtor.query().where(primaryKey, primaryValue).first()
    }

    if (row) {
      // Update attributes (from HasAttributes concern)
      const _attributes = (this as any)._attributes
      if (_attributes) {
        // row is a Model instance, we need to extract its _attributes
        const rowAttributes = (row as any)._attributes || row
        Object.assign(_attributes, rowAttributes)
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
