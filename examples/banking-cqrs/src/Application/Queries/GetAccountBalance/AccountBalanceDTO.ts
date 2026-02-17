/**
 * Account Balance Data Transfer Object (DTO)
 *
 * Represents account balance information returned by GetAccountBalanceQuery.
 * DTOs are serializable representations of domain data for API responses.
 *
 * **DTO vs Aggregate:**
 * - Aggregate (Account): Contains business logic and enforces invariants
 * - DTO: Flat structure optimized for API serialization
 *
 * **Serialization:**
 * When returned in HTTP response, this DTO is automatically converted to JSON:
 * ```json
 * {
 *   "accountId": "acc-123",
 *   "ownerName": "John Doe",
 *   "balanceCents": 500000,
 *   "balanceDollars": 5000.00,
 *   "currency": "TWD",
 *   "status": "active",
 *   "createdAt": "2024-01-15T10:30:00Z"
 * }
 * ```
 *
 * @interface AccountBalanceDTO
 */
export interface AccountBalanceDTO {
  /** Unique account identifier (UUID) */
  accountId: string

  /** Account owner's display name */
  ownerName: string

  /** Current balance in cents (avoid floating-point errors) */
  balanceCents: number

  /** Current balance in dollars (for display; derived from cents) */
  balanceDollars: number

  /** Currency code (e.g., 'TWD', 'USD') */
  currency: string

  /** Account status ('active', 'frozen', or 'closed') */
  status: string

  /** Account creation timestamp */
  createdAt: Date
}
