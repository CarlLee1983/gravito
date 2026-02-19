import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { WithdrawFundsCommand } from '../../../src/Application/Commands/WithdrawFunds/WithdrawFundsCommand'
import { WithdrawFundsHandler } from '../../../src/Application/Commands/WithdrawFunds/WithdrawFundsHandler'
import { Account } from '../../../src/Domain/Account/Account'
import { Money } from '../../../src/Domain/Shared/Money'

describe('WithdrawFundsHandler', () => {
  let handler: WithdrawFundsHandler
  let mockAccountRepository: any
  let mockCore: any
  let testAccount: Account

  beforeEach(() => {
    testAccount = Account.create('acc-123', 'John Doe', 'TWD')
    testAccount.deposit(Money.fromDollars(1000, 'TWD'))

    mockAccountRepository = {
      findById: mock(async () => testAccount),
      save: mock(async () => {}),
    }

    mockCore = {
      hooks: {
        doAction: mock(async () => {}),
      },
    }

    handler = new WithdrawFundsHandler(mockAccountRepository, mockCore as PlanetCore)
  })

  it('should withdraw funds successfully', async () => {
    const initialBalance = testAccount.balance.cents
    const command = new WithdrawFundsCommand('acc-123', 50000, 'TWD')

    await handler.handle(command)

    expect(testAccount.balance.cents).toBe(initialBalance - 50000)
    expect(mockAccountRepository.save).toHaveBeenCalled()
  })

  it('should throw when account not found', async () => {
    mockAccountRepository.findById = mock(async () => null)

    const command = new WithdrawFundsCommand('nonexistent', 50000, 'TWD')

    expect(async () => {
      await handler.handle(command)
    }).toThrow()
  })

  it('should throw when insufficient funds', async () => {
    const command = new WithdrawFundsCommand('acc-123', 200000, 'TWD')

    expect(async () => {
      await handler.handle(command)
    }).toThrow()
  })

  it('should publish domain events', async () => {
    const command = new WithdrawFundsCommand('acc-123', 50000, 'TWD')

    await handler.handle(command)

    expect(mockCore.hooks.doAction).toHaveBeenCalled()
  })
})
