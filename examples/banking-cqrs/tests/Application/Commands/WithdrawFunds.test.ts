import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { WithdrawFundsCommand } from '../../../src/Application/Commands/WithdrawFunds/WithdrawFundsCommand'
import { WithdrawFundsHandler } from '../../../src/Application/Commands/WithdrawFunds/WithdrawFundsHandler'
import { Account } from '../../../src/Domain/Account/Account'
import { Money } from '../../../src/Domain/Shared/Money'

describe('WithdrawFundsHandler', () => {
  let handler: WithdrawFundsHandler
  let mockAccountRepository: any
  let mockTransactionRepository: any
  let mockCore: any
  let testAccount: Account

  beforeEach(() => {
    testAccount = Account.create('acc-123', 'John Doe', 'TWD')
    testAccount.deposit(Money.fromDollars(1000, 'TWD'))

    mockAccountRepository = {
      save: mock(async () => {}),
      findById: mock(async () => testAccount),
      existsById: mock(async () => true),
    }

    mockTransactionRepository = {
      save: mock(async () => {}),
      findByAccountId: mock(async () => []),
      countByAccountId: mock(async () => 0),
    }

    mockCore = {
      hooks: {
        doAction: mock(() => {}),
      },
    }

    handler = new WithdrawFundsHandler(mockAccountRepository, mockTransactionRepository, mockCore)
  })

  it('should withdraw funds successfully', async () => {
    const command = new WithdrawFundsCommand('acc-123', 50000, 'TWD')

    await handler.handle(command)

    expect(mockAccountRepository.save).toHaveBeenCalledTimes(1)
    expect(mockTransactionRepository.save).toHaveBeenCalledTimes(1)
  })

  it('should throw when insufficient balance', async () => {
    const command = new WithdrawFundsCommand('acc-123', 150000, 'TWD')

    expect(async () => {
      await handler.handle(command)
    }).toThrow()
  })

  it('should throw when account not found', async () => {
    mockAccountRepository.findById = mock(async () => null)

    const command = new WithdrawFundsCommand('nonexistent', 50000, 'TWD')

    expect(async () => {
      await handler.handle(command)
    }).toThrow()
  })

  it('should decrease account balance', async () => {
    const initialBalance = testAccount.balance.cents
    const command = new WithdrawFundsCommand('acc-123', 30000, 'TWD')

    await handler.handle(command)

    const savedAccount = (mockAccountRepository.save as any).mock.calls[0][0]
    expect(savedAccount.balance.cents).toBe(initialBalance - 30000)
  })

  it('should create transaction record with correct type', async () => {
    const command = new WithdrawFundsCommand('acc-123', 40000, 'TWD')

    await handler.handle(command)

    const transaction = (mockTransactionRepository.save as any).mock.calls[0][0]
    expect(transaction.type).toBe('withdrawal')
    expect(transaction.amount).toBe(40000)
  })

  it('should publish FundsWithdrawn event', async () => {
    const command = new WithdrawFundsCommand('acc-123', 25000, 'TWD')

    await handler.handle(command)

    expect(mockCore.hooks.doAction).toHaveBeenCalled()
  })
})
