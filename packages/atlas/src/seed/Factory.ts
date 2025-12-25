import { DB } from '../DB'
import type { Model } from '../orm/model/Model'

/**
 * Factory State
 */
type FactoryState<T> = Partial<T>

/**
 * Factory Definition Function
 */
export type FactoryDefinition<T> = () => T

/**
 * Factory Options
 */
export interface FactoryOptions {
  model?: typeof Model
  table?: string
}

/**
 * Factory
 * Generate fake records for seeding
 *
 * @example
 * ```typescript
 * const userFactory = new Factory<User>(() => ({
 *   name: faker.person.fullName(),
 *   email: faker.internet.email(),
 *   password: 'hashed_password',
 * }), { table: 'users' })
 *
 * // Create 10 users
 * const users = await userFactory.count(10).create()
 * ```
 */
export class Factory<T extends Record<string, unknown>> {
  private definition: FactoryDefinition<T>
  private _count = 1
  private _states: FactoryState<T>[] = []
  private model?: typeof Model
  private tableName?: string

  constructor(definition: FactoryDefinition<T>, options: FactoryOptions = {}) {
    this.definition = definition
    if (options.model) {
      this.model = options.model
    }
    if (options.table) {
      this.tableName = options.table
    }
  }

  private static registry = new Map<string | typeof Model, Factory<any>>()

  /**
   * Define a factory for a model
   */
  static define<T extends Record<string, unknown>>(
    modelOrTable: typeof Model | string,
    definition: FactoryDefinition<T>
  ): Factory<T> {
    const options: FactoryOptions =
      typeof modelOrTable === 'string' ? { table: modelOrTable } : { model: modelOrTable }
    const instance = new Factory(definition, options)
    this.registry.set(modelOrTable, instance)
    return instance
  }

  /**
   * Create a factory for a specific model
   */
  static model<T extends Record<string, unknown>>(model: typeof Model): Factory<T> {
    const instance = this.registry.get(model)
    if (!instance) {
      throw new Error(`No factory defined for model ${model.name}. Use Factory.define(${model.name}, ...) first.`)
    }
    // Return a clone to avoid polluting the registered template
    return new Factory<T>(instance.definition, { model: instance.model, table: instance.tableName })
  }

  /**
   * Create and insert multiple records
   */
  async createMany(n: number, attributes: FactoryState<T> = {}): Promise<T[]> {
    return this.count(n).create(attributes)
  }

  /**
   * Set the number of records to generate
   */
  count(n: number): this {
    this._count = n
    return this
  }

  /**
   * Apply state overrides
   */
  state(state: FactoryState<T>): this {
    this._states.push(state)
    return this
  }

  /**
   * Generate records without inserting
   */
  make(): T[] {
    const records: T[] = []

    for (let i = 0; i < this._count; i++) {
      let record = this.definition()

      // Apply states
      for (const state of this._states) {
        record = { ...record, ...state }
      }

      records.push(record)
    }

    // Reset for next use
    this._count = 1
    this._states = []

    return records
  }

  /**
   * Generate a single record
   */
  makeOne(): T {
    const records = this.make()
    return records[0] as T
  }

  /**
   * Generate records as raw objects (alias for make)
   */
  raw(): T[] {
    return this.make()
  }

  /**
   * Generate a single raw record
   */
  rawOne(): T {
    return this.makeOne()
  }

  /**
   * Create and insert records into the database
   */
  async create(attributes: FactoryState<T> = {}): Promise<T[]> {
    if (Object.keys(attributes).length > 0) {
      this.state(attributes)
    }

    const records = this.make()

    const table = this.tableName ?? (this.model && (this.model as any).table)

    if (!table) {
      throw new Error('Cannot create records: No table or model specified for factory.')
    }

    if (records.length === 0) {
      return []
    }

    // Bulk Insert
    const inserted = await DB.table<T>(table).insert(records)

    // Return fresh models from DB if available
    if (inserted && inserted.length > 0) {
      // Merge attributes to keep any local overrides not in DB?
      // No, DB is truth.
      return inserted
    }

    // Fallback if driver doesn't return rows
    return records
  }

  /**
   * Create a sequence generator
   */
  sequence<K extends keyof T>(key: K, generator: (index: number) => T[K]): this {
    const originalDefinition = this.definition
    this.definition = (() => {
      const item = originalDefinition()
      // Sequence will be applied in make()
      return item
    }) as FactoryDefinition<T>

    // Store sequence info for later application
    const sequenceState = (index: number) =>
      ({ [key]: generator(index) }) as unknown as FactoryState<T>

    const originalMake = this.make.bind(this)
    this.make = () => {
      const records = originalMake()
      return records.map((record, index) => ({
        ...record,
        ...sequenceState(index),
      }))
    }

    return this
  }
}

/**
 * Helper to create a factory
 */
export function factory<T extends Record<string, unknown>>(
  definition: FactoryDefinition<T>,
  options?: FactoryOptions
): Factory<T> {
  return new Factory<T>(definition, options)
}
