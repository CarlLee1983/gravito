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
    return this.deepEqual(this.props, other.props)
  }

  private deepEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) {
      return true
    }

    if (left instanceof Date && right instanceof Date) {
      return left.getTime() === right.getTime()
    }

    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        return false
      }

      return left.every((value, index) => this.deepEqual(value, right[index]))
    }

    if (
      left &&
      right &&
      typeof left === 'object' &&
      typeof right === 'object' &&
      !Array.isArray(left) &&
      !Array.isArray(right)
    ) {
      const leftEntries = Object.entries(left as Record<string, unknown>).sort(([a], [b]) =>
        a.localeCompare(b)
      )
      const rightEntries = Object.entries(right as Record<string, unknown>).sort(([a], [b]) =>
        a.localeCompare(b)
      )

      if (leftEntries.length !== rightEntries.length) {
        return false
      }

      return leftEntries.every(([key, value], index) => {
        const [otherKey, otherValue] = rightEntries[index]
        return key === otherKey && this.deepEqual(value, otherValue)
      })
    }

    return false
  }
}
