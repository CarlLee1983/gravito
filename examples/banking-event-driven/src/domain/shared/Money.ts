/**
 * Money Value Object
 * Amounts are stored in "cents" to avoid floating point precision issues.
 * Immutable by design.
 */
export class Money {
  private constructor(private readonly _cents: number) {
    if (_cents < 0) {
      throw new Error(`Amount cannot be negative: ${_cents}`)
    }
  }

  /**
   * Creates a Money instance from a given number of cents.
   *
   * @param cents - The amount in cents.
   * @returns A new Money instance.
   */
  static of(cents: number): Money {
    return new Money(cents)
  }

  /**
   * Creates a Money instance representing zero.
   *
   * @returns A zero Money instance.
   */
  static zero(): Money {
    return new Money(0)
  }

  get cents(): number {
    return this._cents
  }

  /**
   * Adds another Money instance to this one.
   *
   * @param money - The amount to add.
   * @returns A new Money instance representing the sum.
   */
  add(money: Money): Money {
    return new Money(this._cents + money._cents)
  }

  /**
   * Subtracts another Money instance from this one.
   *
   * @param money - The amount to subtract.
   * @returns A new Money instance representing the difference.
   * @throws {Error} If the result would be negative.
   */
  subtract(money: Money): Money {
    if (money._cents > this._cents) {
      throw new Error(
        `Insufficient funds: Current balance ${this._cents}, required ${money._cents}`
      )
    }
    return new Money(this._cents - money._cents)
  }

  /**
   * Checks if this amount is greater than or equal to another.
   *
   * @param money - The amount to compare against.
   * @returns True if greater than or equal.
   */
  isGreaterThanOrEqual(money: Money): boolean {
    return this._cents >= money._cents
  }

  /**
   * Checks if this amount equals another.
   *
   * @param money - The amount to compare against.
   * @returns True if amounts are equal.
   */
  equals(money: Money): boolean {
    return this._cents === money._cents
  }

  /**
   * Formats the amount as a string (e.g., "10.50").
   *
   * @returns Formatted currency string.
   */
  toString(): string {
    return `${(this._cents / 100).toFixed(2)}`
  }
}
