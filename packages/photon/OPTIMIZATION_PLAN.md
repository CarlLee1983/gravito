# @gravito/photon 優化執行計劃

## 執行摘要

本計劃針對 `packages/photon/` 包進行全面優化，解決性能瓶頸、類型安全問題、代碼質量缺陷，並提升測試覆蓋率。預估性能提升 **10-30%**，類型安全從 ~60% 提升到 ~95%。

## 背景分析

@gravito/photon 是一個輕量級 Hono 框架包裝層（68 行代碼，9 個文件），提供品牌化別名和 CBOR 二進制中間件。當前存在以下關鍵問題：

- **性能關鍵問題**：binaryMiddleware 存在不必要的內存分配和克隆操作
- **類型安全嚴重不足**：JWT 模塊所有類型都退化為 `any`
- **測試覆蓋率不足**：binary.ts 完全未測試（0% 函數覆蓋率）
- **代碼質量問題**：循環依賴、錯誤消息 bug、ESM/CommonJS 混用

---

## Phase 1: 修復關鍵性能瓶頸

### 1.1 優化 binaryMiddleware（最高優先級）

**目標文件**: `packages/photon/src/middleware/binary.ts`

**當前問題**（第 19-26 行）:
```typescript
const body = await c.res.clone().json()  // ❌ 不必要的 clone
const encoded = encode(body)
c.res = new Response(encoded as any, {   // ❌ 多次內存分配
  status: c.res.status,
  headers: new Headers(c.res.headers),   // ❌ Headers 重建
})
```

**優化策略**:

#### 選項 A：直接讀取原始響應體（推薦）
```typescript
// 避免 clone，直接讀取並消費原響應體
const body = await c.res.json()
const encoded = encode(body)

// 重用現有 headers 對象
const headers = c.res.headers
headers.set('Content-Type', 'application/cbor')

c.res = new Response(encoded, {
  status: c.res.status,
  headers: headers,
})
```

**優點**:
- 消除 `clone()` 開銷（~30% 性能提升）
- 減少內存分配次數（4 次 → 1 次）
- 移除不必要的 `as any` 類型斷言
- 代碼更清晰簡潔

**注意事項**:
- `c.res.json()` 會消費響應體，不能再次讀取（這是預期行為）
- 需要測試確保在錯誤情況下不會破壞響應

#### 選項 B：條件性優化（保守方案）
如果擔心兼容性問題，可以先添加快速路徑：
```typescript
// 檢查是否可以直接訪問 body
if (c.res.bodyUsed) {
  // 已經被讀取，無法優化
  return
}

const body = await c.res.json()
// ... 其餘同選項 A
```

**實施步驟**:
1. 修改 `binary.ts:19-26` 實現選項 A 的優化
2. 移除 `as any` 類型斷言（第 23 行）
3. 運行現有測試確保無破壞性變更
4. 進行性能基準測試驗證改進

**預估影響**: 性能提升 15-30%，代碼行數減少 2 行

---

## Phase 2: 完善類型安全

### 2.1 修復 JWT 模塊類型定義

**目標文件**: `packages/photon/src/jwt.ts`

**問題清單**:
1. **行 25-28**: 所有類型都是 `any`
2. **行 8**: 函數參數使用 `any[]`
3. **行 11**: 錯誤消息 bug - `${name}` 應為 `${_name}`
4. **行 5**: CommonJS require 在 ESM 項目中

**優化策略**:

#### 2.1.1 正確導入 Hono JWT 類型

```typescript
// 移除: const honoJwt = require('hono/jwt')
// 改為正確的 ESM 動態導入
import * as honoJwt from 'hono/jwt'

// 導入具體類型
import type {
  JWTPayload as HonoJWTPayload,
  SignatureAlgorithm,
} from 'hono/utils/jwt/types'
```

**如果遇到 ESM 導入問題**:
- 檢查 `tsconfig.json` 的 `moduleResolution` 設置
- 確認 `hono` 版本是否支持 ESM 導出
- 考慮更新 `package.json` 的 `type: "module"`

#### 2.1.2 替換 any 類型為具體類型

