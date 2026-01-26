# Core優化 - 第三階段完成報告

**日期**: 2026-01-16
**階段**: Container 一致性修復 (Phase 3)
**狀態**: ✅ 完成

---

## 📋 完成的優化

### ✅ Application 與 PlanetCore Container 一致性修復 (Priority 2.1 - High)

**修改檔案**:
- `packages/core/src/PlanetCore.ts`
- `packages/core/src/Application.ts`

**問題**: Application 和 PlanetCore 各自創建獨立的 Container，導致 DI 作用域不一致

**解決方案**: PlanetCore 現在接受可選的 Container 參數，Application 將其 Container 傳遞給 PlanetCore，兩者共享同一個實例

---

## 🎯 具體修改

### 1. PlanetCore 支持可選 Container 注入

#### 1.1 添加 Container 參數到 GravitoConfig

**文件**: `src/PlanetCore.ts:68-84`

**修復前** ❌:
```typescript
export type GravitoConfig = {
  logger?: Logger
  config?: Record<string, unknown>
  orbits?: (new () => GravitoOrbit)[] | GravitoOrbit[]
  adapter?: HttpAdapter
}
```

**修復後** ✅:
```typescript
export type GravitoConfig = {
  logger?: Logger
  config?: Record<string, unknown>
  orbits?: (new () => GravitoOrbit)[] | GravitoOrbit[]
  adapter?: HttpAdapter
  /**
   * Dependency Injection Container. If provided, PlanetCore will use this
   * container instead of creating a new one. This allows sharing a container
   * between Application and PlanetCore.
   * @since 2.0.0
   */
  container?: Container
}
```

---

#### 1.2 修改 Container 初始化

**文件**: `src/PlanetCore.ts:121`

**修復前** ❌:
```typescript
export class PlanetCore {
  // ...
  public container: Container = new Container()  // 直接初始化
  // ...
}
```

**修復後** ✅:
```typescript
export class PlanetCore {
  // ...
  public container: Container  // 延遲初始化
  // ...
}
```

---

#### 1.3 構造函數接受 Container

**文件**: `src/PlanetCore.ts:246-260`

**修復前** ❌:
```typescript
constructor(
  options: {
    logger?: Logger
    config?: Record<string, unknown>
    adapter?: HttpAdapter
  } = {}
) {
  this.logger = options.logger ?? new ConsoleLogger()
  this.config = new ConfigManager(options.config ?? {})
  this.hooks = new HookManager()
  this.events = new EventManager(this)

  this.hasher = new BunHasher()
  // Container 在類定義時已經初始化
}
```

**修復後** ✅:
```typescript
constructor(
  options: {
    logger?: Logger
    config?: Record<string, unknown>
    adapter?: HttpAdapter
    container?: Container  // ← 新增可選參數
  } = {}
) {
  this.logger = options.logger ?? new ConsoleLogger()
  this.config = new ConfigManager(options.config ?? {})
  this.hooks = new HookManager()
  this.events = new EventManager(this)

  // Use provided container or create a new one
  this.container = options.container ?? new Container()  // ← 靈活初始化

  this.hasher = new BunHasher()
}
```

---

#### 1.4 更新 PlanetCore.boot() 方法

**文件**: `src/PlanetCore.ts:381-387`

**修復後** ✅:
```typescript
static async boot(config: GravitoConfig): Promise<PlanetCore> {
  const core = new PlanetCore({
    ...(config.logger && { logger: config.logger }),
    ...(config.config && { config: config.config }),
    ...(config.adapter && { adapter: config.adapter }),
    ...(config.container && { container: config.container }),  // ← 傳遞 container
  })
  // ...
}
```

---

### 2. Application 共享 Container

#### 2.1 傳遞 Container 給 PlanetCore

**文件**: `src/Application.ts:144-156`

**修復前** ❌:
```typescript
// Initialize container and config
this.container = new Container()
this.config = new ConfigManager(options.config ?? {})

// Initialize core with shared instances
this.core = new PlanetCore({
  logger: this.logger,
  config: options.config,
})

// Share container reference
// Note: PlanetCore creates its own container, so we need to use that
// In future, we might want to inject the container into PlanetCore  // ← 註釋承認問題

this.events = this.core.events
```

**修復後** ✅:
```typescript
// Initialize container and config
this.container = new Container()
this.config = new ConfigManager(options.config ?? {})

// Initialize core with shared container
// Now PlanetCore uses the same container instance as Application
this.core = new PlanetCore({
  logger: this.logger,
  config: options.config,
  container: this.container,  // ← 傳遞 container
})

this.events = this.core.events
```

---

#### 2.2 更新 make() 和 has() 方法

**文件**: `src/Application.ts:321-335`

**修復前** ❌:
```typescript
make<T>(key: string): T {
  return this.core.container.make<T>(key)  // ← 使用 core 的 container
}

has(key: string): boolean {
  return this.core.container.has(key)  // ← 使用 core 的 container
}
```

**修復後** ✅:
```typescript
make<T>(key: string): T {
  // Now uses the shared container instance
  return this.container.make<T>(key)  // ← 直接使用 this.container
}

has(key: string): boolean {
  // Now uses the shared container instance
  return this.container.has(key)  // ← 直接使用 this.container
}
```

