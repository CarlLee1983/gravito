import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { SQLiteDriver } from '../src/drivers/SQLiteDriver'

describe('SQLiteDriver Savepoint Support (Nested Transactions)', () => {
  let driver: SQLiteDriver

  beforeEach(async () => {
    driver = new SQLiteDriver({
      driver: 'sqlite',
      database: ':memory:',
    })
    await driver.connect()

    // Create test table
    await driver.execute(`
      CREATE TABLE accounts (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        balance INTEGER NOT NULL
      )
    `)

    // Insert initial data
    await driver.execute('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['Alice', 1000])
    await driver.execute('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['Bob', 500])
  })

  afterEach(async () => {
    await driver.disconnect()
  })

  it('should support simple nested transactions with savepoint', async () => {
    // Level 0: No transaction
    expect(driver.inTransaction()).toBe(false)
    expect(driver.getTransactionDepth()).toBe(0)

    // Level 1: Begin root transaction
    await driver.beginTransaction()
    expect(driver.inTransaction()).toBe(true)
    expect(driver.getTransactionDepth()).toBe(1)

    // Update within root transaction
    await driver.execute('UPDATE accounts SET balance = balance - 100 WHERE name = ?', ['Alice'])

    // Level 2: Begin nested transaction (savepoint)
    await driver.beginTransaction()
    expect(driver.inTransaction()).toBe(true)
    expect(driver.getTransactionDepth()).toBe(2)

    // Update within nested transaction
    await driver.execute('UPDATE accounts SET balance = balance + 100 WHERE name = ?', ['Bob'])

    // Commit nested transaction
    await driver.commit()
    expect(driver.inTransaction()).toBe(true)
    expect(driver.getTransactionDepth()).toBe(1)

    // Commit root transaction
    await driver.commit()
    expect(driver.inTransaction()).toBe(false)
    expect(driver.getTransactionDepth()).toBe(0)

    // Verify all changes were committed
    const alice = await driver.sql`SELECT balance FROM accounts WHERE name = 'Alice'`
    expect((alice.rows[0] as any).balance).toBe(900)

    const bob = await driver.sql`SELECT balance FROM accounts WHERE name = 'Bob'`
    expect((bob.rows[0] as any).balance).toBe(600)
  })

  it('should rollback nested transaction (savepoint)', async () => {
    await driver.beginTransaction()

    // Root transaction update
    await driver.execute('UPDATE accounts SET balance = balance - 100 WHERE name = ?', ['Alice'])

    await driver.beginTransaction()

    // Nested transaction update
    await driver.execute('UPDATE accounts SET balance = balance + 50 WHERE name = ?', ['Bob'])

    // Rollback nested transaction
    await driver.rollback()
    expect(driver.getTransactionDepth()).toBe(1)

    await driver.commit()

    // Verify: root transaction was committed, nested was rolled back
    const alice = await driver.sql`SELECT balance FROM accounts WHERE name = 'Alice'`
    expect((alice.rows[0] as any).balance).toBe(900)

    const bob = await driver.sql`SELECT balance FROM accounts WHERE name = 'Bob'`
    expect((bob.rows[0] as any).balance).toBe(500) // Not updated
  })

  it('should support 3+ levels of nesting', async () => {
    await driver.beginTransaction()
    expect(driver.getTransactionDepth()).toBe(1)

    await driver.beginTransaction()
    expect(driver.getTransactionDepth()).toBe(2)

    await driver.beginTransaction()
    expect(driver.getTransactionDepth()).toBe(3)

    await driver.beginTransaction()
    expect(driver.getTransactionDepth()).toBe(4)

    // Operations at deepest level
    await driver.execute('UPDATE accounts SET balance = balance - 10 WHERE name = ?', ['Alice'])

    // Commit all levels
    await driver.commit()
    expect(driver.getTransactionDepth()).toBe(3)

    await driver.commit()
    expect(driver.getTransactionDepth()).toBe(2)

    await driver.commit()
    expect(driver.getTransactionDepth()).toBe(1)

    await driver.commit()
    expect(driver.getTransactionDepth()).toBe(0)

    // Verify change was committed
    const alice = await driver.sql`SELECT balance FROM accounts WHERE name = 'Alice'`
    expect((alice.rows[0] as any).balance).toBe(990)
  })

  it('should handle rollback at any nesting level', async () => {
    await driver.beginTransaction()

    await driver.execute('UPDATE accounts SET balance = balance - 50 WHERE name = ?', ['Alice'])

    await driver.beginTransaction()

    await driver.execute('UPDATE accounts SET balance = balance + 25 WHERE name = ?', ['Bob'])

    await driver.beginTransaction()

    await driver.execute('UPDATE accounts SET balance = balance - 75 WHERE name = ?', ['Alice'])

    // Rollback deepest level
    await driver.rollback()
    expect(driver.getTransactionDepth()).toBe(2)

    // Commit level 2
    await driver.commit()
    expect(driver.getTransactionDepth()).toBe(1)

    // Rollback level 1
    await driver.rollback()
    expect(driver.getTransactionDepth()).toBe(0)

    // Verify: level 1 rollback reverted level 1 and 2 changes
    const alice = await driver.sql`SELECT balance FROM accounts WHERE name = 'Alice'`
    expect((alice.rows[0] as any).balance).toBe(1000) // Original

    const bob = await driver.sql`SELECT balance FROM accounts WHERE name = 'Bob'`
    expect((bob.rows[0] as any).balance).toBe(500) // Original
  })

  it('should handle mixed commits and rollbacks', async () => {
    await driver.beginTransaction()

    await driver.execute('UPDATE accounts SET balance = balance - 100 WHERE name = ?', ['Alice'])

    await driver.beginTransaction()

    await driver.execute('UPDATE accounts SET balance = balance + 50 WHERE name = ?', ['Bob'])

    // Commit level 2
    await driver.commit()
    expect(driver.getTransactionDepth()).toBe(1)

    await driver.beginTransaction()

    await driver.execute('UPDATE accounts SET balance = balance - 200 WHERE name = ?', ['Bob'])

    // Commit level 2 again
    await driver.commit()
    expect(driver.getTransactionDepth()).toBe(1)

    // Commit root
    await driver.commit()
    expect(driver.getTransactionDepth()).toBe(0)

    // Verify both updates from level 2 were committed
    const alice = await driver.sql`SELECT balance FROM accounts WHERE name = 'Alice'`
    expect((alice.rows[0] as any).balance).toBe(900)

    const bob = await driver.sql`SELECT balance FROM accounts WHERE name = 'Bob'`
    expect((bob.rows[0] as any).balance).toBe(350) // 500 + 50 - 200
  })

  it('should handle transaction isolation with nested savepoints', async () => {
    // Simulating two independent nested transactions
    await driver.beginTransaction()

    // Transaction 1: Modify Alice
    await driver.beginTransaction()
    await driver.execute('UPDATE accounts SET balance = balance - 100 WHERE name = ?', ['Alice'])

    // Check from within transaction 1
    const check1 = await driver.sql`SELECT balance FROM accounts WHERE name = 'Alice'`
    expect((check1.rows[0] as any).balance).toBe(900)

    await driver.commit() // Commit transaction 1

    // Transaction 2: Modify Bob
    await driver.beginTransaction()
    await driver.execute('UPDATE accounts SET balance = balance - 50 WHERE name = ?', ['Bob'])

    const check2 = await driver.sql`SELECT balance FROM accounts WHERE name = 'Bob'`
    expect((check2.rows[0] as any).balance).toBe(450)

    await driver.commit() // Commit transaction 2

    // Commit root
    await driver.commit()

    // Verify both changes
    const alice = await driver.sql`SELECT balance FROM accounts WHERE name = 'Alice'`
    expect((alice.rows[0] as any).balance).toBe(900)

    const bob = await driver.sql`SELECT balance FROM accounts WHERE name = 'Bob'`
    expect((bob.rows[0] as any).balance).toBe(450)
  })

  it('should handle commit/rollback without active transaction gracefully', async () => {
    // No transaction active
    expect(driver.getTransactionDepth()).toBe(0)

    // Commit should be no-op
    await driver.commit()
    expect(driver.getTransactionDepth()).toBe(0)

    // Rollback should be no-op
    await driver.rollback()
    expect(driver.getTransactionDepth()).toBe(0)

    // Data should be unaffected
    const alice = await driver.sql`SELECT balance FROM accounts WHERE name = 'Alice'`
    expect((alice.rows[0] as any).balance).toBe(1000)
  })
})