```typescript
// 當前（第 25-28 行）
export type JwtPayload = any
export type JwtHeader = any
export type JwtOptions = any
export type JwtFunction = (options: any) => MiddlewareHandler

// 優化後
export type JwtPayload = HonoJWTPayload
export type JwtHeader = {
  alg: SignatureAlgorithm
  typ?: string
  kid?: string
}
export type JwtOptions = {
  secret: string | BufferSource
  alg?: SignatureAlgorithm
  cookie?: string
}
export type JwtFunction = (options: JwtOptions) => MiddlewareHandler
```

#### 2.1.3 改進 ensure 函數類型安全

```typescript
// 當前（第 7-14 行）
const ensure =
  <T extends (...args: any[]) => any>(fn: T | undefined, _name: string) =>
  (...args: Parameters<T>): ReturnType<T> => {
    if (!fn) {
      throw new Error(`hono/jwt helper '\${name}' is not available`)  // ❌ bug
    }
    return fn(...args)
  }

// 優化後
const ensure = <T extends (...args: never[]) => unknown>(
  fn: T | undefined,
  name: string  // 移除下劃線，直接使用
): T => {
  if (!fn) {
    throw new Error(`hono/jwt helper '${name}' is not available`)  // ✅ 修復
  }
  return fn
}
```

**改進點**:
- 移除 `any[]`，使用 `never[]` 或具體類型
- 修復錯誤消息變量名（`${name}` 不是 `${_name}`）
- 返回類型更精確（直接返回函數而非包裝）
- 簡化調用邏輯

**實施步驟**:
1. 修改導入語句，從 CommonJS 改為 ESM（第 5 行）
2. 導入正確的 Hono JWT 類型定義
3. 替換所有 `any` 類型（第 8, 25-28 行）
4. 修復 ensure 函數的錯誤消息 bug（第 11 行）
5. 運行 `bun run typecheck` 確保無類型錯誤
6. 運行現有 JWT 測試確保功能正常

**預估影響**: 類型覆蓋率從 ~40% 提升到 ~95%

---

## Phase 3: 消除循環依賴

### 3.1 修復 binary.ts 的自引用導入

**目標文件**: `packages/photon/src/middleware/binary.ts:1`

**當前問題**:
```typescript
import type { MiddlewareHandler } from '@gravito/photon'  // ❌ 循環依賴
```

**修復方案**:
```typescript
import type { MiddlewareHandler } from 'hono'  // ✅ 直接從源頭導入
```

**原因分析**:
- `@gravito/photon` 只是重新導出 `hono` 的內容
- 沒有添加任何包裝或修改
- 直接從 `hono` 導入可避免循環依賴和構建順序問題

**實施步驟**:
1. 修改第 1 行導入語句
2. 運行 `bun run build` 確保構建成功
3. 運行 `bun run typecheck` 確保類型正確

**預估影響**:
- 減少構建時間（避免循環解析）
- 消除潛在的類型解析問題
- 改善代碼可維護性

---

## Phase 4: 提升測試覆蓋率

### 4.1 為 binaryMiddleware 添加完整測試套件

**目標**: 創建新文件 `packages/photon/tests/middleware-binary.test.ts`

**測試用例清單**:

#### 基本功能測試
1. **CBOR 編碼正常響應**
   ```typescript
   it('encodes JSON response as CBOR when Accept header is application/cbor')
   ```
   - 發送帶 `Accept: application/cbor` 的請求
   - 驗證響應 Content-Type 為 `application/cbor`
   - 驗證響應體可被 CBOR 解碼
   - 驗證解碼後數據與原始 JSON 匹配

2. **不影響非 CBOR 請求**
   ```typescript
   it('does not modify response when Accept header is not application/cbor')
   ```
   - 發送普通 JSON 請求
   - 驗證響應仍為 JSON 格式

3. **正確處理狀態碼**
   ```typescript
   it('preserves response status code')
   ```
   - 測試 200, 201, 400, 404, 500 等狀態碼
   - 驗證 CBOR 編碼後狀態碼不變

