/**
 * MongoDB Schema Builder
 * @description 提供型別安全的 Schema 定義 API
 */

import type { SchemaValidationOptions } from './types'

/**
 * MongoDB Schema Builder
 *
 * 提供友善的 API 來建構 MongoDB JSON Schema 驗證規則
 *
 * @example
 * ```typescript
 * const userSchema = schema()
 *   .required('username', 'email')
 *   .string('username', { minLength: 3, maxLength: 50 })
 *   .string('email', { pattern: '^.+@.+$' })
 *   .integer('age', { minimum: 0, maximum: 150 })
 *   .boolean('isActive')
 *   .date('createdAt')
 *   .array('roles', 'string', { minItems: 1 })
 *   .object('profile', (s) =>
 *     s.string('bio', { maxLength: 500 }).string('avatar')
 *   )
 * ```
 */
export class MongoSchemaBuilder {
  private schema: Record<string, unknown> = {
    bsonType: 'object',
    required: [],
    properties: {},
  }

  /**
   * 定義必填欄位
   *
   * @param fields - 必填欄位名稱列表
   * @returns 當前 Schema Builder 實例
   *
   * @example
   * ```typescript
   * schema().required('name', 'email', 'age')
   * ```
   */
  required(...fields: string[]): this {
    this.schema.required = [...(this.schema.required as string[]), ...fields]
    return this
  }

  /**
   * 定義字串欄位
   *
   * @param field - 欄位名稱
   * @param options - 字串選項（長度、模式、枚舉等）
   * @returns 當前 Schema Builder 實例
   *
   * @example
   * ```typescript
   * schema()
   *   .string('username', { minLength: 3, maxLength: 50 })
   *   .string('email', { pattern: '^.+@.+$' })
   *   .string('status', { enum: ['active', 'inactive'] })
   * ```
   */
  string(
    field: string,
    options?: {
      minLength?: number
      maxLength?: number
      pattern?: string
      enum?: string[]
    }
  ): this {
    const property: Record<string, unknown> = { bsonType: 'string' }

    if (options?.minLength !== undefined) {
      property.minLength = options.minLength
    }
    if (options?.maxLength !== undefined) {
      property.maxLength = options.maxLength
    }
    if (options?.pattern) {
      property.pattern = options.pattern
    }
    if (options?.enum) {
      property.enum = options.enum
    }

    ;(this.schema.properties as Record<string, unknown>)[field] = property
    return this
  }

  /**
   * 定義數字欄位
   *
   * @param field - 欄位名稱
   * @param options - 數字選項（最小值、最大值等）
   * @returns 當前 Schema Builder 實例
   *
   * @example
   * ```typescript
   * schema()
   *   .number('price', { minimum: 0, maximum: 10000 })
   *   .number('discount', { minimum: 0, maximum: 1, exclusiveMaximum: true })
   * ```
   */
  number(
    field: string,
    options?: {
      minimum?: number
      maximum?: number
      exclusiveMinimum?: boolean
      exclusiveMaximum?: boolean
    }
  ): this {
    const property: Record<string, unknown> = { bsonType: 'number' }

    if (options?.minimum !== undefined) {
      property.minimum = options.minimum
    }
    if (options?.maximum !== undefined) {
      property.maximum = options.maximum
    }
    if (options?.exclusiveMinimum) {
      property.exclusiveMinimum = true
    }
    if (options?.exclusiveMaximum) {
      property.exclusiveMaximum = true
    }

    ;(this.schema.properties as Record<string, unknown>)[field] = property
    return this
  }

  /**
   * 定義整數欄位
   *
   * @param field - 欄位名稱
   * @param options - 整數選項（最小值、最大值）
   * @returns 當前 Schema Builder 實例
   *
   * @example
   * ```typescript
   * schema()
   *   .integer('age', { minimum: 0, maximum: 150 })
   *   .integer('count')
   * ```
   */
  integer(
    field: string,
    options?: {
      minimum?: number
      maximum?: number
    }
  ): this {
    const property: Record<string, unknown> = { bsonType: 'int' }

    if (options?.minimum !== undefined) {
      property.minimum = options.minimum
    }
    if (options?.maximum !== undefined) {
      property.maximum = options.maximum
    }

    ;(this.schema.properties as Record<string, unknown>)[field] = property
    return this
  }

