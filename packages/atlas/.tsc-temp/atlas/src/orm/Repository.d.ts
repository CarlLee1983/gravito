import type { QueryBuilderContract } from '../types'
import type { Model, ModelStatic } from './model/Model'
/**
 * ModelRepository - Base Repository for Active Record Models
 *
 * Provides a collection-like interface for accessing and persisting domain models.
 * Extends the Active Record pattern with common repository operations.
 *
 * @template T - The type of Model managed by this repository
 *
 * @example
 * ```typescript
 * class UserRepository extends ModelRepository<User> {
 *   protected modelClass = User
 *
 *   async findByEmail(email: string): Promise<User | null> {
 *     return this.findWhere('email', email)
 *   }
 *
 *   async findActive(): Promise<User[]> {
 *     return this.query().where('is_active', true).get()
 *   }
 * }
 *
 * // Usage
 * const userRepo = new UserRepository()
 * const user = await userRepo.find(1)
 * const active = await userRepo.findActive()
 * ```
 *
 * @public
 * @since 3.0.0
 */
export declare abstract class ModelRepository<T extends Model> {
  /**
   * The model class this repository manages.
   * Must be set by subclasses.
   *
   * @example
   * ```typescript
   * class UserRepository extends ModelRepository<User> {
   *   protected modelClass = User
   * }
   * ```
   */
  protected abstract modelClass: ModelStatic<T>
  /**
   * Get a query builder for this model.
   *
   * @returns A new query builder instance
   */
  protected query(): QueryBuilderContract<T>
  /**
   * Retrieve all records from the database.
   *
   * @returns Promise resolving to array of all model instances
   *
   * @example
   * ```typescript
   * const users = await userRepository.all()
   * ```
   */
  all(): Promise<T[]>
  /**
   * Find a single record by its primary key.
   *
   * @param id - The primary key value
   * @returns Promise resolving to the model instance or null if not found
   *
   * @example
   * ```typescript
   * const user = await userRepository.find(1)
   * ```
   */
  find(id: unknown): Promise<T | null>
  /**
   * Find a single record by its primary key or throw an error.
   *
   * @param id - The primary key value
   * @returns Promise resolving to the model instance
   * @throws ModelNotFoundError if not found
   *
   * @example
   * ```typescript
   * const user = await userRepository.findOrFail(1)
   * ```
   */
  findOrFail(id: unknown): Promise<T>
  /**
   * Find a single record matching a where clause.
   *
   * @param column - The column name
   * @param value - The value to match
   * @returns Promise resolving to the model instance or null if not found
   *
   * @example
   * ```typescript
   * const user = await userRepository.findWhere('email', 'john@example.com')
   * ```
   */
  findWhere(column: string, value: unknown): Promise<T | null>
  /**
   * Find multiple records matching a where clause.
   *
   * @param column - The column name
   * @param value - The value to match
   * @returns Promise resolving to array of model instances
   *
   * @example
   * ```typescript
   * const admins = await userRepository.findManyWhere('role', 'admin')
   * ```
   */
  findManyWhere(column: string, value: unknown): Promise<T[]>
  /**
   * Find records using a callback for complex queries.
   *
   * @param callback - Function that receives the query builder
   * @returns Promise resolving to array of model instances
   *
   * @example
   * ```typescript
   * const result = await userRepository.findWhere(q =>
   *   q.where('role', 'admin').where('is_active', true)
   * )
   * ```
   */
  findByQuery(callback: (query: QueryBuilderContract<T>) => QueryBuilderContract<T>): Promise<T[]>
  /**
   * Find a single record using a callback for complex queries.
   *
   * @param callback - Function that receives the query builder
   * @returns Promise resolving to the model instance or null if not found
   *
   * @example
   * ```typescript
   * const user = await userRepository.findOneByQuery(q =>
   *   q.where('email', email).where('is_active', true)
   * )
   * ```
   */
  findOneByQuery(
    callback: (query: QueryBuilderContract<T>) => QueryBuilderContract<T>
  ): Promise<T | null>
  /**
   * Create a new record in the database.
   *
   * @param attributes - Object containing model attributes
   * @returns Promise resolving to the created model instance
   *
   * @example
   * ```typescript
   * const user = await userRepository.create({
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * })
   * ```
   */
  create(attributes: Partial<T>): Promise<T>
  /**
   * Update an existing record by its primary key.
   *
   * @param id - The primary key value
   * @param attributes - Object containing attributes to update
   * @returns Promise resolving to the updated model instance
   * @throws ModelNotFoundError if record not found
   *
   * @example
   * ```typescript
   * const user = await userRepository.update(1, { name: 'Jane Doe' })
   * ```
   */
  update(id: unknown, attributes: Partial<T>): Promise<T>
  /**
   * Delete a record by its primary key.
   *
   * @param id - The primary key value
   * @returns Promise that resolves when deletion is complete
   *
   * @example
   * ```typescript
   * await userRepository.delete(1)
   * ```
   */
  delete(id: unknown): Promise<void>
  /**
   * Check if a record exists by its primary key.
   *
   * @param id - The primary key value
   * @returns Promise resolving to true if exists, false otherwise
   *
   * @example
   * ```typescript
   * const exists = await userRepository.exists(1)
   * ```
   */
  exists(id: unknown): Promise<boolean>
  /**
   * Count the total number of records.
   *
   * @returns Promise resolving to the count
   *
   * @example
   * ```typescript
   * const total = await userRepository.count()
   * ```
   */
  count(): Promise<number>
  /**
   * Paginate records.
   *
   * @param page - The page number (1-indexed)
   * @param perPage - The number of records per page
   * @returns Promise resolving to pagination result
   *
   * @example
   * ```typescript
   * const result = await userRepository.paginate(1, 20)
   * // result.data: T[]
   * // result.total: number
   * // result.per_page: number
   * ```
   */
  paginate(page?: number, perPage?: number): Promise<import('..').PaginateResult<T>>
  /**
   * Restore soft-deleted records (requires SoftDeletes mixin on model).
   *
   * @param id - The primary key value
   * @returns Promise that resolves when restoration is complete
   *
   * @example
   * ```typescript
   * await userRepository.restore(1)
   * ```
   */
  restore(id: unknown): Promise<void>
  /**
   * Permanently delete a soft-deleted record (requires SoftDeletes mixin on model).
   *
   * @param id - The primary key value
   * @returns Promise that resolves when permanent deletion is complete
   *
   * @example
   * ```typescript
   * await userRepository.forceDelete(1)
   * ```
   */
  forceDelete(id: unknown): Promise<void>
}
