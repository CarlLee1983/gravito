import { describe, expect, it } from 'bun:test'
import { schema } from '../dist/index.js'

describe('MongoSchemaBuilder', () => {
  describe('基本 Schema 建構', () => {
    it('應該建構基本的 Schema', () => {
      const userSchema = schema().required('name', 'email').string('name').string('email').build()

      expect(userSchema).toEqual({
        bsonType: 'object',
        required: ['name', 'email'],
        properties: {
          name: { bsonType: 'string' },
          email: { bsonType: 'string' },
        },
      })
    })

    it('應該支援字串欄位選項', () => {
      const schema1 = schema()
        .string('username', { minLength: 3, maxLength: 50 })
        .string('email', { pattern: '^.+@.+$' })
        .string('status', { enum: ['active', 'inactive', 'pending'] })
        .build()

      expect(schema1.properties.username).toEqual({
        bsonType: 'string',
        minLength: 3,
        maxLength: 50,
      })
      expect(schema1.properties.email).toEqual({
        bsonType: 'string',
        pattern: '^.+@.+$',
      })
      expect(schema1.properties.status).toEqual({
        bsonType: 'string',
        enum: ['active', 'inactive', 'pending'],
      })
    })
  })

  describe('數字與整數欄位', () => {
    it('應該支援數字欄位', () => {
      const schema1 = schema()
        .number('price', { minimum: 0, maximum: 10000 })
        .number('discount', { minimum: 0, maximum: 1, exclusiveMaximum: true })
        .build()

      expect(schema1.properties.price).toEqual({
        bsonType: 'number',
        minimum: 0,
        maximum: 10000,
      })
      expect(schema1.properties.discount).toEqual({
        bsonType: 'number',
        minimum: 0,
        maximum: 1,
        exclusiveMaximum: true,
      })
    })

    it('應該支援整數欄位', () => {
      const schema1 = schema().integer('age', { minimum: 0, maximum: 150 }).integer('count').build()

      expect(schema1.properties.age).toEqual({
        bsonType: 'int',
        minimum: 0,
        maximum: 150,
      })
      expect(schema1.properties.count).toEqual({
        bsonType: 'int',
      })
    })
  })

  describe('其他基本類型', () => {
    it('應該支援布林欄位', () => {
      const schema1 = schema().boolean('isActive').boolean('verified').build()

      expect(schema1.properties.isActive).toEqual({ bsonType: 'bool' })
      expect(schema1.properties.verified).toEqual({ bsonType: 'bool' })
    })

    it('應該支援日期欄位', () => {
      const schema1 = schema().date('createdAt').date('updatedAt').build()

      expect(schema1.properties.createdAt).toEqual({ bsonType: 'date' })
      expect(schema1.properties.updatedAt).toEqual({ bsonType: 'date' })
    })
  })

  describe('陣列欄位', () => {
    it('應該支援基本陣列', () => {
      const schema1 = schema().array('tags', 'string').array('scores', 'number').build()

      expect(schema1.properties.tags).toEqual({
        bsonType: 'array',
        items: { bsonType: 'string' },
      })
      expect(schema1.properties.scores).toEqual({
        bsonType: 'array',
        items: { bsonType: 'number' },
      })
    })

    it('應該支援陣列選項', () => {
      const schema1 = schema()
        .array('roles', 'string', {
          minItems: 1,
          maxItems: 10,
          uniqueItems: true,
        })
        .build()

      expect(schema1.properties.roles).toEqual({
        bsonType: 'array',
        items: { bsonType: 'string' },
        minItems: 1,
        maxItems: 10,
        uniqueItems: true,
      })
    })
  })

  describe('巢狀物件', () => {
    it('應該支援巢狀物件', () => {
      const schema1 = schema()
        .object('profile', (s) => s.string('bio').string('avatar').integer('followers'))
        .build()

      expect(schema1.properties.profile).toEqual({
        bsonType: 'object',
        required: [],
        properties: {
          bio: { bsonType: 'string' },
          avatar: { bsonType: 'string' },
          followers: { bsonType: 'int' },
        },
      })
    })

    it('應該支援多層巢狀', () => {
      const schema1 = schema()
        .object('user', (s) =>
          s
            .string('name')
            .object('address', (addr) => addr.string('street').string('city').string('country'))
        )
        .build()

      expect(schema1.properties.user.properties.address).toEqual({
        bsonType: 'object',
        required: [],
        properties: {
          street: { bsonType: 'string' },
          city: { bsonType: 'string' },
          country: { bsonType: 'string' },
        },
      })
    })
  })

  describe('複雜 Schema', () => {
    it('應該建構完整的使用者 Schema', () => {
      const userSchema = schema()
        .required('username', 'email', 'createdAt')
        .string('username', { minLength: 3, maxLength: 50 })
        .string('email', { pattern: '^.+@.+$' })
        .integer('age', { minimum: 0, maximum: 150 })
        .boolean('isActive')
        .date('createdAt')
        .array('roles', 'string', { minItems: 1 })
        .object('profile', (s) =>
          s.string('bio', { maxLength: 500 }).string('avatar').integer('followers')
        )
        .build()

      expect(userSchema.bsonType).toBe('object')
      expect(userSchema.required).toEqual(['username', 'email', 'createdAt'])
      expect(Object.keys(userSchema.properties)).toHaveLength(7)
    })
  })

  describe('轉換為驗證選項', () => {
    it('應該轉換為 MongoDB 驗證選項（預設值）', () => {
      const options = schema().required('name').string('name').toValidationOptions()

      expect(options.validator).toHaveProperty('$jsonSchema')
      expect(options.validator.$jsonSchema.bsonType).toBe('object')
      expect(options.validationLevel).toBe('strict')
      expect(options.validationAction).toBe('error')
    })

    it('應該支援自訂驗證選項', () => {
      const options = schema().required('name').string('name').toValidationOptions({
        validationLevel: 'moderate',
        validationAction: 'warn',
      })

      expect(options.validationLevel).toBe('moderate')
      expect(options.validationAction).toBe('warn')
    })
  })

  describe('鏈式調用', () => {
    it('應該支援完整的鏈式調用', () => {
      const result = schema()
        .required('a', 'b')
        .string('a')
        .integer('b')
        .boolean('c')
        .date('d')
        .array('e', 'string')
        .object('f', (s) => s.string('nested'))

      expect(result).toBeDefined()
      expect(typeof result.build).toBe('function')
      expect(typeof result.toValidationOptions).toBe('function')
    })
  })
})
