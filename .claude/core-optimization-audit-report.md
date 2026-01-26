# packages/core/ 模組優化審查報告

**生成日期**: 2026-01-16
**審查範圍**: packages/core/src/
**代碼規模**: 10,195 行源碼，68 個 TypeScript 檔案
**測試覆蓋**: ~23% (測試/源碼比例)

---

## 執行摘要

本報告基於對 `packages/core/` 模組的全面代碼審查，識別出以下關鍵優化機會：

- **類型安全問題**: 38+ 處 `any` 類型使用
- **效能瓶頸**: O(n²) 路由編譯算法
- **代碼重複**: 250+ 行重複的 HTTP 方法實現
- **架構不一致**: Application 和 PlanetCore 的 Container 管理
- **記憶體優化**: FormRequest 每次請求都實例化

---

## 🔴 優先級 1：關鍵問題 (Critical)

### 1.1 Router/Route 中的 `any` 類型使用

**影響檔案**:
- `src/Route.ts` (lines 39, 50, 61, 72, 83, 95)
- `src/Router.ts` (相關的類型定義)

**問題描述**:
```typescript
// src/Route.ts:39
static get(path: string, requestOrHandler: any, handler?: any): Route {
  return router().get(path, requestOrHandler, handler)
}

// src/Route.ts:95
static middleware(...handlers: any[]) {
  return router().middleware(...handlers)
}
```

**問題影響**:
- ❌ 失去 IDE 自動完成功能
- ❌ 無編譯時類型檢查
- ❌ 增加執行時錯誤風險
- ❌ 開發者體驗下降

**建議方案**:
使用精確的類型定義和函數重載：
```typescript
static get(path: string, handler: RouteHandler): Route
static get(path: string, request: FormRequestClass, handler: RouteHandler): Route
static get(
  path: string,
  middleware: GravitoMiddleware | GravitoMiddleware[],
  handler: RouteHandler
): Route
static get(
  path: string,
  requestOrHandlerOrMiddleware: FormRequestClass | RouteHandler | GravitoMiddleware | GravitoMiddleware[],
  handler?: RouteHandler
): Route {
  return router().get(path, requestOrHandlerOrMiddleware, handler)
}
```

**優先級理由**: 類型安全是 TypeScript 的核心優勢，這影響整個路由系統的使用體驗

---

### 1.2 FormRequest 每次請求都實例化

**影響檔案**: `src/Router.ts:81-101`

**問題描述**:
```typescript
function formRequestToMiddleware(RequestClass: FormRequestClass): GravitoMiddleware {
  return async (ctx, next) => {
    const request = new RequestClass()  // ← 每次 HTTP 請求都創建新實例！
    if (typeof request.validate !== 'function') {
      throw new Error('Invalid FormRequest: validate() is missing.')
    }
    const result = await request.validate(ctx)
    // ...
  }
}
```

**問題影響**:
- ⚠️ 不必要的記憶體分配
- ⚠️ 增加 GC 壓力
- ⚠️ 影響高並發場景性能

**建議方案**:
實現 FormRequest 實例緩存：
```typescript
// 在 Router 類中添加實例緩存
private formRequestInstances = new WeakMap<FormRequestClass, FormRequestLike>()

function formRequestToMiddleware(RequestClass: FormRequestClass): GravitoMiddleware {
  // 僅在首次使用時創建實例
  let instance = this.formRequestInstances.get(RequestClass)
  if (!instance) {
    instance = new RequestClass()
    this.formRequestInstances.set(RequestClass, instance)
  }

  return async (ctx, next) => {
    const result = await instance.validate(ctx)
    // ...
  }
}
```

**注意事項**: 需確保 FormRequest 類是無狀態的（stateless），實例可以在多個請求間安全共享

---

### 1.3 HTTP 方法實現大量重複

**影響檔案**:
- `src/Router.ts` (RouteGroup class: lines 149-242, ~95 行)
- `src/Router.ts` (Router class: lines 552-657, ~105 行)
- `src/Route.ts` (static methods: lines 32-97, ~65 行)

**統計數據**:
- RouteGroup: 5 個方法 × 19 行/方法 = 95 行
- Router: 5 個方法 × 21 行/方法 = 105 行
- Route: 5 個方法 × 13 行/方法 = 65 行
- **總計**: ~265 行重複代碼

