/**
 * Schema Validation Performance Benchmark
 *
 * 測試 Schema 驗證對寫入操作的效能影響
 */

import { afterAll, beforeAll, bench, describe } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const describeBench = process.env.MONGODB_URI ? describe : describe.skip

describeBench('Schema Validation Performance', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'bench',
      connections: {
        bench: { uri: MONGODB_URI, database: 'schema_validation_benchmark' },
      },
    })
    await Mongo.connect()
  })

  afterAll(async () => {
    await Mongo.database().dropCollection('no_validation')
    await Mongo.database().dropCollection('simple_validation')
    await Mongo.database().dropCollection('complex_validation')
    await Mongo.database().dropCollection('nested_validation')
    await Mongo.disconnect()
  })

  describe('無驗證 vs 有驗證', () => {
    beforeAll(async () => {
      // 建立無驗證的 collection
      await Mongo.database().createCollection('no_validation')

      // 建立簡單驗證的 collection
      await Mongo.schema('simple_validation')
        .field('name', 'string', { required: true })
        .field('age', 'number', { min: 0, max: 150 })
        .field('email', 'string')
        .create()

      // 建立複雜驗證的 collection
      await Mongo.schema('complex_validation')
        .field('name', 'string', { required: true, minLength: 2, maxLength: 100 })
        .field('age', 'number', { required: true, min: 0, max: 150 })
        .field('email', 'string', { required: true })
        .field('phone', 'string')
        .field('status', 'string', { enum: ['active', 'inactive', 'pending'] })
        .create()
    })

    bench('無驗證：插入 1000 筆記錄', async () => {
      const docs = Array.from({ length: 1000 }, (_, i) => ({
        name: `User ${i}`,
        age: 20 + (i % 50),
        email: `user${i}@example.com`,
      }))

      await Mongo.collection('no_validation').insertMany(docs)
      await Mongo.collection('no_validation').deleteMany()
    })

    bench('簡單驗證：插入 1000 筆記錄', async () => {
      const docs = Array.from({ length: 1000 }, (_, i) => ({
        name: `User ${i}`,
        age: 20 + (i % 50),
        email: `user${i}@example.com`,
      }))

      await Mongo.collection('simple_validation').insertMany(docs)
      await Mongo.collection('simple_validation').deleteMany()
    })

    bench('複雜驗證：插入 1000 筆記錄', async () => {
      const docs = Array.from({ length: 1000 }, (_, i) => ({
        name: `User ${i}`,
        age: 20 + (i % 50),
        email: `user${i}@example.com`,
        phone: `+886-${i}`,
        status: ['active', 'inactive', 'pending'][i % 3],
      }))

      await Mongo.collection('complex_validation').insertMany(docs)
      await Mongo.collection('complex_validation').deleteMany()
    })
  })

  describe('單筆 vs 批次插入', () => {
    beforeAll(async () => {
      await Mongo.schema('batch_test')
        .field('name', 'string', { required: true })
        .field('value', 'number', { min: 0 })
        .create()
    })

    afterAll(async () => {
      await Mongo.database().dropCollection('batch_test')
    })

    bench('有驗證：單筆插入 100 次', async () => {
      for (let i = 0; i < 100; i++) {
        await Mongo.collection('batch_test').insert({
          name: `Test ${i}`,
          value: i,
        })
      }

      await Mongo.collection('batch_test').deleteMany()
    })

    bench('有驗證：批次插入 100 筆', async () => {
      const docs = Array.from({ length: 100 }, (_, i) => ({
        name: `Test ${i}`,
        value: i,
      }))

      await Mongo.collection('batch_test').insertMany(docs)
      await Mongo.collection('batch_test').deleteMany()
    })
  })

  describe('巢狀物件驗證', () => {
    beforeAll(async () => {
      await Mongo.schema('nested_validation')
        .field('name', 'string', { required: true })
        .field('profile.age', 'number', { min: 0 })
        .field('profile.address.city', 'string')
        .field('profile.address.country', 'string')
        .create()
    })

    bench('巢狀驗證：插入 1000 筆記錄', async () => {
      const docs = Array.from({ length: 1000 }, (_, i) => ({
        name: `User ${i}`,
        profile: {
          age: 20 + (i % 50),
          address: {
            city: 'Taipei',
            country: 'Taiwan',
          },
        },
      }))

      await Mongo.collection('nested_validation').insertMany(docs)
      await Mongo.collection('nested_validation').deleteMany()
    })
  })

  describe('更新操作驗證', () => {
    beforeAll(async () => {
      await Mongo.schema('update_test')
        .field('name', 'string', { required: true })
        .field('age', 'number', { min: 0, max: 150 })
        .create()

      const docs = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        age: 20 + (i % 50),
      }))

      await Mongo.collection('update_test').insertMany(docs)
    })

    afterAll(async () => {
      await Mongo.database().dropCollection('update_test')
    })

    bench('有驗證：單筆更新', async () => {
      await Mongo.collection('update_test').where('id', 50).update({ age: 30 })
    })

    bench('有驗證：批次更新 100 筆', async () => {
      await Mongo.collection('update_test').updateMany({ age: 25 })
    })
  })
})
