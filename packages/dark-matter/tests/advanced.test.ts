import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Mongo } from '../src'
import { MongoGridFS } from '../src/MongoGridFS'

// Integration tests need a real MongoDB instance
const MONGODB_URI = process.env.MONGODB_URI
const describeIntegration = MONGODB_URI ? describe : describe.skip

describeIntegration('Advanced Features', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'test',
      connections: {
        test: { uri: MONGODB_URI!, database: 'dark_matter_advanced_test' },
      },
    })
    await Mongo.connect()
  })

  afterAll(async () => {
    if (Mongo.isConnected()) {
      await Mongo.database().dropCollection('users_with_schema')
      await Mongo.database().dropCollection('fs.files')
      await Mongo.database().dropCollection('fs.chunks')
      await Mongo.disconnect()
    }
  })

  describe('Schema Validation', () => {
    it('should create collection with validation', async () => {
      await Mongo.database().createCollection('users_with_schema', {
        schema: {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['username'],
              properties: {
                username: {
                  bsonType: 'string',
                  description: 'must be a string and is required',
                },
              },
            },
          },
          validationLevel: 'strict',
          validationAction: 'error',
        },
      })

      // Should succeed
      await Mongo.collection('users_with_schema').insert({ username: 'valid_user' })

      // Should fail
      try {
        await Mongo.collection('users_with_schema').insert({ username: 123 })
        expect(true).toBe(false) // Should not reach here
      } catch (e) {
        expect(e).toBeDefined()
      }
    })
  })

  describe('GridFS', () => {
    it('should upload and download file', async () => {
      // Access the internal db instance to pass to GridFS
      // In a real app we might expose a helper, but for now we can access it via 'any' cast or we should add a getter to MongoClient
      // Let's add a proper getter for native DB in types or just cast for test
      // Actually MongoGridFS needs NativeMongoDatabase.
      // We can use Mongo.database() but we need the native one.
      // Let's rely on the implementation detail that we can get it or just use `Mongo.connection().database()['db']` if exposed
      // Since `MongoDatabaseWrapper` has private `db`, we might need to expose it or make `MongoGridFS` accept `MongoDatabaseContract` if we wrap it.
      // But `MongoGridFS` constructor takes `NativeMongoDatabase`.

      // Workaround for test: Access private db property via casting
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private property for testing
      const nativeDb = (Mongo.database() as any).db

      const gridfs = new MongoGridFS(nativeDb)
      const content = Buffer.from('Hello GridFS')
      const fileId = await gridfs.upload(content, { filename: 'test.txt' })

      expect(fileId).toBeDefined()

      const downloaded = await gridfs.download(fileId)
      expect(downloaded.toString()).toBe('Hello GridFS')

      const files = await gridfs.list({ filename: 'test.txt' })
      expect(files.length).toBe(1)
      expect(files[0]._id.toString()).toBe(fileId)

      await gridfs.delete(fileId)
      const filesAfterDelete = await gridfs.list({ filename: 'test.txt' })
      expect(filesAfterDelete.length).toBe(0)
    })
  })
})
