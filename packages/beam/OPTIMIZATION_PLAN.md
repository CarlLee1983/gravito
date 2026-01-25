# @gravito/beam 優化改進計劃

## 專案概述

`@gravito/beam` 是一個輕量級、類型安全的 HTTP 客戶端封裝，提供類似 tRPC 的開發體驗，但具有零執行時開銷。目前版本為 `1.0.0-beta.1`。

## 現況分析

### 優點

- ✅ 零執行時開銷，純類型封裝
- ✅ 完整的 TypeScript 類型推導
- ✅ 支援 `AppType` 和 `AppRoutes` 兩種模式
- ✅ 輕量級（< 1kb）
- ✅ 清晰的 JSDoc 文件

### 改進機會

| 領域 | 現況 | 影響程度 |
|------|------|----------|
| 錯誤處理 | 依賴底層 fetch，無專門處理 | 高 |
| 測試覆蓋 | 僅基本單元測試，缺乏整合測試 | 高 |
| 請求配置 | 缺乏超時、重試等進階選項 | 中 |
| 開發體驗 | 缺乏請求/響應攔截器 | 中 |
| 文件完善 | 缺乏進階使用範例和故障排除指南 | 低 |

---

## 改進計劃

### Phase 1：核心功能增強（高優先級）

#### 1.1 增強錯誤處理

**目標**：提供結構化的錯誤類型，便於前端統一處理

```typescript
// 新增 errors.ts
export class BeamError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'BeamError'
  }
}

export class BeamNetworkError extends BeamError {
  constructor(message: string, cause?: unknown) {
    super(message, undefined, 'NETWORK_ERROR', cause)
    this.name = 'BeamNetworkError'
  }
}

export class BeamTimeoutError extends BeamError {
  constructor(message: string) {
    super(message, undefined, 'TIMEOUT')
    this.name = 'BeamTimeoutError'
  }
}
```

**預期效益**：
- 統一錯誤格式，便於前端處理
- 提供錯誤分類，支援不同的錯誤處理策略
- 改善除錯體驗

#### 1.2 擴展配置選項

**目標**：提供更完整的請求配置

```typescript
// 更新 types.ts
export interface BeamOptions extends Omit<RequestInit, 'headers'> {
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>)

  /** 請求超時時間（毫秒），預設 30000 */
  timeout?: number

  /** 重試配置 */
  retry?: {
    /** 最大重試次數，預設 0 */
    count?: number
    /** 重試延遲（毫秒），預設 1000 */
    delay?: number
    /** 應該重試的狀態碼，預設 [408, 429, 500, 502, 503, 504] */
    statusCodes?: number[]
  }

  /** 請求前攔截器 */
  onRequest?: (config: RequestInit) => RequestInit | Promise<RequestInit>

  /** 響應後攔截器 */
  onResponse?: (response: Response) => Response | Promise<Response>

  /** 錯誤攔截器 */
  onError?: (error: BeamError) => void | Promise<void>
}
```

**預期效益**：
- 靈活的超時控制
- 內建重試機制，提升穩定性
- 攔截器支援，便於統一處理認證、日誌等

#### 1.3 提升測試覆蓋率

**目標**：達到 90%+ 測試覆蓋率

**新增測試項目**：

```typescript
// tests/integration.test.ts - 整合測試
describe('Integration Tests', () => {
  // 使用 mock server 進行實際 HTTP 測試
  test('should handle successful GET request')
  test('should handle successful POST request with body')
  test('should handle 4xx errors correctly')
  test('should handle 5xx errors correctly')
  test('should handle network errors')
  test('should timeout after specified duration')
  test('should retry on configured status codes')
})

// tests/interceptors.test.ts - 攔截器測試
describe('Interceptors', () => {
  test('onRequest should modify request config')
  test('onResponse should process response')
  test('onError should handle errors')
})

// tests/types.test.ts - 類型測試
describe('Type Inference', () => {
  test('should infer correct request body type')
  test('should infer correct response type')
  test('should handle query parameters')
  test('should handle path parameters')
})
```

**預期效益**：
- 確保功能正確性
- 防止回歸問題
- 提供使用範例

---

### Phase 2：開發體驗優化（中優先級）

#### 2.1 新增工具函式

**目標**：提供常用的輔助函式

```typescript
// 新增 utils.ts

/**
 * 創建帶有認證的客戶端
 */
export function createAuthenticatedBeam<T>(
  baseUrl: string,
  getToken: () => string | Promise<string>,
  options?: Omit<BeamOptions, 'headers'>
) {
  return createBeam<T>(baseUrl, {
    ...options,
    headers: async () => ({
      Authorization: `Bearer ${await getToken()}`
    })
  })
}

/**
 * 響應輔助函式
 */
export async function unwrapResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new BeamError(
      `Request failed with status ${response.status}`,
      response.status
    )
  }
  return response.json()
}

/**
 * 安全解析響應（不拋出錯誤）
 */
export async function safeResponse<T>(
  response: Response
): Promise<{ data: T; error: null } | { data: null; error: BeamError }> {
  try {
    if (!response.ok) {
      return {
        data: null,
        error: new BeamError(`Request failed`, response.status)
      }
    }
    return { data: await response.json(), error: null }
  } catch (e) {
    return { data: null, error: new BeamError('Parse error', undefined, 'PARSE_ERROR', e) }
  }
}
```

**預期效益**：
- 減少樣板程式碼
- 提供最佳實踐範例
- 統一錯誤處理模式

#### 2.2 React 整合（選用）

**目標**：提供 React Query / SWR 整合範例

```typescript
// examples/react-query.ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { createBeam } from '@gravito/beam'
import type { AppRoutes } from './server/types'

const client = createBeam<AppRoutes>('http://localhost:3000')

// 範例：使用 React Query
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await client.api.users[':id'].$get({ param: { id: userId } })
      return res.json()
    }
  })
}
```

**預期效益**：
- 降低整合門檻
- 提供生產級範例

---

### Phase 3：文件完善（低優先級）

#### 3.1 擴展 README

**新增章節**：
- 進階配置範例
- 錯誤處理最佳實踐
- 常見問題 (FAQ)
- 與其他方案比較（tRPC, axios, ky）
- 效能基準測試結果

#### 3.2 新增繁體中文文件

基於現有 README 結構，提供完整的繁體中文翻譯版本 `README.zh-TW.md`。

---

## 實作排程

| 階段 | 項目 | 狀態 |
|------|------|------|
| Phase 1.1 | 增強錯誤處理 | 待開始 |
| Phase 1.2 | 擴展配置選項 | 待開始 |
| Phase 1.3 | 提升測試覆蓋率 | 待開始 |
| Phase 2.1 | 新增工具函式 | 待開始 |
| Phase 2.2 | React 整合範例 | 待開始 |
| Phase 3.1 | 擴展 README | 待開始 |
| Phase 3.2 | 繁體中文文件 | 待開始 |

---

## 注意事項

### 設計原則

1. **保持零執行時開銷** - 任何新功能都不應增加不必要的抽象層
2. **向後相容** - 現有 API 必須保持相容
3. **可選功能** - 進階功能應為可選，不影響基本使用
4. **類型優先** - 所有新功能必須提供完整的類型定義

### 相依性管理

- 避免新增外部相依性
- 必要時優先使用 workspace 內的套件

### 測試要求

- 新功能必須附帶單元測試
- 整合測試使用 mock server
- 維持 80%+ 測試覆蓋率

---

## 參考資源

- [Photon Client 文件](../photon/README.md)
- [tRPC 設計理念](https://trpc.io/)
- [Ky HTTP 客戶端](https://github.com/sindresorhus/ky)
