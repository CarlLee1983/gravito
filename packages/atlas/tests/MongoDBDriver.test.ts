import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { MongoDBDriver } from '../src/drivers/MongoDBDriver'

// Mock mongodb
const mockCollection = {
  find: mock(() => ({
    toArray: mock(() => Promise.resolve([{ _id: '1', name: 'Test' }])),
  })),
  countDocuments: mock(() => Promise.resolve(42)),
  insertMany: mock(() => Promise.resolve({ insertedCount: 1, insertedIds: ['1'] })),
  updateMany: mock(() => Promise.resolve({ modifiedCount: 1 })),
  deleteMany: mock(() => Promise.resolve({ deletedCount: 1 })),
}

const mockDb = {
  collection: mock(() => mockCollection),
}

const mockClient = {
  connect: mock(() => Promise.resolve()),
  db: mock(() => mockDb),
  close: mock(() => Promise.resolve()),
}

// Mock the MongoClient constructor
mock.module('mongodb', () => ({
  MongoClient: class {
    constructor() {
      Object.assign(this, mockClient)
    }
  },
}))

describe('MongoDBDriver', () => {
  let driver: MongoDBDriver

  beforeEach(() => {
    driver = new MongoDBDriver({
      driver: 'mongodb',
      host: 'localhost',
      port: 27017,
      database: 'test_db',
    })
  })

  afterEach(async () => {
    await driver.disconnect()
  })

  it('should be defined', () => {
    expect(driver).toBeDefined()
  })

  it('should return correct driver name', () => {
    expect(driver.getDriverName()).toBe('mongodb')
  })

  it('should connect to database', async () => {
    await driver.connect()
    expect(driver.isConnected()).toBe(true)
    expect(mockClient.connect).toHaveBeenCalled()
    expect(mockClient.db).toHaveBeenCalledWith('test_db')
  })

  it('should execute find query', async () => {
    const protocol = JSON.stringify({
      collection: 'users',
      operation: 'find',
      filter: { name: 'Test' },
    })

    const result = await driver.query(protocol)
    expect(result.rowCount).toBe(1)
    expect(result.rows[0]!.name).toBe('Test')
    expect(mockDb.collection).toHaveBeenCalledWith('users')
    expect(mockCollection.find).toHaveBeenCalled()
  })

  it('should execute insert operation', async () => {
    const protocol = JSON.stringify({
      collection: 'users',
      operation: 'insert',
      document: { name: 'New User' },
    })

    const result = await driver.execute(protocol)
    expect(result.affectedRows).toBe(1)
    expect(result.insertId).toBe('1')
  })
})
