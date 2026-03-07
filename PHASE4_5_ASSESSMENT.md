# Phase 4-5 評估：Hono 依賴清理深度分析

## 🔍 掃描結果統計

| 類別 | 檔案數 | 優先級 | 複雜度 | 影響範圍 |
|------|--------|--------|--------|---------|
| **Phase 4: 核心適配層** | 8 | 🔴 高 | ⭐⭐⭐ | photon, core |
| **Phase 4: 周邊型別更新** | 6 | 🟡 中 | ⭐⭐ | mass, ether, monolith, sentinel, etc |
| **Phase 5: 可選相容層** | 4 | 🟢 低 | ⭐ | openapi, jwt, compat |
| **Phase 5: 測試/性能** | 11 | 🟢 低 | ⭐ | 測試工具，非生產代碼 |

---

## 📋 Phase 4 詳細清單（高優先級 🔴）

### Group 4.1: photon/src/index.ts - Hono re-export（最關鍵）

**當前狀態**:
```typescript
// 第 1-4 行
import type { Context, Handler, MiddlewareHandler, Next } from 'hono'
import { Hono } from 'hono'
...
export * from 'hono'  // ⚠️ 洩露 Hono API
```

**問題**:
- 任何使用 `@gravito/photon` 的代碼可能依賴 Hono 導出
- 違反 "完全移除 Hono" 的目標
- 造成型別污染

**修改方案**:
```typescript
// 改為：僅導出 Photon 相關型別
import type { GravitoContext, GravitoHandler, GravitoMiddleware, GravitoNext } from '@gravito/core'

export type { GravitoContext, GravitoHandler, GravitoMiddleware, GravitoNext }
export { Photon } from './photon'
// ... 其他 photon 導出
// ❌ 移除 export * from 'hono'
```

**受影響的下游包**:
- beam/src/index.ts: `import type { Hono } from '@gravito/photon'` ← 會斷掉，需改為 Photon
- luminosity/tests: HonoScanner 測試導入可能依賴

**複雜度**: ⭐⭐⭐ 高（需驗證下游依賴）

---

### Group 4.2: photon/src/photon.ts - Hono 應用類引用

**當前狀態**:
```typescript
import type { MiddlewareHandler } from 'hono'
import { Hono } from 'hono'

// photon.ts 可能在某些地方参考 Hono 或 MiddlewareHandler
```

**掃描結果**:
- 已在 Phase 3 改為 `GravitoMiddleware`，但仍保留 Hono 導入

**修改方案**:
- [ ] 移除 `import type { MiddlewareHandler } from 'hono'`
- [ ] 移除 `import { Hono } from 'hono'`
- [ ] 確認 Photon 類本身無 Hono 相容方法

**複雜度**: ⭐ 低（直接移除導入）

---

### Group 4.3: 其他包的 MiddlewareHandler 型別引用

**受影響的包**（仍在導入 Hono 的 MiddlewareHandler）:

| 檔案 | 當前用法 | 修改 |
|------|---------|------|
| monolith/TrimStrings.ts | `: MiddlewareHandler` | 改為 `GravitoMiddleware` |
| ether/cspMiddleware.ts | `: MiddlewareHandler` | 改為 `GravitoMiddleware` |
| ether/etherMiddleware.ts | `: MiddlewareHandler` | 改為 `GravitoMiddleware` |
| luminosity/scanner/HonoScanner.ts | 註解 + 實作 | 確認無實際使用 |
| beam/helpers.ts | `: Hono<any, any, any>` | 已改為 `Record<string, any>` ✓ |

**修改方案**:
```typescript
// 統一改為
import type { GravitoMiddleware } from '@gravito/core'

// 而非
import type { MiddlewareHandler } from 'hono'
```

**複雜度**: ⭐ 低（批量搜索替換）

---

### Group 4.4: sentinel, luminosity-adapter-photon 的型別修復

**sentinel/middleware/guest.ts**:
```typescript
import type { MiddlewareHandler } from '@gravito/photon'
export const guest = (...): MiddlewareHandler => { ... }
```

**luminosity-adapter-photon/src/middleware.ts**:
```typescript
import type { MiddlewareHandler } from '@gravito/photon'
export function gravitoSeo(...): MiddlewareHandler { ... }
```

**問題**: 導入的仍是 Hono 型別（或 re-export）

**修改方案**:
- [ ] 確認 `@gravito/photon` 本身不再 export MiddlewareHandler
- [ ] 改為 `import type { GravitoMiddleware } from '@gravito/core'`

**複雜度**: ⭐⭐ 中（需確認型別源）

