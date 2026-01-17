/**
 * Model Base Class
 * @description Active Record style ORM with Proxy-based Smart Guard
 */

import { DB } from '../../DB'
import type { QueryBuilderContract } from '../../types'
import { applyMixins } from '../../utils/applyMixins'
// Import concerns
import { HasAttributes } from './concerns/HasAttributes'
import { HasEvents } from './concerns/HasEvents'
import { HasPersistence } from './concerns/HasPersistence'
import { HasRelationships } from './concerns/HasRelationships'
import { HasScopes } from './concerns/HasScopes'
import { DirtyTracker } from './DirtyTracker'
import { getRelationships } from './relationships'

/**
 * Model attributes type
 */
export type ModelAttributes = Record<string, unknown>

/**
 * Model constructor type
 */
export type ModelConstructor<T extends Model> = new () => T

/**
 * Model static interface
 */
export interface ModelStatic<T extends Model> {
  new (): T
  table: string
  primaryKey: string
  connection?: string
}

/**
 * Base Model Class
 * Active Record implementation with Proxy-based Smart Guard
 */
// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: Intentional mixin pattern for ActiveRecord
export abstract class Model {
  // ============================================================================
  // Static Configuration
  // ============================================================================

  /** Table name */
  static table: string
  static tableName: string

  /** Primary key column */
  static primaryKey = 'id'
  static hidden: string[] = []
  static visible: string[] = []
  static appends: string[] = []
  static observers: any[] = []

  /** Enable automatic timestamps */
  static timestamps: boolean | 'created_only' = true
  static createdAtColumn = 'created_at'
  static updatedAtColumn = 'updated_at'

  /** Attribute casting definition */
  static casts: Record<string, string> = {}

  /** Database connection name */
  static connection?: string

  /** Enable strict mode (throw on unknown columns) */
  static strictMode = true

  // ============================================================================
  // Instance State
  // ============================================================================

  /** Model attributes */
  public _attributes: ModelAttributes = {}

  /** Dirty tracker */
  public _dirtyTracker: DirtyTracker<ModelAttributes>

  /** Whether the model exists in database */
  public _exists = false

  /** Cached schema */
  public _schema?: any

  constructor() {
    this._dirtyTracker = new DirtyTracker()
  }

  // ============================================================================
  // Proxy Factory
  // ============================================================================

  /**
   * Instantiate a new model instance (non-saving)
   */
  static make<T extends Model>(
    this: ModelConstructor<T>,
    attributes: Partial<ModelAttributes> = {}
  ): T {
    const instance = new this()
    return (instance as any)._createProxy(attributes, false)
  }

  /**
   * Create a new model and save it to the database
   */
  static async create<T extends Model>(
    this: ModelConstructor<T>,
    attributes: Partial<ModelAttributes> = {}
  ): Promise<T> {
    const model = (this as any).make(attributes)
    await (model as any).save()
    return model
  }

  /**
   * Hydrate a model from database row
   */
  static hydrate<T extends Model>(this: ModelConstructor<T>, row: ModelAttributes): T {
    const instance = new this()
    const proxy = (instance as any)._createProxy(row, true)
    void (proxy as any).emit?.('retrieved')
    return proxy
  }