**問題描述**:
```typescript
// 在 RouteGroup、Router、Route 中，這段邏輯重複 15 次：
get(path: string, handler: RouteHandler): Route
get(path: string, request: FormRequestClass, handler: RouteHandler): Route
get(
  path: string,
  middleware: GravitoMiddleware | GravitoMiddleware[],
  handler: RouteHandler
): Route
get(
  path: string,
  requestOrHandlerOrMiddleware: FormRequestClass | RouteHandler | GravitoMiddleware | GravitoMiddleware[],
  handler?: RouteHandler
): Route {
  // 實現邏輯...
}

// post, put, delete, patch 都是同樣的模式
```

**問題影響**:
- 🔧 維護成本高（修改一處需要改 15 處）
- 🐛 Bug 風險高（容易遺漏某個方法）
- 📦 Bundle 體積增加
- 🧹 代碼可讀性差

**建議方案**:
提取通用的路由方法生成器：

```typescript
// 方案 A: 使用工廠方法 + 動態綁定
class Router {
  constructor(private core: PlanetCore) {
    // 動態綁定 HTTP 方法
    const methods = ['get', 'post', 'put', 'delete', 'patch'] as const
    methods.forEach(method => {
      this[method] = this.createRouteMethod(method)
    })
  }

  private createRouteMethod(method: HttpMethod) {
    return (
      path: string,
      requestOrHandlerOrMiddleware: any,
      handler?: any
    ): Route => {
      return this.req(method, path, requestOrHandlerOrMiddleware, handler)
    }
  }
}

// 方案 B: 使用 Proxy (更激進)
class Router {
  constructor(private core: PlanetCore) {
    return new Proxy(this, {
      get(target, prop) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(prop as string)) {
          return target.createRouteMethod(prop as HttpMethod)
        }
        return target[prop as keyof Router]
      }
    })
  }
}
```

**注意事項**:
- 需保持現有的函數重載定義（用於類型推導）
- 動態方法可能影響 IDE 的類型推斷，需測試

---

## 🟡 優先級 2：高優先級問題 (High)

### 2.1 Application 和 PlanetCore 的 Container 不一致

**影響檔案**: `src/Application.ts:145-165`

**問題描述**:
```typescript
export class Application {
  public readonly container: Container
  public readonly core: PlanetCore

  constructor(options: ApplicationConfig) {
    // Application 創建自己的 Container
    this.container = new Container()
    this.config = new ConfigManager(options.config ?? {})

    // PlanetCore 內部又創建另一個 Container！
    this.core = new PlanetCore({
      logger: this.logger,
      config: options.config,
    })

    // 註釋中也提到了這個問題：
    // Note: PlanetCore creates its own container, so we need to use that
    // In future, we might want to inject the container into PlanetCore

    this.events = this.core.events

    // Application.container 註冊服務
    this.container.instance('app', this)
    this.container.instance('config', this.config)
    // ...
  }

  // 但 make() 方法使用的是 core.container！
  make<T>(key: string): T {
    return this.core.container.make<T>(key)  // ← 不是 this.container
  }
}
```

**問題影響**:
- 🔴 兩個獨立的 DI 容器導致服務作用域不一致
- 🔴 在 Application.container 註冊的服務在 core.container 中無法訪問
- 🔴 開發者困惑：該使用哪個容器？
- 🔴 記憶體浪費：維護兩個容器實例

**建議方案**:
```typescript
export class Application {
  constructor(options: ApplicationConfig) {
    // 先創建共享的 Container
    this.container = new Container()
    this.config = new ConfigManager(options.config ?? {})

    // 將 Container 注入 PlanetCore
    this.core = new PlanetCore({
      logger: this.logger,
      config: options.config,
      container: this.container,  // ← 共享同一個容器
    })

    // 註冊服務到共享容器
    this.container.instance('app', this)
    this.container.instance('config', this.config)
  }

  make<T>(key: string): T {
    return this.container.make<T>(key)  // ← 現在一致了
  }
}
```

**需要修改的檔案**:
- `src/Application.ts`
- `src/PlanetCore.ts` (添加可選的 container 參數)

---

### 2.2 Catch Blocks 缺少 Type Guards

**影響檔案**:
- `src/Router.ts:72-75` (isFormRequestClass 函數)
- `src/Application.ts:239-241` (loadConfiguration 方法)
- `src/Application.ts:289-290` (discoverProviders 方法)

**問題描述**:
```typescript
// src/Router.ts:60-75
try {
  const instance = new (value as new () => unknown)()
  const isFormRequest =
    instance !== null &&
    typeof instance === 'object' &&
    'schema' in instance &&
    'validate' in instance &&
    typeof (instance as FormRequestLike).validate === 'function'

  formRequestCache.set(value, isFormRequest)
  return isFormRequest
} catch {  // ← 沒有錯誤參數，無法區分錯誤類型
  formRequestCache.set(value, false)
  return false
}
```

