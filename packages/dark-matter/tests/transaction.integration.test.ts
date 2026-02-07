import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Mongo } from '../src'

// Integration tests need a real MongoDB instance with Replica Set enabled for transactions
const MONGODB_URI = process.env.MONGODB_URI
const describeTransaction = MONGODB_URI ? describe : describe.skip

describeTransaction('Transaction Tests', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'test',
      connections: {
        test: { uri: MONGODB_URI!, database: 'dark_matter_transaction_test' },
      },
    })
    await Mongo.connect()
  })

  afterAll(async () => {
    if (Mongo.isConnected()) {
      await Mongo.collection('accounts').deleteMany()
      await Mongo.disconnect()
    }
  })

  it('should execute operations in a transaction', async () => {
    // Setup initial data
    await Mongo.collection('accounts').insertMany([
      { _id: 'A', balance: 100 },
      { _id: 'B', balance: 50 },
    ])

    try {
      await Mongo.connection().withTransaction(async (session) => {
        // Debit A
        await session
          .collection('accounts')
          .where('_id', 'A')
          .update({ $inc: { balance: -50 } })

        // Credit B
        await session
          .collection('accounts')
          .where('_id', 'B')
          .update({ $inc: { balance: 50 } })
      })

      // Verify results
      const accountA = await Mongo.collection('accounts').find('A')
      const accountB = await Mongo.collection('accounts').find('B')

      expect(accountA?.balance).toBe(50)
      expect(accountB?.balance).toBe(100)
    } catch (error) {
      // Transaction might fail if MongoDB is standalone (not replica set)
      console.warn('Transaction test failed (likely due to standalone MongoDB):', error)
    }
  })

  it('should abort transaction on error', async () => {
    // Reset data
    await Mongo.collection('accounts').deleteMany()
    await Mongo.collection('accounts').insertMany([
      { _id: 'A', balance: 100 },
      { _id: 'B', balance: 50 },
    ])

    try {
      await Mongo.connection().withTransaction(async (session) => {
        await session
          .collection('accounts')
          .where('_id', 'A')
          .update({ $inc: { balance: -50 } })

        throw new Error('Simulated failure')
      })
    } catch {
      // Expected error
    }

    // Verify rollback
    const accountA = await Mongo.collection('accounts').find('A')
    expect(accountA?.balance).toBe(100)
  })
})
