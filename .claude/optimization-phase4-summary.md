# Core優化 - 第四階段完成報告

**日期**: 2026-01-16
**階段**: Cookie 解析去重 (Phase 4)
**狀態**: ✅ 完成

---

## 📋 完成的優化

### ✅ Cookie 解析邏輯統一 (Priority 3.1 - Medium)

**修改檔案**:
- `packages/core/src/http/CookieJar.ts`
- `packages/core/src/http/middleware/Csrf.ts`

**問題**: Csrf middleware 獨立實現了 Cookie 解析邏輯，造成代碼重複

**解決方案**: 將 Cookie 解析邏輯集中到 CookieJar 類的靜態方法中，讓所有需要解析 Cookie 的地方都使用統一的實現

---

## 🎯 具體修改

### 1. CookieJar 添加靜態 parseCookies 方法

#### 1.1 新增 parseCookies 靜態方法

**文件**: `src/http/CookieJar.ts:20-40`

**新增代碼** ✅:
```typescript
/**
 * Parse cookies from a Cookie header string
 * @param header - The Cookie header value
 * @returns Parsed cookies as key-value pairs
 */
static parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) {
    return out
  }
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=')
    if (!rawKey) {
      continue
    }
    const key = rawKey.trim()
    const value = rest.join('=')
    out[key] = decodeURIComponent(value)
  }
  return out
}
```

**特點**:
- ✅ 靜態方法，無需實例化即可使用
- ✅ 處理空字符串的邊緣情況
- ✅ 正確處理包含 `=` 的 cookie 值
- ✅ 自動進行 URL 解碼

---

### 2. Csrf Middleware 使用統一的 Cookie 解析

#### 2.1 移除重複的 parseCookies 函數

**文件**: `src/http/middleware/Csrf.ts`

**移除前** ❌:
```typescript
function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) {
    return out
  }
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=')
    if (!rawKey) {
      continue
    }
    const key = rawKey.trim()
    const value = rest.join('=')
    out[key] = decodeURIComponent(value)
  }
  return out
}
```

**移除後** ✅: （此函數已刪除，共 ~16 行代碼）

---

#### 2.2 更新導入語句

**文件**: `src/http/middleware/Csrf.ts:2`

**修改前** ❌:
```typescript
import { CookieJar } from '../CookieJar'
```

**修改後** ✅:
```typescript
import { CookieJar, type CookieOptions } from '../CookieJar'
```

---

#### 2.3 更新 getCsrfToken 函數

**文件**: `src/http/middleware/Csrf.ts:67-85`

**修改前** ❌:
```typescript
export function getCsrfToken(c: GravitoContext, options: CsrfOptions = {}): string {
  const cookieName = options.cookieName ?? 'gravito_csrf'
  const cookieHeader = c.req.header('Cookie') || ''
  const cookies = parseCookies(cookieHeader)  // ← 使用局部函數
  let token = cookies[cookieName]
  // ...
}
```

**修改後** ✅:
```typescript
export function getCsrfToken(c: GravitoContext, options: CsrfOptions = {}): string {
  const cookieName = options.cookieName ?? 'gravito_csrf'
  const cookieHeader = c.req.header('Cookie') || ''
  const cookies = CookieJar.parseCookies(cookieHeader)  // ← 使用 CookieJar 靜態方法
  let token = cookies[cookieName]
  // ...
}
```

---

#### 2.4 更新 csrfProtection 中間件

**文件**: `src/http/middleware/Csrf.ts:87-126`

**修改前** ❌:
```typescript
export function csrfProtection(options: CsrfOptions = {}): GravitoMiddleware {
  // ...
  return async (c, next) => {
    const method = c.req.method.toUpperCase()
    const cookieHeader = c.req.header('Cookie') || ''
    const cookies = parseCookies(cookieHeader)  // ← 使用局部函數
    const token = cookies[cookieName] || getCsrfToken(c, options)
    // ...
  }
}
```

**修改後** ✅:
```typescript
export function csrfProtection(options: CsrfOptions = {}): GravitoMiddleware {
  // ...
  return async (c, next) => {
    const method = c.req.method.toUpperCase()
    const cookieHeader = c.req.header('Cookie') || ''
    const cookies = CookieJar.parseCookies(cookieHeader)  // ← 使用 CookieJar 靜態方法
    const token = cookies[cookieName] || getCsrfToken(c, options)
    // ...
  }
}
```

---

## 📊 架構改進

### 修復前的問題

```
┌──────────────────────┐        ┌──────────────────────┐
│   CookieJar.ts       │        │   Csrf.ts            │
│                      │        │                      │
│  (no parseCookies)   │        │  function            │
│                      │        │  parseCookies() {    │
│                      │        │    // 16 lines       │
│                      │        │  }                   │
│                      │        │                      │
│                      │        │  getCsrfToken() {    │
│                      │        │    parseCookies()    │
│                      │        │  }                   │
│                      │        │                      │
│                      │        │  csrfProtection() {  │
│                      │        │    parseCookies()    │
│                      │        │  }                   │
└──────────────────────┘        └──────────────────────┘
                                  ↑ 重複實現邏輯
```