4. **保留響應頭**
   ```typescript
   it('preserves custom response headers')
   ```
   - 添加自定義 header (如 `X-Request-ID`)
   - 驗證 CBOR 響應中保留這些 header

#### 邊緣情況測試
5. **處理空響應體**
   ```typescript
   it('handles empty response body')
   ```

6. **處理非 JSON Content-Type**
   ```typescript
   it('skips encoding when Content-Type is not JSON')
   ```

7. **處理大型 JSON 對象**
   ```typescript
   it('encodes large JSON objects efficiently')
   ```
   - 測試包含 10000+ 元素的數組
   - 驗證性能和記憶體使用

#### 性能基準測試
8. **性能回歸測試**
   ```typescript
   it('encodes response within acceptable time threshold')
   ```
   - 測試 1000 次編碼操作
   - 驗證平均時間 < 5ms
   - 與優化前對比（如有基準數據）

**測試結構範例**:
```typescript
import { describe, expect, it } from 'bun:test'
import { Photon } from '../src/index'
import { binaryMiddleware } from '../src/middleware/binary'
import { decode } from 'cborg'

describe('binaryMiddleware', () => {
  it('encodes JSON response as CBOR when Accept header is application/cbor', async () => {
    const app = new Photon()
    app.use(binaryMiddleware())
    app.get('/test', (c) => c.json({ message: 'Hello CBOR' }))

    const res = await app.request('/test', {
      headers: { Accept: 'application/cbor' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/cbor')

    const body = await res.arrayBuffer()
    const decoded = decode(new Uint8Array(body))
    expect(decoded).toEqual({ message: 'Hello CBOR' })
  })

  // ... 其他測試
})
```

**實施步驟**:
1. 創建 `tests/middleware-binary.test.ts`
2. 實現上述 8 個測試用例
3. 運行 `bun test tests/middleware-binary.test.ts`
4. 運行 `bun run test:coverage` 確保覆蓋率達標
5. 驗證覆蓋率從 9.52% 提升到 >90%

**預估影響**:
- binary.ts 測試覆蓋率: 9.52% → >90%
- 整體包測試覆蓋率提升 ~30%

### 4.2 補充 JWT 模塊測試

**目標**: 擴展 `packages/photon/tests/exports.test.ts` 或創建獨立測試

**測試用例清單**:
1. **ensure 函數錯誤處理**
   ```typescript
   it('throws descriptive error when JWT function is unavailable')
   ```
   - 模擬 hono/jwt 不可用情況
   - 驗證錯誤消息正確（修復後）

2. **JWT 簽名和驗證**
   ```typescript
   it('signs and verifies JWT tokens correctly')
   ```

3. **類型安全驗證**
   ```typescript
   it('enforces correct types for JWT operations')
   ```
   - 使用 TypeScript 斷言測試
   - 確保無法傳入錯誤類型

**實施步驟**:
1. 在 `tests/exports.test.ts` 添加 JWT 功能測試
2. 運行測試驗證 JWT 模塊正確性
3. 驗證覆蓋率從 69.23% 提升到 >85%

---

## Phase 5: 代碼質量改進

### 5.1 移除不必要的類型斷言

**目標文件**: `packages/photon/src/middleware/binary.ts:23`

```typescript
// 當前
c.res = new Response(encoded as any, {

// 優化後
c.res = new Response(encoded, {
```

**原因**: `Uint8Array` 是有效的 `BodyInit` 類型，不需要 `as any`

### 5.2 評估構建配置優化

**目標文件**: `packages/photon/build.ts`

**當前設置**（第 22-23 行）:
```typescript
splitting: true,   // 對於小型包可能過度
minify: false,     // 生產構建應考慮啟用
```

**建議評估**:
1. **code splitting**:
   - 當前: 9 個入口點，啟用 splitting
   - 評估: 包總共只有 68 行，splitting 開銷可能大於收益
   - 建議: 保持現狀（支援按需加載）或禁用後測試 bundle 大小

2. **minification**:
   - 當前: `minify: false`
   - 建議: 添加環境變量控制
   ```typescript
   minify: process.env.NODE_ENV === 'production',
   ```

