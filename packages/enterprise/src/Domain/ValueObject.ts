/**
 * Abstract base class for Domain Value Objects.
 *
 * Value objects are objects that have no conceptual identity. They are defined
 * solely by their attributes and are considered immutable.
 *
 * @template T - The type of the properties held by the value object.
 *
 * @public
 * @since 3.0.0
 */
export abstract class ValueObject<T> {
  protected readonly props: T

  constructor(props: T) {
    this.props = Object.freeze({ ...props })
  }

  public equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false
    }
    if (this === other) {
      return true
    }
    if (other.constructor !== this.constructor) {
      return false
    }
    return JSON.stringify(this.props) === JSON.stringify(other.props)
  }
}