```typescript
// src/Application.ts:239-241
} catch (err) {
  this.logger.warn(`Failed to load config ${file}:`, err)  // ← err 類型為 unknown
}
```

**問題影響**:
- 🔍 難以診斷具體錯誤原因
- 🐛 可能掩蓋真正的程序錯誤
- 📝 日誌信息不夠詳細

**建議方案**:
```typescript
// Router.ts
try {
  const instance = new (value as new () => unknown)()
  // ...
} catch (error) {
  // 添加類型守衛
  if (error instanceof TypeError) {
    // 構造函數不存在或參數錯誤
    this.logger?.debug(`FormRequest detection failed: Invalid constructor for ${value.name}`)
  } else if (error instanceof ReferenceError) {
    // 依賴缺失
    this.logger?.debug(`FormRequest detection failed: Missing dependencies for ${value.name}`)
  } else {
    // 其他未預期的錯誤
    this.logger?.warn(`Unexpected error during FormRequest detection:`, error)
  }
  formRequestCache.set(value, false)
  return false
}

// Application.ts
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  this.logger.warn(`Failed to load config ${file}: ${message}`, { stack })
}
```

---

### 2.3 路由編譯 O(n²) 算法

**影響檔案**: `src/Router.ts:345-386` (compile 方法)

**問題描述**:
```typescript
compile() {
  const compiled: Array<{...}> = []

  // 第一個循環：O(n)
  for (const route of this.routes) {
    const method = route.method.toUpperCase()
    compiled.push({
      method,
      path: route.path,
      domain: route.domain,
      name: nameMap.get(`${method}:${route.path}`),
    })
  }

  // 第二個循環：O(n)
  for (const [name, info] of this.namedRoutes) {
    // 內層搜索：O(n)！
    const exists = compiled.some(  // ← O(n) 操作
      (r) => r.method === info.method.toUpperCase() && r.path === info.path
    )
    if (!exists) {
      compiled.push({...})
    }
  }

  return compiled
  // 總時間複雜度：O(n) + O(n × n) = O(n²)
}
```

**效能影響分析**:
| 路由數量 | 當前算法 | 優化後 | 差異 |
|---------|---------|--------|-----|
| 10 條   | ~100 次比較 | ~10 次 | 10× |
| 100 條  | ~10,000 次 | ~100 次 | 100× |
| 500 條  | ~250,000 次 | ~500 次 | 500× |

**建議方案**:
```typescript
compile() {
  const compiled: Array<{...}> = []
  const compiledKeys = new Set<string>()  // ← 添加 Set 用於 O(1) 查找

  // 創建名稱映射
  const nameMap = new Map<string, string>()
  for (const [name, info] of this.namedRoutes) {
    nameMap.set(`${info.method.toUpperCase()}:${info.path}`, name)
  }

  // 第一個循環：O(n)
  for (const route of this.routes) {
    const method = route.method.toUpperCase()
    const key = `${method}:${route.path}`

    compiledKeys.add(key)  // ← O(1) 插入
    compiled.push({
      method,
      path: route.path,
      domain: route.domain,
      name: nameMap.get(key),
    })
  }

  // 第二個循環：O(n)
  for (const [name, info] of this.namedRoutes) {
    const key = `${info.method.toUpperCase()}:${info.path}`

    if (!compiledKeys.has(key)) {  // ← O(1) 查找！
      compiled.push({
        name,
        method: info.method.toUpperCase(),
        path: info.path,
        domain: info.domain,
      })
    }
  }

  return compiled
  // 新時間複雜度：O(n) + O(n) = O(n)
}
```

**效能提升**: 從 O(n²) → O(n)，對於大型應用（100+ 路由）提升顯著

---

## 🟢 優先級 3：中等優先級 (Medium)

### 3.1 Cookie 解析邏輯重複

**影響檔案**: `src/http/middleware/csrf.ts:15-30`

**問題描述**:
CSRF middleware 中手動解析 Cookie，但框架已有 CookieJar 可用：

```typescript
// src/http/middleware/csrf.ts
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies

  const pairs = cookieHeader.split(';')
  for (const pair of pairs) {
    const [key, ...values] = pair.split('=')
    const k = key?.trim()
    const v = values.join('=').trim()
    if (k) {
      cookies[k] = decodeURIComponent(v)
    }
  }
  return cookies
}

// 使用
const cookies = parseCookies(ctx.req.header('cookie'))
const token = cookies[cookieName]
```

