# Phase 3: Hono 移除計畫 - 詳細修改清單

## 📋 涉及包與修改數量

| 包 | 文件數 | Hono 依賴 | 優先級 | 複雜度 |
|------|--------|---------|--------|--------|
| **beam** | 1 | `Hono` 型別 | 🔴 高 | ⭐ 低 |
| **ether** | 2 | `MiddlewareHandler` 型別 | 🟡 中 | ⭐⭐ 中 |
| **monolith** | 2 | `MiddlewareHandler`, `Hono` | 🟡 中 | ⭐ 低 |
| **zenith** | 2 | Cookie、SSE 函式 | 🔴 高 | ⭐⭐⭐ 高 |
| **luminosity** | 1 | 註解中的 Hono 參考 | 🟢 低 | ⭐ 低 |

---

## 🔧 具體修改清單

### 1️⃣ **@gravito/beam** - helpers.ts

**當前狀態**:
```typescript
// 行 1, 45
import type { Hono } from 'hono'
export function createAuthenticatedBeam<T extends Hono<any, any, any>>(...)
```

**修改點**:
- [ ] 移除 `import type { Hono } from 'hono'`
- [ ] 將泛型 `T extends Hono<any, any, any>` 改為 `T extends Photon`
- [ ] 導入 `import { Photon } from '@gravito/photon'`

**測試**: 執行 `bun test packages/beam`

---

### 2️⃣ **@gravito/ether** - 2 個文件

#### cspMiddleware.ts
**當前狀態**:
```typescript
// 行 8: 導入但未使用?
import type { MiddlewareHandler } from 'hono'
```

**修改點**:
- [ ] 檢查是否真的導入了 `MiddlewareHandler`（可能是誤導入）
- [ ] 如有使用，改為 `GravitoMiddleware` from `@gravito/core`
- [ ] 檢查中間件簽名是否符合 `GravitoMiddleware`

#### etherMiddleware.ts
**當前狀態**:
- 似乎已經沒有直接的 Hono 依賴

**修改點**:
- [ ] 掃描完整文件確認無 Hono 依賴
- [ ] 確認中間件工廠函式返回 `GravitoMiddleware`

---

### 3️⃣ **@gravito/monolith** - 2 個文件

#### TrimStrings.ts (middleware/)
**當前狀態**:
```typescript
// 行 4-5
export const trimStrings = () => {
  return async (c: any, next: any) => {
```

**修改點**:
- [ ] 將 `c: any, next: any` 改為 `c: GravitoContext, next: GravitoNext`
- [ ] 導入 `import type { GravitoContext, GravitoNext } from '@gravito/core'`
- [ ] 移除任何 Hono 型別參考

#### Router.ts
**當前狀態**:
```typescript
// 行 1, 17
import type { Hono } from 'hono'
public static resource(app: any, ...)
```

**修改點**:
- [ ] 移除 `import type { Hono } from 'hono'`
- [ ] 將 `app: any` 改為 `app: Photon`
- [ ] 導入 `import type { Photon } from '@gravito/photon'`

---

### 4️⃣ **@gravito/zenith** - 2 個文件（🔴 最複雜）

#### server/middleware/auth.ts
**當前狀態**:
```typescript
// 行 1
import type { Context } from '@gravito/photon'
// 使用自定義 getCookie, setCookie
```

**修改點**:
- [ ] 確認已正確使用 `@gravito/photon` 的 Context ✓
- [ ] 檢查 cookie 操作是否相容於 GravitoContext
- [ ] 驗證 `c.req.raw.headers` 的 API

#### server/index.ts
**當前狀態**:
```typescript
// 掃描結果顯示:
import { serveStatic } from 'hono/bun'
import { getCookie } from 'hono/cookie'
import { streamSSE } from 'hono/streaming'
```

**修改點**:
- [ ] `serveStatic`: 改用 Bun 原生 `Bun.serve()` 或 `serveStatic` from `@gravito/photon`
- [ ] `getCookie`: 改用自定義或 `c.req.header('Cookie')` 解析
- [ ] `streamSSE`: 改為 Bun 原生 `BunNativeAdapter` 支援或自定義 SSE 實作
- [ ] 確認有相應的 photon 或 core 替代方案

---

### 5️⃣ **@gravito/luminosity** - HonoScanner.ts

**當前狀態**:
```typescript
// 只在註解中有 Hono 參考
```

**修改點**:
- [ ] 掃描確認無實際 Hono 導入或使用
- [ ] 更新註解移除 Hono 參考

---

## 🎯 執行順序建議

### Phase 3.1: 簡單型別替換（無依賴）
1. **luminosity** - 1 文件（5 分鐘）
2. **beam** - 1 文件（10 分鐘）
3. **monolith** - TrimStrings.ts（10 分鐘）
4. **ether** - cspMiddleware.ts（10 分鐘）

### Phase 3.2: 中等複雜度（有型別替換）
5. **monolith** - Router.ts（15 分鐘）
6. **ether** - etherMiddleware.ts（20 分鐘）

### Phase 3.3: 高複雜度（功能遷移）
7. **zenith** - auth.ts（驗證，10 分鐘）
8. **zenith** - index.ts（需要 API 替代方案研究，30-45 分鐘）

---

## ✅ 驗證檢查清單

- [ ] `bun run typecheck` - 所有包通過（目標：82/82 → 85/85）
- [ ] `bun test packages/{beam,ether,monolith,zenith,luminosity}` - 所有測試通過
- [ ] `bun run build` - 全量構建成功
- [ ] 無 `as any` 或 `any` 型別在新修改中

---

## 📝 提交策略

**建議分 3 次提交**:

1. **fix: [beam, monolith, ether] Remove Hono types (step 1)**
   - beam/helpers.ts
   - monolith/TrimStrings.ts, Router.ts
   - ether/cspMiddleware.ts

2. **fix: [ether] Complete Ether middleware migration**
   - ether/etherMiddleware.ts

3. **fix: [zenith] Remove Hono dependencies from server**
   - zenith/server/middleware/auth.ts (if needed)
   - zenith/server/index.ts (requires research)
   - luminosity/HonoScanner.ts (comments cleanup)

---

## 🚀 Team 並行執行建議

**3 個 Agent 並行**:
- **Agent 1**: Phase 3.1 - 簡單型別替換（luminosity, beam, monolith-trim, ether-csp）
- **Agent 2**: Phase 3.2 - 中等複雜度（monolith-router, ether-middleware）
- **Agent 3**: Phase 3.3 - 高複雜度（zenith - 研究 API 替代方案）

估計總時間：**60-90 分鐘**（3 個 Agent 並行）

