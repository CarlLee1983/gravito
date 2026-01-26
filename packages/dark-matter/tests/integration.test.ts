import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Mongo } from '../src'

// Integration tests need a real MongoDB instance
// Skip condition: MONGODB_URI environment variable is not set
const MONGODB_URI = process.env.MONGODB_URI
const describeIntegration = MONGODB_URI ? describe : describe.skip

describeIntegration('Integration Tests', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'test',
      connections: {
        test: { uri: MONGODB_URI!, database: 'dark_matter_test' },
      },
    })
    await Mongo.connect()
  })

  afterAll(async () => {
    // Clean up test data
    if (Mongo.isConnected()) {
      await Mongo.collection('test_users').deleteMany()
      await Mongo.collection('test_orders').deleteMany()
      await Mongo.disconnect()
    }
  })

  describe('CRUD Operations', () => {
    it('should insert and find document', async () => {
      const result = await Mongo.collection('test_users').insert({
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      })

      expect(result.acknowledged).toBe(true)
      expect(result.insertedId).toBeDefined()

      const user = await Mongo.collection('test_users').find(result.insertedId)
      expect(user).not.toBeNull()
      expect(user?.name).toBe('Test User')
    })

    it('should query with where clause', async () => {
      const users = await Mongo.collection('test_users').where('name', 'Test User').get()

      expect(users.length).toBeGreaterThan(0)
    })

    it('should update document', async () => {
      const result = await Mongo.collection('test_users')
        .where('name', 'Test User')
        .update({ name: 'Updated User' })

      expect(result.modifiedCount).toBeGreaterThan(0)
    })

    it('should delete document', async () => {
      const result = await Mongo.collection('test_users').where('name', 'Updated User').delete()

      expect(result.deletedCount).toBeGreaterThan(0)
    })
  })

  describe('Aggregation', () => {
    beforeAll(async () => {
      await Mongo.collection('test_orders').insertMany([
        { customerId: '1', amount: 100, status: 'completed' },
        { customerId: '1', amount: 200, status: 'completed' },
        { customerId: '2', amount: 150, status: 'pending' },
      ])
    })

    afterAll(async () => {
      await Mongo.collection('test_orders').deleteMany()
    })

    it('should group and sum correctly', async () => {
      const stats = await Mongo.collection('test_orders')
        .aggregate()
        .match({ status: 'completed' })
        .group({
          _id: '$customerId',
          total: { $sum: '$amount' },
        })
        .get()

      expect(stats.length).toBe(1)
      expect(stats[0].total).toBe(300)
    })
  })
})
