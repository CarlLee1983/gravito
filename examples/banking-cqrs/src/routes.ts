import type { PlanetCore } from '@gravito/core'
import { randomUUID } from 'crypto'
import type { CommandBus } from './Application/Bus/CommandBus'
import type { QueryBus } from './Application/Bus/QueryBus'
import { CreateAccountCommand } from './Application/Commands/CreateAccount/CreateAccountCommand'
import { DepositFundsCommand } from './Application/Commands/DepositFunds/DepositFundsCommand'
import { TransferFundsCommand } from './Application/Commands/TransferFunds/TransferFundsCommand'
import { WithdrawFundsCommand } from './Application/Commands/WithdrawFunds/WithdrawFundsCommand'
import { GetAccountBalanceQuery } from './Application/Queries/GetAccountBalance/GetAccountBalanceQuery'
import { GetAccountDetailsQuery } from './Application/Queries/GetAccountDetails/GetAccountDetailsQuery'
import { GetTransactionHistoryQuery } from './Application/Queries/GetTransactionHistory/GetTransactionHistoryQuery'

/**
 * Route Registration Module
 *
 * Defines all HTTP endpoints for the banking CQRS application.
 * This module follows the Interface/Presentation Layer in the layered architecture.
 *
 * **Route Categories:**
 * - Account Management: Create, retrieve account details
 * - Balance Queries: View current balance
 * - Transactions: Deposit, withdraw, transfer funds
 * - History: View transaction history with pagination
 *
 * **Design Pattern:**
 * Each endpoint follows the same pattern:
 * 1. Extract request parameters/body
 * 2. Get core context (for DI container access)
 * 3. Resolve CommandBus or QueryBus
 * 4. Create command or query
 * 5. Dispatch/execute via bus
 * 6. Return JSON response
 *
 * **Error Handling:**
 * - Any error thrown in command/query propagates as HTTP error
 * - No try-catch blocks in routes (delegate to middleware)
 * - Repository/domain errors bubble up naturally
 *
 * **API Response Format:**
 * All responses follow the standard format:
 * ```json
 * { "success": true, "data": {...} }
 * { "success": false, "error": "message" }
 * ```
 */

/**
 * Registers all banking CQRS routes
 *
 * This function should be called during application bootstrap.
 * It connects HTTP endpoints to CQRS buses for command dispatch and query execution.
 *
 * **7 Endpoints:**
 * - POST /api/accounts - Create account
 * - GET /api/accounts/:id - Get account details
 * - GET /api/accounts/:id/balance - Get balance
 * - POST /api/accounts/:id/deposit - Deposit funds
 * - POST /api/accounts/:id/withdraw - Withdraw funds
 * - POST /api/accounts/:id/transfer - Transfer funds
 * - GET /api/accounts/:id/transactions - Transaction history
 *
 * @param router - Photon router instance for registering endpoints
 * @see {@link CreateAccountCommand}
 * @see {@link DepositFundsCommand}
 * @see {@link WithdrawFundsCommand}
 * @see {@link TransferFundsCommand}
 * @see {@link GetAccountBalanceQuery}
 * @see {@link GetAccountDetailsQuery}
 * @see {@link GetTransactionHistoryQuery}
 *
 * @example
 * ```typescript
 * const router = core.container.make('router')
 * registerRoutes(router)
 * // All endpoints now available at /api/accounts
 * ```
 */