**實施步驟**:
1. 測試 `splitting: false` 的 bundle 大小差異
2. 如果差異 < 10%，考慮禁用以簡化構建
3. 添加條件 minify 支援

### 5.3 文檔改進

**目標文件**: `packages/photon/src/middleware/binary.ts`

當前文檔不足，需添加：
- 使用示例
- 性能特性說明
- 客戶端 CBOR 解碼範例
- 何時使用 CBOR vs JSON 的指引

**擴展文檔範例**:
```typescript
/**
 * Binary Middleware for Photon
 *
 * Automatically detects 'Accept: application/cbor' and encodes
 * JSON responses using the CBOR binary format for high-performance communication.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { binaryMiddleware } from '@gravito/photon/middleware/binary'
 *
 * const app = new Photon()
 * app.use(binaryMiddleware())
 *
 * app.get('/api/data', (c) => c.json({ items: [...] }))
 * ```
 *
 * @performance
 * - CBOR encoding is ~2-3x faster than JSON.stringify for large objects
 * - Binary format reduces payload size by 20-40% on average
 * - Recommended for high-frequency API calls with large datasets
 *
 * @client_usage
 * ```typescript
 * import { decode } from 'cborg'
 *
 * const res = await fetch('/api/data', {
 *   headers: { Accept: 'application/cbor' }
 * })
 * const data = decode(new Uint8Array(await res.arrayBuffer()))
 * ```
 */
```

---

## Phase 6: 依賴管理

### 6.1 評估依賴版本策略

**目標文件**: `packages/photon/package.json`

**當前問題**（第 49-51 行）:
```json
"dependencies": {
  "cborg": "^4.3.2",      // 允許 4.x.x
  "hono": "^4.0.0"        // 允許 4.0.0 - 4.999.999
}
```

**風險分析**:
- `hono: ^4.0.0` 範圍過寬（實際使用 4.11.4）
- photon 作為底層適配器，版本不一致可能導致 breaking changes

**優化建議**:

#### 選項 A: 使用波浪號範圍（推薦）
```json
"dependencies": {
  "cborg": "~4.3.0",      // 允許 patch 版本更新
  "hono": "~4.11.0"       // 鎖定 minor 版本
}
```

#### 選項 B: 鎖定確切版本（保守）
```json
"dependencies": {
  "cborg": "4.3.2",
  "hono": "4.11.4"
}
```

#### 選項 C: 保持現狀並添加測試
- 在 CI 中測試多個 hono 版本
- 添加 `engines` 字段指定 hono 兼容範圍

**建議**: 採用選項 A，在靈活性和穩定性間取得平衡

---

## 驗證計劃

### 階段性驗證

**Phase 1 完成後**:
```bash
cd packages/photon
bun run build
bun test tests/middleware-binary.test.ts

# 性能基準測試（需要先實現）
bun run benchmark:binary
```

**Phase 2 完成後**:
```bash
bun run typecheck  # 應無類型錯誤
bun test tests/exports.test.ts  # JWT 測試通過
```

**Phase 3 完成後**:
```bash
bun run build  # 構建時間應減少
# 檢查無循環依賴警告
```

**Phase 4 完成後**:
```bash
bun run test:coverage  # 覆蓋率 >80%
```

### 端到端驗證

**1. 功能驗證**
```bash
# 在 examples/ 或測試項目中
cd examples/zenith-site  # 或其他使用 photon 的項目
bun install
bun run dev
# 測試 API 端點，驗證 CBOR 編碼正常工作
```

**2. 性能驗證**
```bash
# 運行現有的 benchmark
cd examples/benchmarks
bun run benchmark

