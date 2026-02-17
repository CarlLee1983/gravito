import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { GetAccountBalanceHandler } from '../../../src/Application/Queries/GetAccountBalance/GetAccountBalanceHandler'
import { GetAccountBalanceQuery } from '../../../src/Application/Queries/GetAccountBalance/GetAccountBalanceQuery'
import { Account } from '../../../src/Domain/Account/Account'
import { Money } from '../../../src/Domain/Shared/Money'

describe('GetAccountBalanceHandler', () => {
  let handler: GetAccountBalanceHandler
  let mockRepository: any
  let testAccount: Account

  beforeEach(() => {
    testAccount = Account.create('acc-123', 'John Doe', 'TWD')
    testAccount.deposit(Money.fromDollars(500, 'TWD'))

    mockRepository = {
      findById: mock(async () => testAccount),
      save: mock(async () => {}),
      existsById: mock(async () => true),
    }

    handler = new GetAccountBalanceHandler(mockRepository)
  })

  it('should return account balance', async () => {
    const query = new GetAccountBalanceQuery('acc-123')

    const result = await handler.execute(query)

    expect(result).toBeDefined()
    expect(result.balanceCents).toBe(50000)
    expect(result.balanceDollars).toBe(500)
  })

  it('should throw when account not found', async () => {
    mockRepository.findById = mock(async () => null)

    const query = new GetAccountBalanceQuery('nonexistent')

    expect(async () => {
      await handler.execute(query)
    }).toThrow()
  })

  it('should include account metadata in response', async () => {
    const query = new GetAccountBalanceQuery('acc-123')

    const result = await handler.execute(query)

    expect(result.accountId).toBe('acc-123')
    expect(result.ownerName).toBe('John Doe')
    expect(result.currency).toBe('TWD')
  })

  it('should handle zero balance', async () => {
    const zeroAccount = Account.create('acc-zero', 'Zero User', 'USD')
    mockRepository.findById = mock(async () => zeroAccount)

    const query = new GetAccountBalanceQuery('acc-zero')

    const result = await handler.execute(query)

    expect(result.balanceCents).toBe(0)
    expect(result.balanceDollars).toBe(0)
  })
})
