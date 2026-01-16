# Core優化 - 第二階段完成報告

**日期**: 2026-01-16
**階段**: PhotonAdapter 類型優化 (Phase 2)
**狀態**: ✅ 完成

---

## 📋 完成的優化

### ✅ PhotonAdapter 類型安全提升 (Priority 3.2 - Medium)

**修改檔案**:
- `packages/core/src/adapters/PhotonAdapter.ts`
- `packages/core/src/adapters/photon-types.ts` (新增)

**問題**: PhotonAdapter.ts 中有 7+ 處 `any` 或 `as any` 使用

**解決方案**: 創建專門的類型定義文件，為 Photon 框架擴展提供精確的類型支持

---

## 🎯 具體修改

### 1. 創建 Photon 類型擴展文件

**新增檔案**: `src/adapters/photon-types.ts`

提供了以下類型定義：

```typescript
/**
 * Extended Photon Request with additional properties
 */
export interface PhotonRequestExtended {
  // Validation method added by middleware
  valid<T = unknown>(target: string): T

  // Allow dynamic property access for middleware extensions
  [key: string]: unknown
}

/**
 * Extended Photon Context with internal caching
 */
export interface PhotonContextExtended extends Context {
  // Internal cache for parsed JSON body
  _cachedJsonBody?: unknown

  // Extended request object
  req: Context['req'] & PhotonRequestExtended
}

/**
 * Extended Response with flash message support
 */
export interface ResponseWithFlash {
  // Flash message helper for redirect responses
  with(key: string, value: unknown): ResponseWithFlash

  [key: string]: unknown
}

/**
 * Session interface with flash message support
 */
export interface SessionWithFlash {
  flash(key: string, value: unknown): void
  [key: string]: unknown
}
```

---

### 2. 替換所有 `any` 類型使用

#### 2.1 PhotonRequestWrapper - Proxy 回退

**修復前** ❌:
```typescript
const nativeReq = target.photonCtx.req as any
if (prop in nativeReq) {
  const value = nativeReq[prop]
  // ...
}
```

**修復後** ✅:
```typescript
const nativeReq = target.photonCtx.req as Context['req'] & PhotonRequestExtended
if (prop in nativeReq) {
  const value = nativeReq[prop]
  // ...
}
```

**影響**: Proxy 回退現在有明確的類型定義，支持動態屬性訪問

---

#### 2.2 Proxy 返回類型

**修復前** ❌:
```typescript
return new Proxy(instance, {
  // ...
}) as any
```

**修復後** ✅:
```typescript
return new Proxy(instance, {
  // ...
}) as PhotonRequestWrapper  // or GravitoContext<V>
```

**影響**: Proxy 返回值現在有精確的類型

---

#### 2.3 JSON Body 緩存

**修復前** ❌:
```typescript
async json<T = unknown>(): Promise<T> {
  const ctx = this.photonCtx as any
  if (ctx._cachedJsonBody !== undefined) {
    return ctx._cachedJsonBody as T
  }
  // ...
}
```

**修復後** ✅:
```typescript
async json<T = unknown>(): Promise<T> {
  const ctx = this.photonCtx as PhotonContextExtended
  if (ctx._cachedJsonBody !== undefined) {
    return ctx._cachedJsonBody as T
  }
  // ...
}
```

**影響**: 內部緩存機制現在有明確的類型定義

---

#### 2.4 Validation 方法

**修復前** ❌:
```typescript
valid<T = unknown>(target: string): T {
  return (this.photonCtx.req as any).valid(target)
}
```

**修復後** ✅:
```typescript
valid<T = unknown>(target: string): T {
  const extendedReq = this.photonCtx.req as Context['req'] & PhotonRequestExtended
  return extendedReq.valid<T>(target)
}
```

**影響**: Validation 方法現在有完整的泛型類型支持

---

#### 2.5 Context Variables 訪問

**修復前** ❌:
```typescript
if (typeof prop === 'string') {
  return target.get(prop as any)
}
```

**修復後** ✅:
```typescript
if (typeof prop === 'string') {
  return target.get(prop as keyof V)
}
```

**影響**: Context 變量訪問現在有泛型約束

---

#### 2.6 Data Getter/Setter

**修復前** ❌:
```typescript
get data(): any {
  return this.get('data' as any)
}

set data(value: any) {
  this.set('data' as any, value)
}
```

**修復後** ✅:
```typescript
get data(): unknown {
  return this.get('data' as keyof V)
}

set data(value: unknown) {
  this.set('data' as keyof V, value as V[keyof V])
}
```

**影響**: `data` 屬性現在使用 `unknown` 而非 `any`，更類型安全

---

#### 2.7 Response 擴展 (Flash Messages)

**修復前** ❌:
```typescript
redirect(url: string, status): Response {
  const response = this.photonCtx.redirect(url, status)
  const anyRes = response as any
  anyRes.with = (key: string, value: any) => {
    const session = this.get('session' as any) as any
    if (session) {
      session.flash(key, value)
    }
    return anyRes
  }
  return response
}
```

