import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
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
      findById: mock(async () => testAccount),
      save: mock(async () => {}),
    }

    mockTransactionRepository = {
      save: mock(async () => {}),
    }

    mockCore = {
      hooks: {
        doAction: mock(async () => {}),
      },
    }

    handler = new DepositFundsHandler(
      mockAccountRepository,
      mockTransactionRepository,
      mockCore as PlanetCore
    )
  })

  it('should deposit funds successfully', async () => {
    const command = new DepositFundsCommand('acc-123', 10000, 'TWD')

    await handler.handle(command)

    expect(testAccount.balance.cents).toBe(10000)
    expect(mockAccountRepository.save).toHaveBeenCalled()
  })

  it('should throw when account not found', async () => {
    mockAccountRepository.findById = mock(async () => null)

    const command = new DepositFundsCommand('nonexistent', 10000, 'TWD')

    expect(async () => {
      await handler.handle(command)
    }).toThrow()
  })

  it('should publish domain events', async () => {
    const command = new DepositFundsCommand('acc-123', 50000, 'TWD')

    await handler.handle(command)

    expect(mockCore.hooks.doAction).toHaveBeenCalled()
  })
})