**問題影響**:
- 🔁 代碼重複（CookieJar 已實現）
- 🐛 維護成本：兩處邏輯需同步更新
- 📦 Bundle 體積增加

**建議方案**:
```typescript
// 直接使用 CookieJar API
const token = ctx.req.cookie(cookieName)

// 或者如果 CookieJar 沒有直接的 cookie() 方法，添加一個：
// src/http/CookieJar.ts
export class CookieJar {
  // 現有方法...

  /**
   * Parse all cookies from header
   */
  static parseCookies(cookieHeader: string | undefined): Record<string, string> {
    // 移動 csrf.ts 中的實現到這裡
  }
}

// csrf.ts 中使用
import { CookieJar } from '../CookieJar'
const cookies = CookieJar.parseCookies(ctx.req.header('cookie'))
const token = cookies[cookieName]
```

---

### 3.2 PhotonAdapter 中的 `any` 類型

**影響檔案**: `src/adapters/PhotonAdapter.ts`

**問題位置**:
- Line 53: `const nativeReq = target.photonCtx.req as any`
- Line 72: `const nativeRes = target.photonCtx.res as any`
- Line 93: Similar pattern
- Line 113: Similar pattern
- Line 143: Similar pattern
- Line 204: `get data(): any { ... }`
- Line 208: `get files(): any { ... }`
- Line 242: Type assertion chains

**問題描述**:
```typescript
// src/adapters/PhotonAdapter.ts:53
get body(): unknown {
  const nativeReq = target.photonCtx.req as any  // ← 失去類型安全
  return nativeReq.body
}

// Line 204
get data(): any {
  return this.method() === 'GET' ? this.query() : this.body()
}
```

**問題影響**:
- ❌ 與 Photon 框架的類型定義失去同步
- ❌ 重構時容易引入錯誤
- ❌ IDE 無法提供準確的自動完成

**建議方案**:

**選項 A**: 定義 Photon 類型聲明文件
```typescript
// src/adapters/types/photon.d.ts
declare module '@photon-js/core' {
  export interface PhotonRequest {
    body: unknown
    query: Record<string, string | string[]>
    params: Record<string, string>
    // ... 其他屬性
  }

  export interface PhotonResponse {
    status: (code: number) => PhotonResponse
    json: (data: unknown) => void
    // ...
  }

  export interface PhotonContext {
    req: PhotonRequest
    res: PhotonResponse
  }
}

// PhotonAdapter.ts
import type { PhotonContext, PhotonRequest } from '@photon-js/core'

get body(): unknown {
  const nativeReq = target.photonCtx.req as PhotonRequest  // ← 類型安全
  return nativeReq.body
}
```

**選項 B**: 使用泛型約束
```typescript
interface NativeRequest {
  body: unknown
  query: Record<string, string | string[]>
}

class PhotonAdapter<TReq extends NativeRequest = NativeRequest> {
  get body(): unknown {
    return (this.photonCtx.req as TReq).body
  }
}
```

**選項 C**: 如果 Photon 已有類型定義，直接導入使用

---

### 3.3 測試覆蓋率不足

**當前狀態**:
- 源碼: ~10,195 行
- 測試: ~2,400 行
- 覆蓋率: ~23%
- 目標: 35-50%

**缺失的測試場景**:

#### FormRequest 檢測
```typescript
// 需要測試的邊緣案例：
- ✅ 正常的 FormRequest 類
- ❌ 沒有 schema 屬性的類
- ❌ schema 存在但 validate 不是函數
- ❌ 構造函數拋出錯誤
- ❌ 構造函數需要參數
- ❌ Symbol 標記的 FormRequest
- ❌ 緩存是否正確工作
```

#### 命名路由 URL 生成
```typescript
// 需要測試的場景：
- ✅ 基本參數替換
- ❌ 缺少必需參數時拋出錯誤
- ❌ 特殊字符的 URL 編碼
- ❌ 查詢參數的處理
- ❌ undefined/null 參數的過濾
- ❌ 域名約束的路由
```

#### PhotonAdapter Proxy
```typescript
// 需要測試的場景：
- ✅ 基本的 Proxy 轉發
- ❌ 不存在的屬性訪問
- ❌ 方法調用的綁定
- ❌ 嵌套對象訪問
- ❌ 性能：Proxy 開銷
```