**問題**:
- ❌ Cookie 解析邏輯分散在多處
- ❌ 維護困難（修改需要同步多處）
- ❌ 可能導致行為不一致
- ❌ 代碼重複

---

### 修復後的架構

```
┌──────────────────────────────────────┐
│         CookieJar.ts                 │
│                                      │
│  static parseCookies(header) {      │
│    // 統一實現                       │
│  }                                   │
└──────────────────────────────────────┘
         ↑                     ↑
         │                     │
         │                     │
┌────────┴────────┐   ┌────────┴────────┐
│  Csrf.ts        │   │  其他模組        │
│                 │   │  (未來可用)      │
│  getCsrfToken() │   │                 │
│    ↓            │   │                 │
│  CookieJar.     │   │  CookieJar.     │
│  parseCookies() │   │  parseCookies() │
│                 │   │                 │
│  csrfProtection │   │                 │
│    ↓            │   │                 │
│  CookieJar.     │   │                 │
│  parseCookies() │   │                 │
└─────────────────┘   └─────────────────┘
```

**優勢**:
- ✅ 單一真相來源（Single Source of Truth）
- ✅ 更容易維護和測試
- ✅ 保證行為一致性
- ✅ 減少代碼重複
- ✅ 其他模組也可重用

---

## 🔄 向後兼容性

### 對現有代碼的影響

#### 1. CookieJar API（擴展）

```typescript
// 新增靜態方法，完全向後兼容
const cookies = CookieJar.parseCookies('foo=bar; baz=qux')
// cookies = { foo: 'bar', baz: 'qux' }
```

✅ **完全向後兼容** - 只添加新的靜態方法，不改變現有 API

---

#### 2. Csrf Middleware（內部重構）

```typescript
// 公共 API 完全相同
import { csrfProtection, getCsrfToken } from './middleware/Csrf'

// 使用方式不變
app.use(csrfProtection())
const token = getCsrfToken(ctx)
```

✅ **完全向後兼容** - 僅內部實現變化，公共 API 不變

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

### 代碼變更統計
- **CookieJar.ts**: +20 行（添加 parseCookies 靜態方法）
- **Csrf.ts**: -16 行（移除重複的 parseCookies 函數）
- **總計**: +4 行淨增（但消除了代碼重複）

### 代碼品質改善
- ✅ 消除了 ~16 行重複代碼
- ✅ 提升了代碼可維護性
- ✅ 建立了統一的 Cookie 解析接口
- ✅ 為未來重用奠定基礎

### 開發者體驗
- ✅ 更清晰的代碼組織
- ✅ 更容易找到 Cookie 解析邏輯
- ✅ 更容易測試 Cookie 解析
- ✅ 降低了維護成本

---

## 🔜 下一步建議

Phase 4 完成後，還有以下優化機會：

### Priority 3 (Medium) - 剩餘
- ⏳ **測試覆蓋率** - 從 ~23% 提升至 35%+
  - FormRequest 檢測邊緣案例
  - 命名路由 URL 生成（特殊字元）
  - PhotonAdapter Proxy 回退行為
  - Application 自動發現失敗場景
  - EventManager 廣播失敗處理

### 其他可能的優化
- 文檔改善和 API 文檔生成
- 性能基準測試
- 更多的集成測試

---

## 🎉 Phase 1-4 累積成果

### 已完成的優化
1. ✅ **Phase 1**: Route.ts 類型安全 + FormRequest 緩存 + 路由編譯優化 + Type Guards
2. ✅ **Phase 2**: PhotonAdapter 類型安全（消除 8+ 處 `any`）
3. ✅ **Phase 3**: Container 一致性修復（DI 架構改善）
4. ✅ **Phase 4**: Cookie 解析去重（代碼品質提升）

### 累積統計
- **消除 `any` 類型**: 14+ 處
- **性能優化**: 路由編譯 O(n²) → O(n)、FormRequest 緩存
- **架構改善**: Container 一致性、Type Guards、Cookie 解析統一
- **代碼品質**: 減少重複 ~16 行、提升可維護性
- **測試**: 138 個測試全部通過，零回歸

### HTTP 方法重複分析
- ✅ **已決定不優化** - 分析文檔記錄於 `.claude/http-methods-duplication-analysis.md`
- 原因：TypeScript 函數重載是類型系統要求，不是真正的代碼重複

---

**完成時間**: 2026-01-16
**估計工作量**: ~1 小時
**實際工作量**: ~30 分鐘

**下一步**: 創建 commit 或繼續剩餘的優化項目（如測試覆蓋率提升）
