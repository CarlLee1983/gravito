import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { CreateAccountCommand } from '../../../src/Application/Commands/CreateAccount/CreateAccountCommand'
import { CreateAccountHandler } from '../../../src/Application/Commands/CreateAccount/CreateAccountHandler'
import type { Account } from '../../../src/Domain/Account/Account'

describe('CreateAccountHandler', () => {
  let handler: CreateAccountHandler
  let mockRepository: any
  let mockCore: any

  beforeEach(() => {
    mockRepository = {
      save: mock(async () => {}),
      existsById: mock(async () => false),
      findById: mock(async () => null),
    }

    mockCore = {
      hooks: {
        doAction: mock(() => {}),
      },
    }

    handler = new CreateAccountHandler(mockRepository, mockCore)
  })

  it('should create account with default currency', async () => {
    const command = new CreateAccountCommand('acc-123', 'John Doe', 'TWD')

    await handler.handle(command)

    expect(mockRepository.save).toHaveBeenCalledTimes(1)
    const savedAccount = (mockRepository.save as any).mock.calls[0][0] as Account
    expect(savedAccount.ownerName).toBe('John Doe')
    expect(savedAccount.balance.currency).toBe('TWD')
  })

  it('should throw when account already exists', async () => {
    mockRepository.existsById = mock(async () => true)

    const command = new CreateAccountCommand('acc-123', 'John Doe', 'TWD')

    expect(async () => {
      await handler.handle(command)
    }).toThrow()
  })

  it('should publish AccountCreated event', async () => {
    const command = new CreateAccountCommand('acc-123', 'John Doe', 'TWD')

    await handler.handle(command)

    expect(mockCore.hooks.doAction).toHaveBeenCalled()
    const calls = (mockCore.hooks.doAction as any).mock.calls
    expect(calls.length).toBeGreaterThan(0)
  })

  it('should handle different currencies', async () => {
    const command = new CreateAccountCommand('acc-456', 'Jane Doe', 'USD')

    await handler.handle(command)

    const savedAccount = (mockRepository.save as any).mock.calls[0][0] as Account
    expect(savedAccount.balance.currency).toBe('USD')
  })
})
