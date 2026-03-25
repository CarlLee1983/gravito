import { describe, expect, it } from 'bun:test'

/**
 * E2E Tests for Banking CQRS API
 *
 * These tests verify complete user journeys through the API.
 * Run with: BANKING_E2E_ENABLED=true bun test tests/E2E/
 *
 * **Prerequisites:**
 * - Start server: bun run dev (server at http://localhost:3000)
 * - Set environment variable: BANKING_E2E_ENABLED=true
 *
 * @note These tests are skipped in automated runs unless BANKING_E2E_ENABLED=true
 * @note In a real project, use Playwright or Supertest for API testing
 */

// Skip E2E tests unless server is explicitly available (prevents 5s timeouts in CI)
const isE2eEnabled = process.env.BANKING_E2E_ENABLED === 'true'

describe.skipIf(!isE2eEnabled)('Banking CQRS API - E2E Tests', () => {
  const API_BASE = 'http://localhost:3000/api'

  /**
   * Journey 1: Create Account → Deposit → Check Balance
   */
  it('should complete deposit journey', async () => {
    // Step 1: Create account
    const createRes = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName: 'Alice', currency: 'TWD' }),
    })

    expect(createRes.status).toBe(201)
    const { accountId } = await createRes.json()
    expect(accountId).toBeDefined()

    // Step 2: Deposit funds
    const depositRes = await fetch(`${API_BASE}/accounts/${accountId}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000, currency: 'TWD' }),
    })

    expect(depositRes.status).toBe(200)

    // Step 3: Check balance
    const balanceRes = await fetch(`${API_BASE}/accounts/${accountId}/balance`)
    expect(balanceRes.status).toBe(200)
    const { data: balanceData } = await balanceRes.json()
    expect(balanceData.balanceDollars).toBe(1000)
  })

  /**
   * Journey 2: Create Account → Deposit → Withdraw → Check History
   */
  it('should complete withdraw and history journey', async () => {
    // Create account
    const createRes = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName: 'Bob', currency: 'TWD' }),
    })

    const { accountId } = await createRes.json()

    // Deposit
    await fetch(`${API_BASE}/accounts/${accountId}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 500 }),
    })

    // Withdraw
    const withdrawRes = await fetch(`${API_BASE}/accounts/${accountId}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 200 }),
    })

    expect(withdrawRes.status).toBe(200)

    // Check history
    const historyRes = await fetch(`${API_BASE}/accounts/${accountId}/transactions`)
    expect(historyRes.status).toBe(200)
    const { data: transactions } = await historyRes.json()
    expect(transactions.length).toBeGreaterThanOrEqual(2) // deposit + withdrawal
  })

  /**
   * Journey 3: Transfer between accounts
   */
  it('should complete transfer journey', async () => {
    // Create sender account
    const senderRes = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName: 'Sender', currency: 'TWD' }),
    })
    const { accountId: senderId } = await senderRes.json()

    // Create receiver account
    const receiverRes = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName: 'Receiver', currency: 'TWD' }),
    })
    const { accountId: receiverId } = await receiverRes.json()

    // Deposit to sender
    await fetch(`${API_BASE}/accounts/${senderId}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000 }),
    })

    // Transfer
    const transferRes = await fetch(`${API_BASE}/accounts/${senderId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toAccountId: receiverId, amount: 300 }),
    })

    expect(transferRes.status).toBe(200)

    // Verify sender balance
    const senderBalanceRes = await fetch(`${API_BASE}/accounts/${senderId}/balance`)
    const { data: senderBalance } = await senderBalanceRes.json()
    expect(senderBalance.balanceDollars).toBe(700)

    // Verify receiver received
    const receiverHistoryRes = await fetch(`${API_BASE}/accounts/${receiverId}/transactions`)
    const { data: receiverTransactions } = await receiverHistoryRes.json()
    expect(receiverTransactions.length).toBeGreaterThan(0)
  })

  /**
   * Error Handling: Invalid input should return 400
   */
  it('should reject invalid account creation', async () => {
    const res = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName: '', currency: 'INVALID' }),
    })

    expect(res.status).toBe(400)
    const { code } = await res.json()
    expect(code).toBe('VALIDATION_ERROR')
  })

  /**
   * Error Handling: Negative deposit should fail
   */
  it('should reject negative deposit', async () => {
    // Create account first
    const createRes = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName: 'Test', currency: 'TWD' }),
    })
    const { accountId } = await createRes.json()

    // Try negative deposit
    const res = await fetch(`${API_BASE}/accounts/${accountId}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: -100 }),
    })

    expect(res.status).toBe(400)
    const { code } = await res.json()
    expect(code).toBe('VALIDATION_ERROR')
  })

  /**
   * Error Handling: Insufficient balance
   */
  it('should reject withdrawal with insufficient balance', async () => {
    // Create account
    const createRes = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerName: 'Poor User', currency: 'TWD' }),
    })
    const { accountId } = await createRes.json()

    // Try to withdraw from empty account
    const res = await fetch(`${API_BASE}/accounts/${accountId}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000 }),
    })

    expect(res.status).toBe(422)
    const { code } = await res.json()
    expect(code).toBe('INSUFFICIENT_BALANCE')
  })
})

/**
 * How to run these tests:
 *
 * 1. Start the server:
 *    ```bash
 *    bun run dev
 *    ```
 *
 * 2. Run E2E tests:
 *    ```bash
 *    bun test tests/E2E/
 *    ```
 *
 * 3. For production use, consider:
 *    - Using Playwright for full browser testing
 *    - Using Supertest for API testing
 *    - Adding authentication/authorization tests
 *    - Testing error recovery scenarios
 *    - Performance and load testing
 */