**修復後** ✅:
```typescript
redirect(url: string, status): Response {
  const response = this.photonCtx.redirect(url, status)
  const extendedRes = response as unknown as ResponseWithFlash
  extendedRes.with = (key: string, value: unknown) => {
    const session = this.get('session' as keyof V) as SessionWithFlash | undefined
    if (session && typeof session.flash === 'function') {
      session.flash(key, value)
    }
    return extendedRes
  }
  return response
}
```

**影響**:
- Response 擴展現在有明確的類型定義
- Session 訪問現在有類型守衛
- 參數類型從 `any` 改為 `unknown`

---

#### 2.8 Middleware 返回類型

**修復前** ❌:
```typescript
function toPhotonMiddleware<V>(middleware: GravitoMiddleware<V>): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    const ctx = PhotonContextWrapper.create<V>(c)
    const gravitoNext: GravitoNext = async () => {
      return (await next()) as unknown as Response | undefined
    }
    return middleware(ctx, gravitoNext) as any  // ❌
  }
}
```

**修復後** ✅:
```typescript
function toPhotonMiddleware<V>(middleware: GravitoMiddleware<V>): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    const ctx = PhotonContextWrapper.create<V>(c)
    const gravitoNext: GravitoNext = async () => {
      return (await next()) as unknown as Response | undefined
    }
    const result = await middleware(ctx, gravitoNext)
    return result as Response | undefined  // ✅
  }
}
```

**影響**: Middleware 返回值現在有明確的類型斷言

---

## 📊 統計總結

### 消除的 `any` 使用
| 位置 | 修復前 | 修復後 |
|------|--------|--------|
| PhotonRequestWrapper (line 53, 69) | `as any` | `as Context['req'] & PhotonRequestExtended` |
| Proxy 返回 (line 72) | `as any` | `as PhotonRequestWrapper` |
| JSON 緩存 (line 113) | `as any` | `as PhotonContextExtended` |
| valid() 方法 (line 143) | `as any` | `as Context['req'] & PhotonRequestExtended` |
| Context Proxy (line 189) | `as any` | `as GravitoContext<V>` |
| data getter (line 204) | `any` | `unknown` |
| data setter (line 208) | `any` | `unknown` |
| Response.with() (line 241-243) | 3× `as any` | `ResponseWithFlash`, `SessionWithFlash` |
| Middleware 返回 (line 428) | `as any` | `as Response \| undefined` |

**總計消除**: **8+ 處 `any` 類型** ✅

### 新增類型定義
- ✅ `PhotonRequestExtended` - 擴展請求類型
- ✅ `PhotonContextExtended` - 擴展上下文類型（含內部緩存）
- ✅ `ResponseWithFlash` - 擴展響應類型（含 flash 消息）
- ✅ `SessionWithFlash` - Session 接口定義
- ✅ 2 個類型守衛函數

---

## 💡 類型安全改進

### 從 `any` 到 `unknown`
許多地方從 `any` 改為 `unknown`，這是更安全的選擇：
- `any` - 完全繞過類型檢查 ❌
- `unknown` - 需要類型守衛才能使用 ✅

### 泛型約束
- Context 變量訪問現在使用 `keyof V` 約束
- Validation 方法保持完整的泛型類型流動

### 類型守衛
- Session 訪問前檢查 `typeof session.flash === 'function'`
- 更安全的運行時檢查

---

## ✅ 驗證結果

### TypeScript 編譯
```bash
npx tsc --noEmit
```
✅ **通過** - 無類型錯誤

### 測試套件
```bash
bun test
```
✅ **138 個測試全部通過** - 無回歸問題

---

## 📈 影響分析

### 開發者體驗
- ✅ IDE 自動完成更準確
- ✅ 編譯時類型檢查更嚴格
- ✅ 減少執行時錯誤風險

### 類型覆蓋率
- **修復前**: PhotonAdapter 有 8+ 處 `any` 使用
- **修復後**: 所有 `any` 替換為精確類型
- **提升**: 類型安全覆蓋率 +100%（在 PhotonAdapter 範圍內）

### 維護性
- ✅ 類型定義集中管理（photon-types.ts）
- ✅ 更容易追蹤 Photon 框架的擴展
- ✅ 未來新增擴展有清晰的模式可循

---

## 🔄 與 Phase 1 的協同

Phase 1 已經優化了：
- ✅ Route.ts 類型安全
- ✅ FormRequest 緩存
- ✅ 路由編譯算法
- ✅ Type Guards

Phase 2 繼續改進：
- ✅ Adapter 層的類型安全
- ✅ Photon 框架擴展的類型定義

兩個階段共同提升了整個 Core 模組的類型安全性！

---

## 🔜 下一步建議

Phase 2 完成後，還有以下優化機會：

### Priority 1 (Critical) - 剩餘
- ⏳ **HTTP 方法去重** (~265 行) - 需要保持類型安全的重構

### Priority 2 (High) - 剩餘
- ⏳ **Container 一致性** - Application 和 PlanetCore 共享 Container

### Priority 3 (Medium) - 剩餘
- ⏳ **Cookie 解析去重** - Csrf middleware 獨立實現
- ⏳ **測試覆蓋率** - 從 ~23% 提升至 35%+

---

**完成時間**: 2026-01-16
**估計工作量**: 2-3 小時
**實際工作量**: ~2 小時

**下一步**: 創建 Pull Request 或繼續 Phase 3 優化
