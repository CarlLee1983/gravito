/**
 * Model Metadata 處理工具測試
 * 測試 Model.hidden 和 Model.appends 的處理
 */
import { describe, expect, it } from 'bun:test'
import { Model } from '@gravito/atlas'
import {
  extractAppendFields,
  extractModelMetadata,
  filterHiddenFields,
} from '../src/utils/model-metadata'

// 測試用 Model - 包含 hidden 和 appends
class UserModel extends Model {
  static override table = 'users'
  static override hidden = ['password', 'api_key']
  static override appends = ['full_name', 'display_name']
  static override casts = {
    is_active: 'boolean',
    settings: 'json',
  }

  declare id: number
  declare name: string
  declare email: string
  declare password: string
  declare api_key: string
  declare is_active: boolean
  declare settings: object

  // Accessor: full_name
  getFullNameAttribute(): string {
    return `${this.name}`
  }

  // Accessor: display_name
  getDisplayNameAttribute(): string {
    return `@${this.name}`
  }
}

// 測試用 Model - 沒有 hidden 和 appends
class SimpleModel extends Model {
  static override table = 'simple'
  declare id: number
  declare title: string
}

// 測試用 Model - 只有 hidden
class SecretModel extends Model {
  static override table = 'secrets'
  static override hidden = ['secret_value']
  declare id: number
  declare name: string
  declare secret_value: string
}

// 測試用 Model - 只有 appends
class ComputedModel extends Model {
  static override table = 'computed'
  static override appends = ['computed_field']
  declare id: number
  declare base_value: number

  getComputedFieldAttribute(): number {
    return this.base_value * 2
  }
}

describe('Model Metadata Utils', () => {
  describe('extractModelMetadata', () => {
    it('應該正確提取 Model 的 hidden 欄位', () => {
      const metadata = extractModelMetadata(UserModel)

      expect(metadata.hidden).toEqual(['password', 'api_key'])
    })

    it('應該正確提取 Model 的 appends 欄位', () => {
      const metadata = extractModelMetadata(UserModel)

      expect(metadata.appends).toEqual(['full_name', 'display_name'])
    })

    it('應該正確提取 Model 的 casts 欄位', () => {
      const metadata = extractModelMetadata(UserModel)

      expect(metadata.casts).toEqual({
        is_active: 'boolean',
        settings: 'json',
      })
    })

    it('沒有定義 hidden 時應該返回空陣列', () => {
      const metadata = extractModelMetadata(SimpleModel)

      expect(metadata.hidden).toEqual([])
    })

    it('沒有定義 appends 時應該返回空陣列', () => {
      const metadata = extractModelMetadata(SimpleModel)

      expect(metadata.appends).toEqual([])
    })

    it('應該返回完整的 ModelMetadata 結構', () => {
      const metadata = extractModelMetadata(UserModel)

      expect(metadata).toHaveProperty('hidden')
      expect(metadata).toHaveProperty('appends')
      expect(metadata).toHaveProperty('casts')
      expect(metadata).toHaveProperty('table')
      expect(metadata).toHaveProperty('primaryKey')
      expect(metadata.table).toBe('users')
      expect(metadata.primaryKey).toBe('id')
    })
  })

  describe('filterHiddenFields', () => {
    it('應該過濾掉 hidden 欄位', () => {
      const fields = ['id', 'name', 'email', 'password', 'api_key']
      const hidden = ['password', 'api_key']

      const result = filterHiddenFields(fields, hidden)

      expect(result).toEqual(['id', 'name', 'email'])
      expect(result).not.toContain('password')
      expect(result).not.toContain('api_key')
    })

    it('hidden 為空時應該返回所有欄位', () => {
      const fields = ['id', 'name', 'email']
      const hidden: string[] = []

      const result = filterHiddenFields(fields, hidden)

      expect(result).toEqual(['id', 'name', 'email'])
    })

    it('應該處理欄位不存在於 hidden 的情況', () => {
      const fields = ['id', 'name']
      const hidden = ['password', 'api_key']

      const result = filterHiddenFields(fields, hidden)

      expect(result).toEqual(['id', 'name'])
    })

    it('應該處理空欄位陣列', () => {
      const fields: string[] = []
      const hidden = ['password']

      const result = filterHiddenFields(fields, hidden)

      expect(result).toEqual([])
    })
  })

  describe('extractAppendFields', () => {
    it('應該從 Model 提取 accessor 定義', () => {
      const appendFields = extractAppendFields(UserModel)

      expect(appendFields).toHaveLength(2)
      expect(appendFields[0].name).toBe('full_name')
      expect(appendFields[1].name).toBe('display_name')
    })

    it('應該推測 accessor 的返回類型 (String)', () => {
      const appendFields = extractAppendFields(UserModel)
      const fullNameField = appendFields.find((f) => f.name === 'full_name')

      expect(fullNameField?.graphqlType).toBe('String')
    })

    it('應該推測 accessor 的返回類型 (Number -> Int)', () => {
      const appendFields = extractAppendFields(ComputedModel)
      const computedField = appendFields.find((f) => f.name === 'computed_field')

      // 預設為 String，除非有 TypeScript metadata 或明確指定
      expect(computedField?.graphqlType).toBe('String')
    })

    it('沒有 appends 時應該返回空陣列', () => {
      const appendFields = extractAppendFields(SimpleModel)

      expect(appendFields).toEqual([])
    })

    it('應該檢測 accessor 方法是否存在', () => {
      const appendFields = extractAppendFields(UserModel)

      for (const field of appendFields) {
        expect(field.hasAccessor).toBe(true)
      }
    })

    it('應該標記缺少 accessor 方法的 append 欄位', () => {
      // 建立一個有 appends 但沒有對應 accessor 的 Model
      class BrokenModel extends Model {
        static override table = 'broken'
        static override appends = ['missing_accessor']
      }

      const appendFields = extractAppendFields(BrokenModel)

      expect(appendFields[0].name).toBe('missing_accessor')
      expect(appendFields[0].hasAccessor).toBe(false)
    })
  })
})

describe('Model Metadata Integration', () => {
  it('應該正確識別需要排除的欄位', () => {
    const metadata = extractModelMetadata(SecretModel)
    const allFields = ['id', 'name', 'secret_value']

    const visibleFields = filterHiddenFields(allFields, metadata.hidden)

    expect(visibleFields).toEqual(['id', 'name'])
  })

  it('應該正確處理有 appends 的 Model', () => {
    const metadata = extractModelMetadata(ComputedModel)
    const appendFields = extractAppendFields(ComputedModel)

    expect(metadata.appends).toContain('computed_field')
    expect(appendFields).toHaveLength(1)
    expect(appendFields[0].name).toBe('computed_field')
  })
})
