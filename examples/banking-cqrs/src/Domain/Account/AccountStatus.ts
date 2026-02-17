/**
 * Account Status Enum
 *
 * Defines the possible states of a bank account.
 *
 * @since 1.0.0
 */
export enum AccountStatus {
  /** Account is open and can perform all transactions */
  ACTIVE = 'active',
  /** Account is temporarily locked; cannot perform transactions */
  FROZEN = 'frozen',
  /** Account is permanently closed; no further operations allowed */
  CLOSED = 'closed',
}
