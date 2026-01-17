# Phase 6: Container Symbol Key

> **適用範圍**: 全局  
> **優先級**: P6（低影響，可選）

## 問題分析

**文件**: `packages/core/src/Container.ts`

```typescript
// 當前：使用字符串 key
private bindings = new Map<string, Binding>()
private instances = new Map<string, unknown>()

make<T>(key: string): T {
  if (this.instances.has(key)) {  // 字符串比較
    return this.instances.get(key) as T
  }
  // ...
}
```

## 優化方案: Symbol Key

```typescript
// 服務定義時創建 Symbol（應用啟動時一次性操作）
export const SERVICE_KEYS = {
  UserService: Symbol('UserService'),
  CacheService: Symbol('CacheService'),
  DatabaseService: Symbol('DatabaseService'),
} as const

export type ServiceKey = (typeof SERVICE_KEYS)[keyof typeof SERVICE_KEYS]

// Container 實現
class Container {
  private bindings = new Map<symbol | string, Binding>()
  private instances = new Map<symbol | string, unknown>()
  
  // 支援 Symbol 和 string（向後相容）
  bind<T>(key: symbol | string, factory: Factory<T>): void {
    this.bindings.set(key, { factory: factory as Factory<unknown>, shared: false })
  }
  
  singleton<T>(key: symbol | string, factory: Factory<T>): void {
    this.bindings.set(key, { factory: factory as Factory<unknown>, shared: true })
  }
  
  make<T>(key: symbol | string): T {
    // Symbol 比較比字符串稍快
    if (this.instances.has(key)) {
      return this.instances.get(key) as T
    }
    // ...
  }
}

// 使用方式
container.singleton(SERVICE_KEYS.UserService, (c) => new UserService(c))
const userService = container.make<UserService>(SERVICE_KEYS.UserService)
```

## 預估影響

```
當前:
  - Map.has(string)    ~15ns
  - Map.get(string)    ~15ns
  
優化後:
  - Map.has(symbol)    ~10ns
  - Map.get(symbol)    ~10ns
```

**預估效能提升**: 2-3%（主要影響 DI 密集的應用）

## 實施建議

由於影響較小，建議：
1. 在 Container API 中支援 Symbol（向後相容）
2. 在文件中推薦使用 Symbol 作為最佳實踐
3. 不強制遷移現有代碼

## 修正版建議

1. **文件明確指引**
   - 建議用 `Symbol`，但保留 string 為預設支援