export function registerRoutes(router: any): void {
  /**
   * POST /api/accounts - Create Account
   *
   * Creates a new bank account with zero initial balance.
   *
   * **Request Body:**
   * ```json
   * {
   *   "ownerName": "John Doe",
   *   "currency": "TWD"  // optional, defaults to TWD
   * }
   * ```
   *
   * **Response (201 Created):**
   * ```json
   * {
   *   "success": true,
   *   "accountId": "acc-uuid-here"
   * }
   * ```
   *
   * **Errors:**
   * - 400: Invalid request body
   * - 409: Account already exists (duplicate accountId, if using custom ID)
   * - 500: Database error
   *
   * **Side Effects:**
   * - New account created with status ACTIVE
   * - Zero balance initialized
   * - AccountCreated event published to subscribers
   */
  router.post('/api/accounts', async (ctx: any) => {
    const body = (await ctx.req.json()) as { ownerName: string; currency?: string }
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<CommandBus>('cqrs.commandBus')

    const command = new CreateAccountCommand(randomUUID(), body.ownerName, body.currency || 'TWD')

    await bus.dispatch(command)

    return ctx.json({ success: true, accountId: command.accountId }, 201)
  })

  /**
   * GET /api/accounts/:id - Get Account Details
   *
   * Retrieves full account information including balance, status, and timestamps.
   *
   * **Query Parameters:** None
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "accountId": "acc-uuid",
   *     "ownerName": "John Doe",
   *     "balanceCents": 500000,
   *     "balanceDollars": 5000.00,
   *     "currency": "TWD",
   *     "status": "active",
   *     "createdAt": "2024-01-15T10:30:00Z"
   *   }
   * }
   * ```
   *
   * **Errors:**
   * - 404: Account not found
   * - 500: Database error
   */
  router.get('/api/accounts/:id', async (ctx: any) => {
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<QueryBus>('cqrs.queryBus')

    const query = new GetAccountDetailsQuery(ctx.req.param('id') as string)
    const result = await bus.execute(query)

    return ctx.json({ success: true, data: result })
  })

  /**
   * GET /api/accounts/:id/balance - Get Account Balance
   *
   * Retrieves current account balance (lightweight endpoint).
   *
   * **Query Parameters:** None
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "accountId": "acc-uuid",
   *     "ownerName": "John Doe",
   *     "balanceCents": 500000,
   *     "balanceDollars": 5000.00,
   *     "currency": "TWD",
   *     "status": "active",
   *     "createdAt": "2024-01-15T10:30:00Z"
   *   }
   * }
   * ```
   *
   * **Errors:**
   * - 404: Account not found
   * - 500: Database error
   */
  router.get('/api/accounts/:id/balance', async (ctx: any) => {
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<QueryBus>('cqrs.queryBus')

    const query = new GetAccountBalanceQuery(ctx.req.param('id') as string)
    const result = await bus.execute(query)

    return ctx.json({ success: true, data: result })
  })

  /**
   * POST /api/accounts/:id/deposit - Deposit Funds
   *
   * Deposits funds into an account.
   *
   * **Request Body:**
   * ```json
   * {
   *   "amount": 500.00,        // in dollars
   *   "currency": "TWD"        // optional, defaults to TWD
   * }
   * ```
   * Note: Amount is converted to cents internally (500.00 → 50000 cents)
   *
   * **Response (200 OK):**
   * ```json
   * { "success": true }
   * ```
   *
   * **Errors:**
   * - 400: Invalid amount or currency
   * - 404: Account not found
   * - 409: Account not active (frozen or closed)
   * - 500: Database error
   *
   * **Side Effects:**
   * - Account balance increased
   * - FundsDeposited event published
   * - Transaction record created for audit trail
   */
  router.post('/api/accounts/:id/deposit', async (ctx: any) => {
    const body = (await ctx.req.json()) as { amount: number; currency?: string }
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<CommandBus>('cqrs.commandBus')

    const command = new DepositFundsCommand(
      ctx.req.param('id') as string,
      Math.round(body.amount * 100),
      body.currency || 'TWD'
    )

    await bus.dispatch(command)

    return ctx.json({ success: true })
  })

  /**
   * POST /api/accounts/:id/withdraw - Withdraw Funds
   *
   * Withdraws funds from an account.
   *
   * **Request Body:**
   * ```json
   * {
   *   "amount": 100.00,        // in dollars
   *   "currency": "TWD"        // optional, defaults to TWD
   * }
   * ```
   * Note: Amount is converted to cents internally (100.00 → 10000 cents)
   *
   * **Response (200 OK):**
   * ```json
   * { "success": true }
   * ```
   *
   * **Errors:**
   * - 400: Invalid amount or currency
   * - 404: Account not found
   * - 409: Account not active (frozen or closed)
   * - 422: Insufficient funds
   * - 500: Database error
   *
   * **Business Rules:**
   * - Cannot withdraw more than current balance
   * - Account must be in ACTIVE status
   *
   * **Side Effects:**
   * - Account balance decreased
   * - FundsWithdrawn event published
   * - Transaction record created for audit trail
   */
  router.post('/api/accounts/:id/withdraw', async (ctx: any) => {
    const body = (await ctx.req.json()) as { amount: number; currency?: string }
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<CommandBus>('cqrs.commandBus')

    const command = new WithdrawFundsCommand(
      ctx.req.param('id') as string,
      Math.round(body.amount * 100),
      body.currency || 'TWD'
    )

    await bus.dispatch(command)

    return ctx.json({ success: true })
  })

  /**
   * POST /api/accounts/:id/transfer - Transfer Funds
   *
   * Transfers funds from one account to another.
   *
   * **Request Body:**
   * ```json
   * {
   *   "toAccountId": "acc-recipient-id",
   *   "amount": 250.00,        // in dollars
   *   "currency": "TWD"        // optional, defaults to TWD
   * }
   * ```
   * Note: Amount is converted to cents internally (250.00 → 25000 cents)
   *
   * **Response (200 OK):**
   * ```json
   * { "success": true }
   * ```
   *
   * **Errors:**
   * - 400: Invalid amount, currency, or recipient ID
   * - 404: Source or destination account not found
   * - 409: Source account not active (frozen or closed)
   * - 422: Insufficient funds or transfer exceeds 100,000 limit
   * - 500: Database error
   *
   * **Business Rules:**
   * - Single transfer cannot exceed 100,000 TWD
   * - Sender must have sufficient balance
   * - Both accounts must be in ACTIVE status
   * - Accounts must use same currency (for MVP)
   *
   * **Implementation Note:**
   * Two-phase transfer:
   * 1. Sender's account: transferTo() deducts balance
   * 2. Receiver's account: receiveTransfer() credits balance
   * - Both must succeed atomically (within transaction)
   * - Events published for both sides
   *
   * **Side Effects:**
   * - Sender's balance decreased
   * - Receiver's balance increased
   * - FundsTransferred event published
   * - Transaction records created for both accounts
   */
  router.post('/api/accounts/:id/transfer', async (ctx: any) => {
    const body = (await ctx.req.json()) as {
      toAccountId: string
      amount: number
      currency?: string
    }
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<CommandBus>('cqrs.commandBus')

    const command = new TransferFundsCommand(
      ctx.req.param('id') as string,
      body.toAccountId,
      Math.round(body.amount * 100),
      body.currency || 'TWD'
    )

    await bus.dispatch(command)

    return ctx.json({ success: true })
  })

  /**
   * GET /api/accounts/:id/transactions - Get Transaction History
   *
   * Retrieves paginated transaction history for an account.
   * Transactions are sorted newest-first (descending by created_at).
   *
   * **Query Parameters:**
   * - `limit`: Number of records per page (default: 10, max: 1000)
   * - `offset`: Number of records to skip for pagination (default: 0)
   *
   * **Example:**
   * - `/api/accounts/acc-123/transactions?limit=20&offset=0` - First 20
   * - `/api/accounts/acc-123/transactions?limit=20&offset=20` - Page 2
   *
   * **Response (200 OK):**
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "txn-uuid",
   *       "accountId": "acc-123",
   *       "type": "deposit",
   *       "amountCents": 50000,
   *       "balanceAfterCents": 150000,
   *       "currency": "TWD",
   *       "referenceId": null,
   *       "description": null,
   *       "createdAt": "2024-01-15T14:30:00Z"
   *     }
   *   ]
   * }
   * ```
   *
   * **Transaction Types:**
   * - "deposit" - Funds added to account
   * - "withdrawal" - Funds removed from account
   * - "transfer_out" - Funds transferred to another account
   * - "transfer_in" - Funds received from another account (not shown in this MVP)
   *
   * **Errors:**
   * - 404: Account not found
   * - 400: Invalid limit/offset parameters
   * - 500: Database error
   *
   * **Performance:**
   * - Uses database index on (account_id, created_at)
   * - Supports efficient pagination for large histories
   */
  router.get('/api/accounts/:id/transactions', async (ctx: any) => {
    const core = ctx.get('core') as PlanetCore
    const bus = core.container.make<QueryBus>('cqrs.queryBus')

    const limitStr = ctx.req.query('limit') as string | undefined
    const offsetStr = ctx.req.query('offset') as string | undefined
    const limit = limitStr ? parseInt(limitStr) : 10
    const offset = offsetStr ? parseInt(offsetStr) : 0

    const query = new GetTransactionHistoryQuery(ctx.req.param('id') as string, limit, offset)
    const result = await bus.execute(query)

    return ctx.json({ success: true, data: result })
  })
}
