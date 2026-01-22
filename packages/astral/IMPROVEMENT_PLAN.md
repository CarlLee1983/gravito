# @gravito/astral 優化改善計劃

> 版本：1.0
> 建立日期：2026-01-22
> 目標模組：@gravito/astral v0.1.2

---

## 目錄

1. [現況分析](#現況分析)
2. [改善目標](#改善目標)
3. [改善項目](#改善項目)
4. [實施優先順序](#實施優先順序)
5. [預期效益](#預期效益)

---

## 現況分析

### 模組概述

`@gravito/astral` 是一個 Schema 驅動的 OpenAPI 生成器，採用「影子契約」(Shadow Contracts) 設計模式，將 API 文檔定義與業務邏輯分離。

**核心統計：**

| 項目 | 數值 |
|------|------|
| 總代碼行數 | 507 行 |
| 源代碼 | 385 行 |
| 測試代碼 | 122 行 |
| 測試覆蓋閾值 | 10% |
| 當前版本 | 0.1.2 |

### 架構組成

```
packages/astral/
├── src/
│   ├── index.ts              # 主入口與公開 API (122 行)
│   ├── OpenApiGenerator.ts   # OpenAPI 生成核心 (197 行)
│   └── types.ts              # 類型定義 (66 行)
├── tests/
│   └── generator.test.ts     # 測試套件 (122 行)
└── dist/                     # 編譯輸出 (ESM + CJS)
```

### 現有優勢

1. **設計理念清晰** - Shadow Contracts 模式有效分離關注點
2. **輕量化實現** - 核心代碼精簡，維護負擔低
3. **雙模組支援** - 同時支援 ESM 和 CommonJS
4. **整合性良好** - 與 Gravito Orbit 系統無縫整合
5. **即時文檔** - 內建 Swagger UI 提供實時 API 文檔

### 現有問題

| 問題領域 | 嚴重程度 | 描述 |
|----------|----------|------|
| 測試覆蓋率 | 🔴 高 | 覆蓋率閾值僅 10%，存在潛在穩定性風險 |
| 功能完整性 | 🟡 中 | 缺少 OpenAPI 3.1.0 多項規範支援 |
| 類型安全性 | 🟡 中 | 部分類型定義不完整 |
| 文檔完整性 | 🟡 中 | API 文檔與進階用法說明不足 |
| 擴展機制 | 🟠 低 | 缺乏插件系統與自定義擴展點 |

---

## 改善目標

### 短期目標（1-2 個迭代週期）

- [ ] 提升測試覆蓋率至 50%
- [ ] 完善核心功能的類型定義
- [ ] 補齊 OpenAPI 3.1.0 基礎規範支援

### 中期目標（3-4 個迭代週期）

- [ ] 提升測試覆蓋率至 80%
- [ ] 實現完整的 OpenAPI 3.1.0 規範支援
- [ ] 建立完整的 API 文檔與使用指南
- [ ] 優化效能與錯誤處理機制

### 長期目標（5+ 個迭代週期）

- [ ] 建立插件系統支援自定義擴展
- [ ] 支援 OpenAPI 3.1.0 以外的規範（如 AsyncAPI）
- [ ] 提供 CLI 工具支援獨立使用

---

## 改善項目

### 1. 測試覆蓋強化

**現況：** 測試覆蓋率閾值僅 10%，測試用例 6 個

**改善內容：**

#### 1.1 增加單元測試

```typescript
// 建議新增的測試用例

// OpenApiGenerator 測試
- [ ] 測試 normalizePath() 各種路徑格式
- [ ] 測試 inferOperationKey() 所有 HTTP 方法推斷
- [ ] 測試 extractZodSchema() 邊界情況
- [ ] 測試 buildOperation() 完整參數組合
- [ ] 測試 nested Zod schema 轉換

// OrbitAstral 測試
- [ ] 測試 configure() 配置合併邏輯
- [ ] 測試 install() 路由註冊
- [ ] 測試 Swagger UI HTML 生成
- [ ] 測試 /openapi.json 端點回應格式

// 錯誤處理測試
- [ ] 測試無效 schema 輸入
- [ ] 測試缺失必要欄位
- [ ] 測試循環引用處理
```

#### 1.2 整合測試

```typescript
// 建議新增的整合測試

- [ ] 完整 REST 資源生命週期測試
- [ ] 多資源契約整合測試
- [ ] 與 @gravito/core 路由系統整合測試
- [ ] 與 @gravito/impulse FormRequest 整合測試
```

#### 1.3 測試配置優化

```json
// package.json 調整建議
{
  "scripts": {
    "test:coverage": "bun test --coverage --coverage-threshold=50",
    "test:ci": "bun test --coverage --coverage-threshold=80"
  }
}
```

---

### 2. OpenAPI 規範完整性

**現況：** 基礎 OpenAPI 3.1.0 支援，缺少多項進階功能

**改善內容：**

#### 2.1 Components 支援

```typescript
// 目前缺失，建議新增支援

interface AstralConfig {
  // 新增欄位
  servers?: OpenAPIServer[]
  securitySchemes?: Record<string, SecurityScheme>
  components?: {
    schemas?: Record<string, ZodSchema>
    responses?: Record<string, ResponseObject>
    parameters?: Record<string, ParameterObject>
  }
}
```

#### 2.2 Security 定義支援

```typescript
// 建議新增的安全性定義支援

interface AstralOperation {
  // 新增欄位
  security?: SecurityRequirement[]
  deprecated?: boolean
}

// 使用範例
astral.resource('/users', {
  operations: {
    index: {
      security: [{ bearerAuth: [] }],
      // ...
    }
  }
})
```

#### 2.3 請求/回應範例支援

```typescript
// 建議新增 examples 支援

interface AstralOperation {
  // 新增欄位
  examples?: {
    request?: Record<string, ExampleObject>
    response?: Record<string, ExampleObject>
  }
}
```

#### 2.4 Tags 增強

```typescript
// 建議新增全域 tags 定義

interface AstralConfig {
  // 新增欄位
  tags?: Array<{
    name: string
    description?: string
    externalDocs?: ExternalDocumentation
  }>
}
```

---

### 3. 類型系統強化

**現況：** 基礎類型定義完整，部分欄位處理邏輯未實現

**改善內容：**

#### 3.1 完善 AstralOperation 類型

```typescript
// src/types.ts 改善建議

export interface AstralOperation {
  summary?: string
  description?: string
  tags?: string[]
  input?: FormRequestClass | ZodSchema
  output?: ZodSchema | ZodSchema[]
  errors?: Record<number, string | ZodSchema>

  // 以下欄位需完善處理邏輯
  status?: number           // 目前定義但未使用
  params?: Record<string, ZodSchema>  // 目前定義但未使用

  // 建議新增
  operationId?: string
  deprecated?: boolean
  security?: SecurityRequirement[]
  requestBody?: {
    description?: string
    required?: boolean
    content?: Record<string, MediaTypeObject>
  }
}
```

#### 3.2 強化泛型支援

```typescript
// 建議新增泛型型別推斷

type InferInput<T extends AstralOperation> =
  T['input'] extends ZodSchema<infer U> ? U : never

type InferOutput<T extends AstralOperation> =
  T['output'] extends ZodSchema<infer U> ? U : never

// 使用時可獲得完整型別推斷
const op: AstralOperation = {
  input: UserCreateSchema,
  output: UserSchema
}
```

#### 3.3 FormRequest 類型支援增強

```typescript
// 建議改善 FormRequest 類型提取

interface FormRequestClass {
  new (): { schema: () => ZodSchema }
  // 新增靜態方法支援
  schema?: () => ZodSchema
}
```

---

### 4. 文檔完整性

**現況：** README 基礎完整，缺少進階文檔

**改善內容：**

#### 4.1 API 參考文檔

```markdown
// 建議新增 docs/API.md

# API 參考

## astral.resource()
## OrbitAstral
## AstralConfig
## AstralResource
## AstralOperation
```

#### 4.2 進階使用指南

```markdown
// 建議新增 docs/ADVANCED.md

# 進階使用指南

## 自定義 Schema 轉換
## 錯誤回應處理
## 安全性設定
## 與其他 Orbit 整合
## 效能最佳化
```

#### 4.3 範例程式庫

```
// 建議新增 examples/ 目錄

examples/
├── basic-crud/           # 基礎 CRUD 範例
├── authentication/       # 認證整合範例
├── nested-resources/     # 巢狀資源範例
├── custom-errors/        # 自定義錯誤範例
└── full-featured/        # 完整功能展示
```

---

### 5. 效能與錯誤處理

**現況：** 基礎實現，缺少效能優化與完善錯誤處理

**改善內容：**

#### 5.1 快取機制

```typescript
// 建議新增 Schema 快取

class OpenApiGenerator {
  private schemaCache = new Map<string, JSONSchema>()

  private zodToSchema(schema: ZodSchema): JSONSchema {
    const cacheKey = this.getSchemaKey(schema)
    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey)!
    }
    const result = zodToJsonSchema(schema)
    this.schemaCache.set(cacheKey, result)
    return result
  }
}
```

#### 5.2 錯誤處理增強

```typescript
// 建議新增自定義錯誤類別

export class AstralConfigError extends Error {
  constructor(message: string, public field: string) {
    super(`Astral configuration error in '${field}': ${message}`)
    this.name = 'AstralConfigError'
  }
}

export class AstralSchemaError extends Error {
  constructor(message: string, public schema: ZodSchema) {
    super(`Schema conversion error: ${message}`)
    this.name = 'AstralSchemaError'
  }
}
```

#### 5.3 驗證機制

```typescript
// 建議新增配置驗證

class OrbitAstral {
  private validateConfig(config: AstralConfig): void {
    if (config.contracts) {
      for (const contract of config.contracts) {
        this.validateResource(contract)
      }
    }
  }

  private validateResource(resource: AstralResource): void {
    // 驗證路徑格式
    // 驗證操作定義
    // 驗證 schema 有效性
  }
}
```

---

### 6. 路由匹配優化

**現況：** 使用前綴匹配，可能導致誤匹配

**改善內容：**

#### 6.1 精確匹配演算法

```typescript
// 目前實現 (src/OpenApiGenerator.ts:85)
routes.filter(route =>
  this.normalizePath(route.path).startsWith(resourcePath)
)

// 建議改善
routes.filter(route => {
  const normalized = this.normalizePath(route.path)
  const resourcePattern = this.createPathPattern(resourcePath)
  return resourcePattern.test(normalized)
})
```

#### 6.2 路徑參數處理

```typescript
// 建議新增路徑參數型別推斷

private extractPathParams(path: string): PathParameter[] {
  const params: PathParameter[] = []
  const matches = path.matchAll(/:(\w+)/g)

  for (const match of matches) {
    params.push({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' }
    })
  }

  return params
}
```

---

### 7. 擴展機制

**現況：** 無插件系統

**改善內容：**

#### 7.1 插件介面設計

```typescript
// 建議新增插件系統

export interface AstralPlugin {
  name: string
  version: string

  // 生命週期鉤子
  onBeforeGenerate?(context: GeneratorContext): void
  onAfterGenerate?(spec: OpenAPISpec): OpenAPISpec

  // 擴展點
  schemaTransformer?(schema: ZodSchema): JSONSchema
  operationEnhancer?(operation: OperationObject): OperationObject
}

// 使用方式
OrbitAstral.configure({
  plugins: [
    authPlugin(),
    validationPlugin(),
  ]
})
```

#### 7.2 自定義轉換器

```typescript
// 建議新增自定義 schema 轉換器支援

interface AstralConfig {
  transformers?: {
    zod?: (schema: ZodSchema) => JSONSchema
    formRequest?: (cls: FormRequestClass) => JSONSchema
  }
}
```

---

## 實施優先順序

### 第一階段：基礎穩定性（優先級：最高）

| 項目 | 工作量 | 影響範圍 |
|------|--------|----------|
| 1.1 增加單元測試 | 中 | 穩定性 |
| 3.1 完善類型定義 | 小 | 開發體驗 |
| 5.2 錯誤處理增強 | 小 | 可維護性 |

### 第二階段：功能完整性（優先級：高）

| 項目 | 工作量 | 影響範圍 |
|------|--------|----------|
| 2.1 Components 支援 | 中 | 功能性 |
| 2.2 Security 定義支援 | 中 | 功能性 |
| 6.1 精確匹配演算法 | 小 | 正確性 |

### 第三階段：開發體驗（優先級：中）

| 項目 | 工作量 | 影響範圍 |
|------|--------|----------|
| 4.1 API 參考文檔 | 中 | 可用性 |
| 4.2 進階使用指南 | 中 | 可用性 |
| 4.3 範例程式庫 | 大 | 學習曲線 |

### 第四階段：進階功能（優先級：低）

| 項目 | 工作量 | 影響範圍 |
|------|--------|----------|
| 2.3 範例支援 | 小 | 文檔品質 |
| 5.1 快取機制 | 中 | 效能 |
| 7.1 插件系統 | 大 | 擴展性 |

---

## 預期效益

### 量化效益

| 指標 | 現況 | 目標 | 提升幅度 |
|------|------|------|----------|
| 測試覆蓋率 | 10% | 80% | +700% |
| OpenAPI 規範支援率 | ~60% | ~95% | +58% |
| 文檔完整度 | 40% | 90% | +125% |
| 類型覆蓋率 | 70% | 100% | +43% |

### 質化效益

1. **穩定性提升** - 完善的測試覆蓋減少回歸風險
2. **開發體驗改善** - 完整的類型定義與文檔降低學習成本
3. **功能完整性** - 支援更多 OpenAPI 規範滿足複雜需求
4. **可維護性增強** - 清晰的錯誤處理與驗證機制便於除錯
5. **擴展彈性** - 插件系統支援社群貢獻與自定義需求

---

## 附錄

### A. 相關資源

- [OpenAPI 3.1.0 規範](https://spec.openapis.org/oas/v3.1.0)
- [Zod 文檔](https://zod.dev)
- [zod-to-json-schema](https://github.com/StefanTerdell/zod-to-json-schema)

### B. 版本紀錄

| 日期 | 版本 | 變更說明 |
|------|------|----------|
| 2026-01-22 | 1.0 | 初版建立 |

---

*本文件由 Gravito 團隊維護*