# 對比優化前後的結果
# 預期: requests/sec 提升 10-30%
```

**3. 類型檢查驗證**
```bash
# 在依賴 photon 的項目中
cd packages/core  # 或其他依賴包
bun run typecheck
# 確保 JWT 類型正確推斷，無 any 警告
```

**4. 回歸測試**
```bash
# 運行完整測試套件
cd /Users/carl/Dev/Carl/gravito-core-dx
bun test  # 整個 monorepo 的測試
```

### 成功標準

| 指標 | 當前 | 目標 | 驗證方法 |
|------|------|------|----------|
| binary.ts 測試覆蓋率 | 9.52% | >90% | `bun test:coverage` |
| jwt.ts 測試覆蓋率 | 69.23% | >85% | `bun test:coverage` |
| JWT 類型安全 | ~40% (大量 any) | ~95% | TypeScript 嚴格模式檢查 |
| 循環依賴數量 | 1 | 0 | 構建日誌檢查 |
| binaryMiddleware 性能 | 基準 | +15-30% | 性能基準測試 |
| 構建時間 | 基準 | -10-20% | `time bun run build` |

---

## 風險評估與緩解

### 高風險項目

**1. binaryMiddleware 性能優化**
- **風險**: 移除 `clone()` 可能在某些邊緣情況下導致響應體被過早消費
- **緩解**:
  - 添加完整測試套件覆蓋所有邊緣情況
  - 在實際項目中進行端到端測試
  - 如遇問題，可回退到選項 B（條件性優化）

**2. JWT ESM 導入問題**
- **風險**: 從 CommonJS require 改為 ESM import 可能導致運行時錯誤
- **緩解**:
  - 先在開發環境測試
  - 檢查 hono 版本是否完全支持 ESM
  - 保留 require 作為 fallback（如果必要）
  - 註釋中記錄原因

### 中風險項目

**3. 依賴版本收緊**
- **風險**: 過度限制版本範圍可能阻礙安全更新
- **緩解**:
  - 使用 `~` 而非完全鎖定
  - 建立定期依賴更新流程
  - 在 CI 中測試多個版本

### 低風險項目

**4. 文檔和類型改進**
- **風險**: 最小，主要是編譯時檢查
- **緩解**: 類型錯誤會在構建時被捕獲

---

## 實施時間線建議

**Sprint 1 (2-3 天)**
- Phase 1: binaryMiddleware 性能優化
- Phase 4.1: 添加 binary.ts 測試套件
- 驗證性能提升

**Sprint 2 (2-3 天)**
- Phase 2: JWT 類型安全修復
- Phase 3: 循環依賴消除
- Phase 4.2: JWT 測試補充

**Sprint 3 (1-2 天)**
- Phase 5: 代碼質量改進
- Phase 6: 依賴管理優化
- 完整端到端驗證

**總計**: 5-8 天（取決於測試和驗證的深度）

---

## 關鍵文件清單

### 需要修改的文件
1. `packages/photon/src/middleware/binary.ts` - 性能優化、循環依賴修復
2. `packages/photon/src/jwt.ts` - 類型安全、ESM 導入、bug 修復
3. `packages/photon/package.json` - 依賴版本優化（可選）
4. `packages/photon/build.ts` - 構建配置評估（可選）

### 需要創建的文件
1. `packages/photon/tests/middleware-binary.test.ts` - 新增完整測試套件

### 需要擴展的文件
1. `packages/photon/tests/exports.test.ts` - 添加 JWT 功能測試

---

## 後續優化建議

完成本計劃後，可考慮以下進階優化：

1. **CBOR 流式編碼**: 對於超大響應體，使用流式編碼避免一次性加載到內存
2. **壓縮支持**: 結合 gzip/brotli 壓縮進一步減少傳輸大小
3. **緩存機制**: 對於靜態或半靜態內容，緩存 CBOR 編碼結果
4. **性能監控**: 集成 APM 工具監控實際生產環境的 CBOR 性能
5. **文件結構重組**: 評估是否需要 9 個獨立文件，或可合併以簡化構建

---

## 結論

本計劃系統性地解決了 @gravito/photon 包的所有關鍵問題，從性能優化到類型安全，從測試覆蓋到代碼質量。實施後預期：

- ✅ 性能提升 15-30%
- ✅ 類型安全從 ~60% 提升到 ~95%
- ✅ 測試覆蓋率從 ~40% 提升到 >85%
- ✅ 消除所有循環依賴和代碼質量問題
- ✅ 改善維護性和開發體驗

執行順序按優先級排列，可靈活調整。建議採用漸進式實施，每個 Phase 完成後進行驗證，確保無破壞性變更。
