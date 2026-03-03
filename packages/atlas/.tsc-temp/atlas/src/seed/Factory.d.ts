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
export declare class Factory<T extends Record<string, unknown>> {
  private definition
  private _count
  private _states
  private model?
  private tableName?
  constructor(definition: FactoryDefinition<T>, options?: FactoryOptions)
  private static registry
  /**
   * Define a factory for a model
   */
  static define<T extends Record<string, unknown>>(
    modelOrTable: typeof Model | string,
    definition: FactoryDefinition<T>
  ): Factory<T>
  /**
   * Create a factory for a specific model
   */
  static model<T extends Record<string, unknown>>(model: typeof Model): Factory<T>
  /**
   * Create and insert multiple records
   */
  createMany(n: number, attributes?: FactoryState<T>): Promise<T[]>
  /**
   * Set the number of records to generate
   */
  count(n: number): this
  /**
   * Apply state overrides
   */
  state(state: FactoryState<T>): this
  /**
   * Generate records without inserting
   */
  make(): T[]
  /**
   * Generate a single record
   */
  makeOne(): T
  /**
   * Generate records as raw objects (alias for make)
   */
  raw(): T[]
  /**
   * Generate a single raw record
   */
  rawOne(): T
  /**
   * Create and insert records into the database
   */
  create(attributes?: FactoryState<T>): Promise<T[]>
  /**
   * Create a sequence generator
   */
  sequence<K extends keyof T>(key: K, generator: (index: number) => T[K]): this
}
/**
 * Helper to create a factory
 */
export declare function factory<T extends Record<string, unknown>>(
  definition: FactoryDefinition<T>,
  options?: FactoryOptions
): Factory<T>
