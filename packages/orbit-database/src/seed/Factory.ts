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
    await DB.table(table).insert(records)

    // TODO: Ideally we should return the fresh models from DB if possible
    // But basic insert returns void or IDs depending on driver.
    // For seeding, just returning the data we inserted is often enough.

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