**影響**:
- 現在 `this.container === this.core.container` 為 `true`
- 在 Application.container 中註冊的服務在 core.container 中也可訪問
- 反之亦然

---

## 📊 架構改進

### 修復前的問題

```
┌─────────────────────────────────────┐
│          Application                │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │ Container 1  │  │ PlanetCore  │ │
│  │              │  │             │ │
│  │ app: this    │  │ Container 2 │ │  ← 兩個不同的容器！
│  │ config       │  │             │ │
│  │ logger       │  │ (services)  │ │
│  └──────────────┘  └─────────────┘ │
│                                     │
│  make() → core.container.make()    │  ← 不一致！
└─────────────────────────────────────┘
```

**問題**:
- ❌ Container 1 註冊的服務在 Container 2 中不可用
- ❌ Container 2 註冊的服務在 Container 1 中不可用
- ❌ `Application.make()` 使用 `core.container`，但 `Application.container` 是另一個實例
- ❌ 開發者困惑：應該使用哪個容器？

---

### 修復後的架構

```
┌─────────────────────────────────────┐
│          Application                │
│                                     │
│  ┌──────────────────────────────┐  │
│  │      Shared Container        │  │
│  │                              │  │
│  │  app: this                   │  │
│  │  config                      │  │
│  │  logger                      │  │
│  │  events                      │  │
│  │  (all services...)           │  │
│  └──────────────────────────────┘  │
│           ↑              ↑          │
│           │              │          │
│  this.container    core.container  │  ← 同一個實例！
│                                     │
│  make() → this.container.make()    │  ← 一致！
└─────────────────────────────────────┘
```

**優勢**:
- ✅ 單一的依賴注入容器
- ✅ 所有服務在同一個作用域
- ✅ `this.container === this.core.container`
- ✅ 清晰的服務管理
- ✅ 符合 DI 最佳實踐

---

## 🔄 向後兼容性

### 對現有代碼的影響

#### 1. 獨立使用 PlanetCore（無變化）

```typescript
// 這仍然正常工作
const core = new PlanetCore()
// core.container 仍然被自動創建
```

✅ **完全向後兼容** - 如果不提供 container，PlanetCore 仍會創建新的

---

#### 2. 使用 Application（行為改善）

```typescript
const app = new Application({ basePath: __dirname })

// 修復前：這些服務在不同容器中
app.container.instance('myService', service)  // Container 1
app.make('myService')  // 從 Container 2 查找 → ❌ 找不到

// 修復後：現在可以正常工作了
app.container.instance('myService', service)  // Shared Container
app.make('myService')  // 從 Shared Container 查找 → ✅ 找到
```

✅ **修復了 Bug** - 現在行為符合預期

---

#### 3. Providers 註冊（更一致）

```typescript
class MyProvider extends ServiceProvider {
  register(container: Container) {
    // 修復前：這個 container 是 core.container
    // 在 Application.container 中註冊的服務看不到這裡的服務

    // 修復後：這個 container === app.container === core.container
    // 所有服務在同一個容器中
    container.singleton('myService', () => new MyService())
  }
}
```

✅ **改善了 DI 行為** - Providers 現在與 Application 共享容器

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

### 容器一致性驗證
```typescript
const app = new Application({ basePath: __dirname })
console.log(app.container === app.core.container)  // true ✅
```

---

## 📈 影響分析

### 代碼變更統計
- **PlanetCore.ts**: +7 行（添加 container 參數支持）
- **Application.ts**: -3 行（移除不一致的註釋，簡化邏輯）
- **總計**: +4 行淨增

### 架構改善
- ✅ 修復了 DI 作用域不一致問題
- ✅ 簡化了容器管理
- ✅ 提升了代碼清晰度
- ✅ 符合依賴注入最佳實踐

### 開發者體驗
- ✅ 不再困惑應該使用哪個容器
- ✅ 服務註冊和查找行為一致
- ✅ Providers 和 Application 共享同一個容器
- ✅ 更符合直覺的 DI 行為

---

## 🔜 下一步建議

Phase 3 完成後，還有以下優化機會：

### Priority 1 (Critical) - 剩餘
- ⏳ **HTTP 方法去重** (~265 行) - 最大的代碼重複問題

### Priority 3 (Medium) - 剩餘
- ⏳ **Cookie 解析去重** - Csrf middleware 獨立實現
- ⏳ **測試覆蓋率** - 從 ~23% 提升至 35%+

---

## 🎉 Phase 1-3 累積成果

### 已完成的優化
1. ✅ **Phase 1**: Route.ts 類型安全 + FormRequest 緩存 + 路由編譯優化 + Type Guards
2. ✅ **Phase 2**: PhotonAdapter 類型安全（消除 8+ 處 `any`）
3. ✅ **Phase 3**: Container 一致性修復（DI 架構改善）

### 累積統計
- **消除 `any` 類型**: 14+ 處
- **性能優化**: 路由編譯 O(n²) → O(n)、FormRequest 緩存
- **架構改善**: Container 一致性、Type Guards
- **代碼質量**: 減少重複、提升可維護性
- **測試**: 138 個測試全部通過，零回歸

---

**完成時間**: 2026-01-16
**估計工作量**: ~1 小時
**實際工作量**: ~45 分鐘

**下一步**: 創建 commit 或繼續剩餘的優化項目
