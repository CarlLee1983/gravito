import type { Entity } from './Entity'

/**
 * Generic Repository interface following Domain-Driven Design (DDD) principles.
 *
 * Repositories provide a collection-like interface for accessing and persisting
 * domain entities. They abstract the underlying data storage mechanism.
 *
 * @template TEntity - The type of the Entity managed by the repository.
 * @template TId - The type of the Entity's unique identifier.
 *
 * @example
 * ```typescript
 * class UserRepository implements Repository<User, string> {
 *   async save(user: User): Promise<void> { ... }
 *   async findById(id: string): Promise<User | null> { ... }
 *   // ...
 * }
 * ```
 *
 * @public
 * @since 3.0.0
 */
export interface Repository<TEntity extends Entity<TId>, TId> {
  /**
   * Persist an entity to the underlying storage.
   *
   * @param entity - The entity to save.
   * @returns A promise that resolves when the save operation is complete.
   */
  save(entity: TEntity): Promise<void>

  /**
   * Find an entity by its unique identifier.
   *
   * @param id - The unique identifier of the entity.
   * @returns A promise that resolves to the entity if found, or null otherwise.
   */
  findById(id: TId): Promise<TEntity | null>

  /**
   * Retrieve all entities of this type.
   *
   * @returns A promise that resolves to an array of all entities.
   */
  findAll(): Promise<TEntity[]>

  /**
   * Delete an entity by its unique identifier.
   *
   * @param id - The unique identifier of the entity to delete.
   * @returns A promise that resolves when the deletion is complete.
   */
  delete(id: TId): Promise<void>

  /**
   * Determine if an entity with the given identifier exists.
   *
   * @param id - The unique identifier to check.
   * @returns A promise that resolves to true if the entity exists, false otherwise.
   */
  exists(id: TId): Promise<boolean>
}