---

## 📋 Phase 5 詳細清單（可選/低優先級 🟢）

### Group 5.1: photon/openapi.ts - @hono/zod-openapi

**當前狀態**:
```typescript
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
```

**決策選項**:

| 選項 | 描述 | 工作量 |
|------|------|--------|
| **A. 保留** | 保留 @hono/zod-openapi 作為 Hono 相容層 | ⭐ 小 |
| **B. 替換** | 實作 Gravito 原生 OpenAPI 支援 | ⭐⭐⭐⭐ 大 |
| **C. 廢棄** | 移除 OpenAPI 支援 | ⭐ 小 |

**建議**: **A. 保留** - OpenAPI 是 Hono 生態的成熟工具，保留不影響核心遷移

---

### Group 5.2: photon/jwt.ts - Hono JWT 工具類

**當前狀態**:
```typescript
// jwt.d.ts 中
keys?: import("hono/utils/jwt/jws").HonoJsonWebKey[]
```

**決策**:
- 若 photon 提供 JWT 中間件，可保留為相容層
- 若不使用，可移除

**建議**: **保留** - 低成本，未來可標記為廢棄層

---

### Group 5.3: core/compat.ts - 相容層

**當前狀態**:
```typescript
export type {
  GravitoContext as Context,
  GravitoMiddleware as MiddlewareHandler,
  ...
}
```

**用途**: 為舊代碼提供 `MiddlewareHandler` 別名

**建議**: **保留** - 用於過渡期，可在 v2.0 移除

---

### Group 5.4: 測試和性能檔案（非生產代碼）

**受影響**:
- photon/tests/*.test.ts (4 檔) - 使用 Hono 做對比測試
- photon/perf/**/*.perf.ts (7 檔) - 性能基準對比

**決策**:
- 🟢 **不必修改** - 測試工具，非生產包
- 保留用於性能對比和相容性測試

---

## 🎯 Phase 4-5 執行策略

### 🔴 Phase 4（必須）- 估計 30-45 分鐘

**1. Clean up photon/index.ts** (15 分鐘)
   - 移除 `export * from 'hono'`
   - 只 export Photon 相關型別
   - 驗證 beam 等下游包不斷裂

**2. Clean up photon/photon.ts** (5 分鐘)
   - 移除 Hono 導入

**3. Batch type updates** (10 分鐘)
   - monolith, ether, sentinel, luminosity-adapter-photon
   - 統一改為 GravitoMiddleware

**4. Verify all tests pass** (10 分鐘)
   - `bun run typecheck`
   - `bun test`

---

### 🟡 Phase 5（可選）- 估計 5-15 分鐘

**選項 A：保留相容層**（推薦）
- 保留 openapi.ts, jwt.ts, core/compat.ts
- 標記為 "@deprecated v2.0 remove"
- 工作量：5 分鐘（僅新增註解）

**選項 B：完全清理**
- 移除 openapi.ts, jwt.ts
- 實作 Gravito 原生方案
- 工作量：2-3 小時（大工程）

---

## 📊 風險評估

| 風險 | 發生機率 | 影響 | 緩解措施 |
|------|---------|------|---------|
| beam 等下游包導入斷裂 | 🟡 中 | 🔴 高 | 移除 `export * from 'hono'` 前驗證下游 |
| OpenAPI 功能損失 | 🟢 低 | 🟡 中 | 保留 @hono/zod-openapi 相容層 |
| 性能測試基準失效 | 🟢 低 | 🟢 低 | 保留測試檔案即可 |

---

## ✅ Phase 4 成功標準

```
✅ 0 個 `from 'hono'` 導入（除測試/相容層）
✅ All MiddlewareHandler → GravitoMiddleware
✅ photon/index.ts 無 `export * from 'hono'`
✅ Typecheck: 全部通過
✅ Tests: 全部通過 (0 fail)
✅ 無 `as any` 型別污染
```

---

## 🚀 建議方案

**Phase 4**: 必做 ✅
- 時間：30-45 分鐘
- 優先級：🔴 高
- 預期收益：完全移除 Hono 污染

**Phase 5**: 可選 ✅
- 時間：5 分鐘（保留相容層）或 2-3 小時（完全清理）
- 優先級：🟢 低
- 建議：保留相容層，標記為廢棄

---

## 📝 下一步行動

是否要立即啟動 **Phase 4** 並行修復？（3 個 Agent）

**預計時間**: 30-45 分鐘
**修改檔案**: 8-10 個
**預期結果**: 0 個 Hono 導入（測試除外）

