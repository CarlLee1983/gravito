/**
 * Abstract base class for Domain Entities.
 *
 * Entities are objects that have a unique identity that persists over time,
 * even if their attributes change.
 *
 * @template TId - The type of the entity's unique identifier.
 *
 * @public
 * @since 3.0.0
 */
export abstract class Entity<TId> {
  protected readonly _id: TId

  constructor(id: TId) {
    this._id = id
  }

  get id(): TId {
    return this._id
  }

  public equals(other: Entity<TId>): boolean {
    if (other === null || other === undefined) {
      return false
    }
    if (this === other) {
      return true
    }
    if (!(other instanceof Entity)) {
      return false
    }
    return this._id === other._id
  }
}