  /**
   * 定義布林欄位
   *
   * @param field - 欄位名稱
   * @returns 當前 Schema Builder 實例
   *
   * @example
   * ```typescript
   * schema().boolean('isActive').boolean('verified')
   * ```
   */
  boolean(field: string): this {
    ;(this.schema.properties as Record<string, unknown>)[field] = {
      bsonType: 'bool',
    }
    return this
  }

  /**
   * 定義日期欄位
   *
   * @param field - 欄位名稱
   * @returns 當前 Schema Builder 實例
   *
   * @example
   * ```typescript
   * schema().date('createdAt').date('updatedAt')
   * ```
   */
  date(field: string): this {
    ;(this.schema.properties as Record<string, unknown>)[field] = {
      bsonType: 'date',
    }
    return this
  }

  /**
   * 定義陣列欄位
   *
   * @param field - 欄位名稱
   * @param itemType - 陣列元素類型
   * @param options - 陣列選項（長度、唯一性等）
   * @returns 當前 Schema Builder 實例
   *
   * @example
   * ```typescript
   * schema()
   *   .array('tags', 'string')
   *   .array('scores', 'number')
   *   .array('roles', 'string', { minItems: 1, uniqueItems: true })
   * ```
   */
  array(
    field: string,
    itemType: 'string' | 'number' | 'object' | 'int' | 'bool' | 'date',
    options?: {
      minItems?: number
      maxItems?: number
      uniqueItems?: boolean
    }
  ): this {
    const property: Record<string, unknown> = {
      bsonType: 'array',
      items: { bsonType: itemType },
    }

    if (options?.minItems !== undefined) {
      property.minItems = options.minItems
    }
    if (options?.maxItems !== undefined) {
      property.maxItems = options.maxItems
    }
    if (options?.uniqueItems) {
      property.uniqueItems = true
    }

    ;(this.schema.properties as Record<string, unknown>)[field] = property
    return this
  }

  /**
   * 定義物件欄位
   *
   * @param field - 欄位名稱
   * @param callback - 巢狀 Schema 建構函數
   * @returns 當前 Schema Builder 實例
   *
   * @example
   * ```typescript
   * schema().object('profile', (s) =>
   *   s
   *     .string('bio', { maxLength: 500 })
   *     .string('avatar')
   *     .integer('followers')
   * )
   * ```
   */
  object(field: string, callback: (builder: MongoSchemaBuilder) => void): this {
    const nestedBuilder = new MongoSchemaBuilder()
    callback(nestedBuilder)
    ;(this.schema.properties as Record<string, unknown>)[field] = nestedBuilder.build()
    return this
  }

  /**
   * 建構最終的 JSON Schema
   *
   * @returns JSON Schema 物件
   *
   * @example
   * ```typescript
   * const schema = schema()
   *   .required('name')
   *   .string('name')
   *   .build()
   * ```
   */
  build(): Record<string, unknown> {
    return this.schema
  }

  /**
   * 轉換為 MongoDB 驗證選項
   *
   * @param options - 驗證選項（驗證等級、動作）
   * @returns MongoDB Schema 驗證選項
   *
   * @example
   * ```typescript
   * const options = schema()
   *   .required('name')
   *   .string('name')
   *   .toValidationOptions({ validationLevel: 'moderate' })
   * ```
   */
  toValidationOptions(options?: {
    validationLevel?: 'off' | 'strict' | 'moderate'
    validationAction?: 'error' | 'warn'
  }): SchemaValidationOptions {
    return {
      validator: { $jsonSchema: this.schema },
      validationLevel: options?.validationLevel ?? 'strict',
      validationAction: options?.validationAction ?? 'error',
    }
  }
}

/**
 * 建立 Schema Builder 實例
 *
 * @returns 新的 MongoSchemaBuilder 實例
 *
 * @example
 * ```typescript
 * import { schema } from '@gravito/dark-matter'
 *
 * const userSchema = schema()
 *   .required('name', 'email')
 *   .string('name')
 *   .string('email')
 * ```
 */
export function schema(): MongoSchemaBuilder {
  return new MongoSchemaBuilder()
}
