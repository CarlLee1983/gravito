import { describe, expect, test } from 'bun:test'
import type { OpenAPIV3_1 } from 'openapi-types'
import { OpenApiGenerator } from '../src/OpenApiGenerator'

describe('Type Safety', () => {
  test('generate() should return OpenAPIV3_1.Document', () => {
    const gen = new OpenApiGenerator({ contracts: [] })
    const spec = gen.generate([])

    // 編譯時型別檢查
    const _info: OpenAPIV3_1.InfoObject = spec.info
    const _paths: OpenAPIV3_1.PathsObject = spec.paths
    expect(spec.openapi).toBe('3.1.0')
  })

  test('generate() should include required OpenAPI 3.1 fields', () => {
    const gen = new OpenApiGenerator({
      title: 'Test API',
      version: '2.0.0',
      description: 'Test Description',
      contracts: [],
    })
    const spec = gen.generate([])

    // 驗證型別結構
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.info.title).toBe('Test API')
    expect(spec.info.version).toBe('2.0.0')
    expect(spec.info.description).toBe('Test Description')
    expect(spec.paths).toBeDefined()
    expect(spec.components).toBeDefined()

    // 型別檢查：確保回傳值符合 OpenAPIV3_1.Document
    const _document: OpenAPIV3_1.Document = spec
    expect(_document).toBe(spec)
  })

  test('spec.paths should conform to OpenAPIV3_1.PathsObject', () => {
    const gen = new OpenApiGenerator({ contracts: [] })
    const spec = gen.generate([])

    // 型別檢查
    const _paths: OpenAPIV3_1.PathsObject = spec.paths
    expect(typeof spec.paths).toBe('object')
  })

  test('spec.components.schemas should conform to OpenAPIV3_1.SchemaObject', () => {
    const gen = new OpenApiGenerator({ contracts: [] })
    const spec = gen.generate([])

    // 型別檢查
    if (spec.components?.schemas) {
      const _schemas: Record<string, OpenAPIV3_1.SchemaObject> = spec.components.schemas
      expect(typeof spec.components.schemas).toBe('object')
    }
  })
})