  /**
   * Create proxy wrapper for Smart Guard
   */
  protected _createProxy<T extends Model>(
    this: T,
    attributes: Partial<ModelAttributes>,
    exists: boolean
  ): T {
    const modelCtor = this.constructor as typeof Model
    const castedAttributes = { ...attributes }

    if (Object.keys(modelCtor.casts).length > 0) {
      for (const [key, value] of Object.entries(attributes)) {
        if (key in modelCtor.casts) {
          castedAttributes[key] = (this as any)._castAttribute(key, value, modelCtor.casts[key]!)
        }
      }
    }

    this._attributes = castedAttributes
    this._exists = exists

    if (exists) {
      this._dirtyTracker.setOriginal(attributes)
    }

    const model = this

    return new Proxy(this, {
      get(target, prop: string | symbol, receiver) {
        if (typeof prop === 'symbol' || (typeof prop === 'string' && prop.startsWith('_'))) {
          return Reflect.get(target, prop)
        }

        if (prop === 'constructor') {
          return target.constructor
        }

        let proto = Object.getPrototypeOf(target)
        while (proto && proto !== Object.prototype) {
          const descriptor = Object.getOwnPropertyDescriptor(proto, prop)
          if (descriptor?.get) {
            return descriptor.get.call(receiver)
          }
          if (descriptor?.value && typeof descriptor.value === 'function') {
            return descriptor.value.bind(receiver)
          }
          proto = Object.getPrototypeOf(proto)
        }

        if (typeof prop === 'string') {
          const studly = prop.replace(/(?:^|_|(?=[A-Z]))(.)/g, (_, c) => c.toUpperCase())
          const accessor = `get${studly}Attribute`
          if (typeof (target as any)[accessor] === 'function') {
            const raw = model._attributes[prop]
            return (target as any)[accessor].call(receiver, raw)
          }
        }

        if (typeof prop === 'string' && prop in model._attributes) {
          return model._attributes[prop]
        }

        const relations = getRelationships(modelCtor)
        if (typeof prop === 'string' && relations.has(prop)) {
          const builderFn = (..._args: any[]) => {
            const meta = relations.get(prop)!
            const type = meta.type

            if (type === 'morphTo') {
              return (receiver as any).morphTo(
                meta.morphName,
                meta.morphTypeField,
                meta.morphIdField
              )
            }

            if (type === 'morphOne' || type === 'morphMany') {
              const Related = meta.related?.()
              return (receiver as any)[type](
                Related,
                meta.morphName,
                meta.foreignKey,
                meta.localKey
              )
            }

            const Related = meta.related?.()
            return (receiver as any)[type](Related, meta.foreignKey, meta.localKey)
          }

          // biome-ignore lint/suspicious/noThenProperty: Intentional thenable for lazy relationship loading
          ;(builderFn as any).then = async (resolve: any, reject: any) => {
            try {
              await (receiver as any).load(prop)
              resolve((receiver as any)._attributes[prop])
            } catch (err) {
              reject(err)
            }
          }

          return builderFn
        }

        if (Object.hasOwn(target, prop)) {
          const value = Reflect.get(target, prop)
          if (typeof value === 'function') {
            return value.bind(receiver)
          }
          return value
        }

        if (prop in modelCtor && !['name', 'prototype', 'length'].includes(prop as string)) {
          const value = Reflect.get(modelCtor, prop)
          if (typeof value === 'function') {
            return value.bind(modelCtor)
          }
          return value
        }

        return undefined
      },

      set(target, prop: string | symbol, value, receiver) {
        if (typeof prop === 'symbol' || (typeof prop === 'string' && prop.startsWith('_'))) {
          return Reflect.set(target, prop, value, receiver)
        }

        if (typeof prop === 'string') {
          const studly = prop.replace(/(?:^|_|(?=[A-Z]))(.)/g, (_, c) => c.toUpperCase())
          const mutator = `set${studly}Attribute`
          if (typeof (target as any)[mutator] === 'function') {
            ;(target as any)[mutator].call(receiver, value)
            return true
          }
        }

        if (!(prop in target) || (typeof prop === 'string' && prop in model._attributes)) {
          ;(model as any)._setAttribute(prop as string, value)
          return true
        }

        return Reflect.set(target, prop, value)
      },

      has(target, prop) {
        if (typeof prop === 'symbol') return false
        return prop in model._attributes || Reflect.has(target, prop)
      },

      ownKeys(target) {
        return [...new Set([...Object.keys(model._attributes), ...Reflect.ownKeys(target)])]
      },

      getOwnPropertyDescriptor(target, prop) {
        if (typeof prop === 'string' && prop in model._attributes) {
          return {
            value: model._attributes[prop],
            writable: true,
            enumerable: true,
            configurable: true,
          }
        }
        return Reflect.getOwnPropertyDescriptor(target, prop)
      },
    }) as T
  }

  /**
   * Get the table name for this model
   */
  static getTable(): string {
    const self = this as any
    const table = self.tableName || self.table
    if (!table) {
      throw new Error(`Model ${this.name} has no table defined.`)
    }
    return table
  }

  // ==========================================================================
  // Signatures for applyMixins (internal use)
  // ==========================================================================

  // HasScopes (Static)
  static query<T extends Model>(this: any): QueryBuilderContract<T> {
    return null as any
  }
  static where<T extends Model>(this: any, ...args: any[]): QueryBuilderContract<T> {
    return null as any
  }
  static find<T extends Model>(this: any, ...args: any[]): Promise<T | null> {
    return null as any
  }
  static findOrFail<T extends Model>(this: any, ...args: any[]): Promise<T> {
    return null as any
  }
  static all<T extends Model>(this: any): Promise<T[]> {
    return null as any
  }

  // HasAttributes
  getKey(): any {
    return null
  }
  getAttributes(): ModelAttributes {
    return {}
  }
  getDirty(): Partial<ModelAttributes> {
    return {}
  }
  getOriginal(): Partial<ModelAttributes> {
    return {}
  }
  toJSON(): any {
    return {}
  }

  // HasPersistence
  async save(): Promise<this> {
    return this
  }
  async delete(): Promise<boolean> {
    return true
  }
  async refresh(): Promise<this> {
    return this
  }

  // HasRelationships
  async load(relation: string | string[]): Promise<this> {
    return this
  }

  // HasEvents
  protected async emit(event: string): Promise<void> {}
}

// Interface merging for mixins
export interface Model extends HasAttributes, HasRelationships, HasPersistence, HasEvents {}

// Apply mixins
applyMixins(Model, [HasAttributes, HasRelationships, HasPersistence, HasEvents, HasScopes])
