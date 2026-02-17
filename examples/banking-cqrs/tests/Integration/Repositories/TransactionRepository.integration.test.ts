import { beforeEach, describe, expect, it } from 'bun:test'
import { Transaction } from '../../../src/Domain/Transaction/Transaction'
import { AtlasTransactionRepository } from '../../../src/Infrastructure/Persistence/AtlasTransactionRepository'

describe('AtlasTransactionRepository - Integration', () => {
  let repository: AtlasTransactionRepository

  beforeEach(async () => {
    repository = new AtlasTransactionRepository()
  })

  it('should save and retrieve transaction', async () => {
    const transaction = Transaction.create('txn-001', 'acc-123', 'deposit', 50000, 50000, 'TWD')

    await repository.save(transaction)

    const retrieved = await repository.findByAccountId('acc-123')

    expect(retrieved).toHaveLength(1)
    expect(retrieved[0].id).toBe('txn-001')
    expect(retrieved[0].type).toBe('deposit')
    expect(retrieved[0].amount).toBe(50000)
  })

  it('should retrieve transactions in reverse chronological order', async () => {
    const tx1 = Transaction.create('txn-001', 'acc-456', 'deposit', 10000, 10000, 'TWD')
    const tx2 = Transaction.create('txn-002', 'acc-456', 'withdrawal', 5000, 5000, 'TWD')
    const tx3 = Transaction.create('txn-003', 'acc-456', 'deposit', 15000, 20000, 'TWD')

    // Add small delay to ensure different timestamps
    await repository.save(tx1)
    await new Promise((resolve) => setTimeout(resolve, 10))
    await repository.save(tx2)
    await new Promise((resolve) => setTimeout(resolve, 10))
    await repository.save(tx3)

    const retrieved = await repository.findByAccountId('acc-456')

    expect(retrieved).toHaveLength(3)
    // Most recent should be first
    expect(retrieved[0].id).toBe('txn-003')
  })

  it('should support pagination', async () => {
    // Create 15 transactions
    for (let i = 0; i < 15; i++) {
      const tx = Transaction.create(
        `txn-${String(i).padStart(3, '0')}`,
        'acc-789',
        'deposit',
        10000,
        10000 * (i + 1),
        'TWD'
      )
      await repository.save(tx)
    }

    const page1 = await repository.findByAccountId('acc-789', 10, 0)
    const page2 = await repository.findByAccountId('acc-789', 10, 10)

    expect(page1).toHaveLength(10)
    expect(page2).toHaveLength(5)
  })

  it('should count transactions correctly', async () => {
    for (let i = 0; i < 7; i++) {
      const tx = Transaction.create(
        `txn-count-${i}`,
        'acc-count',
        'deposit',
        10000,
        10000 * (i + 1),
        'TWD'
      )
      await repository.save(tx)
    }

    const count = await repository.countByAccountId('acc-count')

    expect(count).toBe(7)
  })

  it('should handle different transaction types', async () => {
    const types = ['deposit', 'withdrawal', 'transfer_in', 'transfer_out'] as const

    for (const type of types) {
      const tx = Transaction.create(`txn-type-${type}`, 'acc-types', type, 10000, 10000, 'TWD')
      await repository.save(tx)
    }

    const retrieved = await repository.findByAccountId('acc-types', 100, 0)

    expect(retrieved).toHaveLength(4)
    const savedTypes = retrieved.map((t) => t.type)
    expect(savedTypes).toContain('deposit')
    expect(savedTypes).toContain('withdrawal')
    expect(savedTypes).toContain('transfer_in')
    expect(savedTypes).toContain('transfer_out')
  })

  it('should store transaction metadata', async () => {
    const tx = Transaction.create(
      'txn-meta',
      'acc-meta',
      'transfer_out',
      25000,
      75000,
      'TWD',
      'acc-recipient',
      'Payment for invoice #123'
    )

    await repository.save(tx)

    const retrieved = await repository.findByAccountId('acc-meta')

    expect(retrieved[0].referenceId).toBe('acc-recipient')
    expect(retrieved[0].description).toBe('Payment for invoice #123')
  })

  it('should isolate transactions by account', async () => {
    const tx1 = Transaction.create('txn-iso-1', 'acc-a', 'deposit', 10000, 10000, 'TWD')
    const tx2 = Transaction.create('txn-iso-2', 'acc-b', 'deposit', 20000, 20000, 'TWD')

    await repository.save(tx1)
    await repository.save(tx2)

    const accATransactions = await repository.findByAccountId('acc-a')
    const accBTransactions = await repository.findByAccountId('acc-b')

    expect(accATransactions).toHaveLength(1)
    expect(accBTransactions).toHaveLength(1)
    expect(accATransactions[0].amount).toBe(10000)
    expect(accBTransactions[0].amount).toBe(20000)
  })
})
