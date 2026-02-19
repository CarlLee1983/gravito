import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { DepositFundsCommand } from '../../../src/Application/Commands/DepositFunds/DepositFundsCommand'
import { DepositFundsHandler } from '../../../src/Application/Commands/DepositFunds/DepositFundsHandler'
import { Account } from '../../../src/Domain/Account/Account'
import { Money } from '../../../src/Domain/Shared/Money'

describe('DepositFundsHandler', () => {
  let handler: DepositFundsHandler
  let mockAccountRepository: any
  let mockTransactionRepository: any
  let mockCore: any
  let testAccount: Account

  beforeEach(() => {
    testAccount = Account.create('acc-123', 'John Doe', 'TWD')

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

    handler = new DepositFundsHandler(mockAccountRepository, mockTransactionRepository, mockCore)
  })

  it('should deposit funds successfully', async () => {
    const command = new DepositFundsCommand('acc-123', 10000, 'TWD')

    await handler.handle(command)

    expect(mockAccountRepository.save).toHaveBeenCalledTimes(1)
    expect(mockTransactionRepository.save).toHaveBeenCalledTimes(1)
  })

  it('should throw when account not found', async () => {
    mockAccountRepository.findById = mock(async () => null)

    const command = new DepositFundsCommand('nonexistent', 10000, 'TWD')

    expect(async () => {
      await handler.handle(command)
    }).toThrow()
  })

  it('should increase account balance', async () => {
    const initialBalance = testAccount.balance.cents
    const command = new DepositFundsCommand('acc-123', 50000, 'TWD')

    await handler.handle(command)

    const savedAccount = (mockAccountRepository.save as any).mock.calls[0][0]
    expect(savedAccount.balance.cents).toBe(initialBalance + 50000)
  })

  it('should create transaction record', async () => {
    const command = new DepositFundsCommand('acc-123', 30000, 'TWD')

    await handler.handle(command)

    expect(mockTransactionRepository.save).toHaveBeenCalledTimes(1)
    const transaction = (mockTransactionRepository.save as any).mock.calls[0][0]
    expect(transaction.type).toBe('deposit')
    expect(transaction.amount).toBe(30000)
  })

  it('should publish FundsDeposited event', async () => {
    const command = new DepositFundsCommand('acc-123', 20000, 'TWD')

    await handler.handle(command)

    expect(mockCore.hooks.doAction).toHaveBeenCalled()
  })
})
