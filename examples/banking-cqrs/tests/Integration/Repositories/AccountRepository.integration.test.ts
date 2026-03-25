import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DB } from '@gravito/atlas'
import { Account } from '../../../src/Domain/Account/Account'
import { Money } from '../../../src/Domain/Shared/Money'
import { AtlasAccountRepository } from '../../../src/Infrastructure/Persistence/AtlasAccountRepository'

describe('AtlasAccountRepository - Integration', () => {
  let repository: AtlasAccountRepository

  beforeAll(async () => {
    // Set up in-memory SQLite connection for tests
    DB.addConnection('default', {
      driver: 'sqlite',
      database: ':memory:',
    })

    // Create accounts table
    await DB.raw(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        owner_name TEXT NOT NULL,
        balance INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'TWD',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
  })

  afterAll(async () => {
    await DB.disconnect('default')
  })

  beforeEach(async () => {
    // Clean table between tests
    await DB.raw('DELETE FROM accounts')
    repository = new AtlasAccountRepository()
  })

  it('should save and retrieve account', async () => {
    const account = Account.create('test-acc-1', 'Alice', 'TWD')
    account.deposit(Money.fromDollars(1000, 'TWD'))

    await repository.save(account)

    const retrieved = await repository.findById('test-acc-1')

    expect(retrieved).toBeDefined()
    expect(retrieved?.ownerName).toBe('Alice')
    expect(retrieved?.balance.cents).toBe(100000)
    expect(retrieved?.balance.currency).toBe('TWD')
  })

  it('should update existing account', async () => {
    const account = Account.create('test-acc-2', 'Bob', 'USD')
    account.deposit(Money.fromDollars(500, 'USD'))

    await repository.save(account)

    // Modify and save
    account.deposit(Money.fromDollars(250, 'USD'))
    await repository.save(account)

    const retrieved = await repository.findById('test-acc-2')

    expect(retrieved?.balance.cents).toBe(75000) // 500 + 250
  })

  it('should check account existence', async () => {
    const account = Account.create('test-acc-3', 'Charlie', 'TWD')
    await repository.save(account)

    const exists = await repository.existsById('test-acc-3')
    const notExists = await repository.existsById('nonexistent-acc')

    expect(exists).toBe(true)
    expect(notExists).toBe(false)
  })

  it('should handle concurrent saves atomically', async () => {
    const account = Account.create('test-acc-4', 'Diana', 'TWD')

    // Simulate concurrent saves
    await Promise.all([
      repository.save(account),
      repository.save(account),
      repository.save(account),
    ])

    const retrieved = await repository.findById('test-acc-4')

    expect(retrieved).toBeDefined()
    expect(retrieved?.ownerName).toBe('Diana')
    // Account should exist (not corrupted by concurrent saves)
  })

  it('should preserve account status', async () => {
    const account = Account.create('test-acc-5', 'Eve', 'TWD')
    account.deposit(Money.fromDollars(100, 'TWD'))
    account.freeze()

    await repository.save(account)

    const retrieved = await repository.findById('test-acc-5')

    expect(retrieved?.status).toBe('frozen' as any)
  })

  it('should handle different currencies', async () => {
    const accounts = [
      Account.create('test-acc-twd', 'User TWD', 'TWD'),
      Account.create('test-acc-usd', 'User USD', 'USD'),
      Account.create('test-acc-jpy', 'User JPY', 'JPY'),
    ]

    for (const account of accounts) {
      await repository.save(account)
    }

    const twdAccount = await repository.findById('test-acc-twd')
    const usdAccount = await repository.findById('test-acc-usd')
    const jpyAccount = await repository.findById('test-acc-jpy')

    expect(twdAccount?.balance.currency).toBe('TWD')
    expect(usdAccount?.balance.currency).toBe('USD')
    expect(jpyAccount?.balance.currency).toBe('JPY')
  })

  afterEach(async () => {
    // Data cleaned in beforeEach; in-memory DB persists for the test suite lifecycle
  })
})
