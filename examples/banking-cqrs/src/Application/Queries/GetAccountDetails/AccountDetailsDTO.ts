/**
 * Account Details Data Transfer Object (DTO)
 *
 * Provides comprehensive information about an account for inspection.
 *
 * @since 1.0.0
 */
export interface AccountDetailsDTO {
  /** Unique account ID */
  accountId: string
  /** Owner's name */
  ownerName: string
  /** Balance in cents */
  balanceCents: number
  /** Balance in dollars */
  balanceDollars: number
  /** Currency code */
  currency: string
  /** Current account status */
  status: string
  /** When account was created */
  createdAt: Date
  /** When account was last updated */
  updatedAt: Date
}
