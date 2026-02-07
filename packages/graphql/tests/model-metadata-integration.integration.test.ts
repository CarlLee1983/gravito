/**
 * Model Metadata 與 Atlas GraphQL 整合測試
 * 測試 hidden 欄位排除和 appends 欄位產生
 */
import { beforeAll, describe, expect, it } from 'bun:test'
import { DB, Model, Schema, SchemaRegistry } from '@gravito/atlas'
import { createYoga } from 'graphql-yoga'
import { createAtlasSchema } from '../src/atlas'

// 測試用 Model - 有 hidden 和 appends
class Employee extends Model {
  static override table = 'employees'
  static override hidden = ['salary', 'ssn']
  static override appends = ['display_name']
  static override casts = {
    salary: 'decimal',
    is_active: 'boolean',
  }

  declare id: number
  declare first_name: string
  declare last_name: string
  declare email: string
  declare salary: number
  declare ssn: string
  declare is_active: boolean

  // Accessor
  getDisplayNameAttribute(): string {
    return `${this.first_name} ${this.last_name}`
  }
}

// 測試用 Model - 沒有 hidden 和 appends
class Department extends Model {
  static override table = 'departments'

  declare id: number
  declare name: string
  declare code: string
}

describe('Model Metadata Integration with Atlas GraphQL', () => {
  beforeAll(async () => {
    // Setup Atlas (In-Memory SQLite)
    DB.addConnection('metadata-test', {
      driver: 'sqlite',
      database: ':memory:',
    })

    // 設定 Employee 和 Department 使用此連線
    Employee.connection = 'metadata-test'
    Department.connection = 'metadata-test'

    // Initialize SchemaRegistry in JIT mode
    SchemaRegistry.init({ mode: 'jit' })

    // 建立 employees 表
    await Schema.connection('metadata-test').create('employees', (t) => {
      t.id()
      t.string('first_name')
      t.string('last_name')
      t.string('email')
      t.decimal('salary')
      t.string('ssn')
      t.boolean('is_active')
      t.timestamps()
    })

    // 建立 departments 表
    await Schema.connection('metadata-test').create('departments', (t) => {
      t.id()
      t.string('name')
      t.string('code')
      t.timestamps()
    })

    // 插入測試資料
    await DB.connection('metadata-test').table('employees').insert({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      salary: 50000.0,
      ssn: '123-45-6789',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })

    await DB.connection('metadata-test').table('departments').insert({
      name: 'Engineering',
      code: 'ENG',
      created_at: new Date(),
      updated_at: new Date(),
    })
  })

  describe('Hidden Fields', () => {
    it('GraphQL Schema 不應該包含 hidden 欄位', async () => {
      const schema = await createAtlasSchema({
        models: [Employee],
      })

      const yoga = createYoga({ schema })

      // 使用 introspection 查詢 Employee 類型的欄位
      const res = await yoga.fetch('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              __type(name: "Employee") {
                fields {
                  name
                }
              }
            }
          `,
        }),
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test result
      const result: unknown = await res.json()
      expect(result.errors).toBeUndefined()

      const fieldNames = result.data.__type.fields.map((f: { name: string }) => f.name)

      // 應該包含的欄位
      expect(fieldNames).toContain('id')
      expect(fieldNames).toContain('first_name')
      expect(fieldNames).toContain('last_name')
      expect(fieldNames).toContain('email')
      expect(fieldNames).toContain('is_active')

      // 不應該包含 hidden 欄位
      expect(fieldNames).not.toContain('salary')
      expect(fieldNames).not.toContain('ssn')
    })

    it('查詢結果不應該返回 hidden 欄位', async () => {
      const schema = await createAtlasSchema({
        models: [Employee],
      })

      const yoga = createYoga({ schema })

      const res = await yoga.fetch('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              employee(id: 1) {
                id
                first_name
                last_name
                email
              }
            }
          `,
        }),
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test result
      const result: unknown = await res.json()
      expect(result.errors).toBeUndefined()
      expect(result.data.employee.first_name).toBe('John')
      expect(result.data.employee.last_name).toBe('Doe')

      // 確認無法查詢 hidden 欄位
      expect(result.data.employee.salary).toBeUndefined()
      expect(result.data.employee.ssn).toBeUndefined()
    })

    it('CreateInput 不應該包含 hidden 欄位', async () => {
      const schema = await createAtlasSchema({
        models: [Employee],
      })

      const yoga = createYoga({ schema })

      const res = await yoga.fetch('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              __type(name: "CreateEmployeeInput") {
                inputFields {
                  name
                }
              }
            }
          `,
        }),
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test result
      const result: unknown = await res.json()
      expect(result.errors).toBeUndefined()

      const fieldNames = result.data.__type.inputFields.map((f: { name: string }) => f.name)

      // 不應該包含 hidden 欄位
      expect(fieldNames).not.toContain('salary')
      expect(fieldNames).not.toContain('ssn')
    })
  })

  describe('Appends Fields', () => {
    it('GraphQL Schema 應該包含 appends 定義的虛擬欄位', async () => {
      const schema = await createAtlasSchema({
        models: [Employee],
      })

      const yoga = createYoga({ schema })

      const res = await yoga.fetch('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              __type(name: "Employee") {
                fields {
                  name
                  type {
                    name
                    kind
                  }
                }
              }
            }
          `,
        }),
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test result
      const result: unknown = await res.json()
      expect(result.errors).toBeUndefined()

      const fieldNames = result.data.__type.fields.map((f: { name: string }) => f.name)

      // 應該包含 appends 欄位
      expect(fieldNames).toContain('display_name')
    })

    it('查詢應該能正確返回 accessor 計算的值', async () => {
      const schema = await createAtlasSchema({
        models: [Employee],
      })

      const yoga = createYoga({ schema })

      const res = await yoga.fetch('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              employee(id: 1) {
                id
                first_name
                last_name
                display_name
              }
            }
          `,
        }),
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test result
      const result: unknown = await res.json()
      expect(result.errors).toBeUndefined()
      expect(result.data.employee.first_name).toBe('John')
      expect(result.data.employee.last_name).toBe('Doe')
      expect(result.data.employee.display_name).toBe('John Doe')
    })
  })

  describe('Model Without Hidden/Appends', () => {
    it('沒有 hidden 的 Model 應該包含所有欄位', async () => {
      const schema = await createAtlasSchema({
        models: [Department],
      })

      const yoga = createYoga({ schema })

      const res = await yoga.fetch('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              __type(name: "Department") {
                fields {
                  name
                }
              }
            }
          `,
        }),
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test result
      const result: unknown = await res.json()
      expect(result.errors).toBeUndefined()

      const fieldNames = result.data.__type.fields.map((f: { name: string }) => f.name)

      expect(fieldNames).toContain('id')
      expect(fieldNames).toContain('name')
      expect(fieldNames).toContain('code')
    })

    it('沒有 appends 的 Model 不應該有額外欄位', async () => {
      const schema = await createAtlasSchema({
        models: [Department],
      })

      const yoga = createYoga({ schema })

      const res = await yoga.fetch('http://localhost/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              department(id: 1) {
                id
                name
                code
              }
            }
          `,
        }),
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test result
      const result: unknown = await res.json()
      expect(result.errors).toBeUndefined()
      expect(result.data.department.name).toBe('Engineering')
      expect(result.data.department.code).toBe('ENG')
    })
  })
})