#### Application 自動發現
```typescript
// 需要測試的場景：
- ✅ 正常的 Provider 加載
- ❌ Provider 文件不存在
- ❌ Provider 類無效
- ❌ Provider 構造函數拋出錯誤
- ❌ Config 目錄不存在
- ❌ Config 文件語法錯誤
```

#### EventManager 廣播
```typescript
// 需要測試的場景：
- ✅ 正常的事件派發
- ❌ 監聽器拋出錯誤時繼續執行其他監聽器
- ❌ once() 監聽器只執行一次
- ❌ 移除監聽器後不再觸發
- ❌ 異步監聽器的執行順序
```

**建議的測試文件**:
```
tests/unit/
  ├── Router.formRequest.test.ts         (新增)
  ├── Router.namedRoutes.test.ts         (新增)
  ├── PhotonAdapter.proxy.test.ts        (新增)
  ├── Application.discovery.test.ts      (增強現有)
  └── EventManager.broadcast.test.ts     (增強現有)
```

---

## 📊 統計總結

### 類型安全問題統計
| 檔案 | `any` 使用次數 | 優先級 |
|-----|--------------|--------|
| Route.ts | 6 處 | 🔴 Critical |
| PhotonAdapter.ts | 8+ 處 | 🟢 Medium |
| Router.ts | 2 處 (cast) | 🟡 High |
| **總計** | **16+ 處** | - |

### 代碼重複統計
| 位置 | 重複行數 | 重複次數 | 總浪費 |
|-----|---------|---------|--------|
| HTTP 方法 (get/post/put/delete/patch) | ~20 行 | ×15 方法 | ~265 行 |
| Cookie 解析 | ~15 行 | ×2 處 | ~15 行 |
| **總計** | - | - | **~280 行** |

### 效能問題統計
| 問題 | 複雜度 | 影響場景 | 優化後 |
|-----|--------|---------|--------|
| 路由編譯 | O(n²) | 100+ 路由 | O(n) |
| FormRequest 實例化 | 每次請求 | 高並發 | 單例緩存 |

---

## 📋 建議的實施順序

### 階段 1: 類型安全 (2-3 小時)
1. ✅ 修復 Route.ts 中的 `any` 類型 (1.1)
2. ✅ 添加 catch block type guards (2.2)

### 階段 2: 效能優化 (2-3 小時)
3. ✅ 實現 FormRequest 緩存 (1.2)
4. ✅ 優化路由編譯算法 (2.3)

### 階段 3: 代碼品質 (3-4 小時)
5. ✅ 移除 HTTP 方法重複 (1.3)
6. ✅ 修復 Container 不一致 (2.1)
7. ✅ 提取共享 Cookie 解析 (3.1)

### 階段 4: 進階優化 (3-4 小時)
8. ✅ 優化 PhotonAdapter 類型 (3.2)
9. ✅ 提升測試覆蓋率 (3.3)

**總預估時間**: 10-14 小時

---

## 🔄 驗證清單

優化完成後，請確認：

### 類型檢查
- [ ] `npm run build` 無 TypeScript 錯誤
- [ ] 所有 `any` 類型都有明確的理由
- [ ] IDE 自動完成正常工作

### 測試驗證
- [ ] `npm test` 所有測試通過
- [ ] 新增測試覆蓋新邏輯
- [ ] 測試覆蓋率 ≥ 35%

### 效能驗證
- [ ] 路由編譯時間測試（100+ 路由）
- [ ] FormRequest 記憶體使用測試
- [ ] 高並發請求測試

### 向後兼容
- [ ] 所有公共 API 保持不變
- [ ] 現有應用無需修改
- [ ] 文檔無需大幅更新

---

## 📝 備註

### 關於 `any` 類型的使用
在某些情況下，`any` 可能是合理的選擇：
- 與未類型化的第三方庫交互
- 類型過於複雜，寫出來反而降低可讀性
- 確實是"任意類型"的設計意圖

但在本報告中識別的 `any` 使用，大多可以用更精確的類型替代。

### 關於效能優化
路由編譯和 FormRequest 實例化的優化，對於小型應用（<50 路由，<1000 req/s）可能感知不明顯。
但對於企業級應用，這些優化可以帶來顯著的效能提升和成本節省。

### 關於代碼重複
雖然 DRY (Don't Repeat Yourself) 是重要原則，但過度抽象也會降低可讀性。
本報告中標記的重複，都是"機械性重複"（結構相同，只是參數不同），這類重複最適合抽象。

---

**報告結束**

此報告將在您的優化合併進 main 分支後，用於對比分析哪些問題已解決，哪些需要進一步處理。
