# Phase 4: AOTRouter 中間件快取

> **適用範圍**: Gravito Engine  
> **優先級**: P4

## 問題分析

**文件**: `packages/core/src/engine/AOTRouter.ts:166-203`

**現狀**: 每次請求都遍歷 `pathMiddleware` Map

```typescript
private collectMiddleware(path: string, routeMiddleware: Middleware[]): Middleware[] {
  // 快速路徑已存在 ✅
  if (
    this.globalMiddleware.length === 0 &&
    this.pathMiddleware.size === 0 &&
    routeMiddleware.length === 0
  ) {
    return []
  }

  const middleware: Middleware[] = []

  // 1. Global middleware
  if (this.globalMiddleware.length > 0) {
    middleware.push(...this.globalMiddleware)
  }

  // 2. Pattern-based middleware - ❌ 每次請求迭代
  if (this.pathMiddleware.size > 0) {
    for (const [pattern, mw] of this.pathMiddleware) {
      if (pattern.includes(':')) {
        continue
      }
      if (this.matchPattern(pattern, path)) {
        middleware.push(...mw)
      }
    }
  }

  // 3. Route-specific middleware
  if (routeMiddleware.length > 0) {
    middleware.push(...routeMiddleware)
  }

  return middleware
}
```

**現有優化**: 已有快速路徑（無中間件時直接返回空陣列）

**剩餘問題**: 當有路徑中間件時，每次請求都需要迭代匹配

## 優化方案: 中間件匹配快取

```typescript
class AOTRouter {
  // 新增：路徑 -> 匹配的中間件快取
  private middlewareCache = new Map<string, Middleware[]>()
  private cacheMaxSize = 1000
  
  /**
   * 收集中間件（帶快取）
   */
  private collectMiddleware(path: string, routeMiddleware: Middleware[]): Middleware[] {
    // 快速路徑：無任何中間件
    if (
      this.globalMiddleware.length === 0 &&
      this.pathMiddleware.size === 0 &&
      routeMiddleware.length === 0
    ) {
      return []
    }
    
    // 快取 key: 結合 path 和 routeMiddleware 的身份
    // 使用 routeMiddleware.length 作為簡化的身份標識
    const cacheKey = `${path}:${routeMiddleware.length}`
    
    const cached = this.middlewareCache.get(cacheKey)
    if (cached !== undefined) {
      return cached  // ✅ O(1) 快取命中
    }
    
    // 首次計算
    const result = this.collectMiddlewareUncached(path, routeMiddleware)
    
    // 快取（帶大小限制）
    if (this.middlewareCache.size < this.cacheMaxSize) {
      this.middlewareCache.set(cacheKey, result)
    }
    
    return result
  }
  
  /**
   * 原始的中間件收集邏輯
   */
  private collectMiddlewareUncached(path: string, routeMiddleware: Middleware[]): Middleware[] {
    const middleware: Middleware[] = []

    if (this.globalMiddleware.length > 0) {
      middleware.push(...this.globalMiddleware)
    }

    if (this.pathMiddleware.size > 0) {
      for (const [pattern, mw] of this.pathMiddleware) {
        if (pattern.includes(':')) {
          continue
        }
        if (this.matchPattern(pattern, path)) {
          middleware.push(...mw)
        }
      }
    }

    if (routeMiddleware.length > 0) {
      middleware.push(...routeMiddleware)
    }

    return middleware
  }
  
  /**
   * 新增路由或中間件時清除快取
   */
  private invalidateCache(): void {
    this.middlewareCache.clear()
  }
  
  // 修改 add() 和 usePattern() 以在變更時清除快取
  add(method: HttpMethod, path: string, handler: Handler, middleware: Middleware[] = []): void {
    // ...existing code...
    this.invalidateCache()
  }
  
  usePattern(pattern: string, ...middleware: Middleware[]): void {
    // ...existing code...
    this.invalidateCache()
  }
}
```

## Trie 結構優化（進階，可選）

> **注意**: 對於大多數應用（< 50 個路徑中間件規則），簡單快取已足夠。Trie 結構是**過度工程**，僅在有大量路徑中間件規則時才考慮。

```typescript
// 僅供參考，不建議在初期實施
interface TrieNode {
  children: Map<string, TrieNode>
  middleware: Middleware[]
}

class PathMiddlewareTrie {
  private root: TrieNode = { children: new Map(), middleware: [] }
  
  add(pattern: string, middleware: Middleware[]): void {
    const parts = pattern.split('/').filter(Boolean)
    let node = this.root
    
    for (const part of parts) {
      if (!node.children.has(part)) {
        node.children.set(part, { children: new Map(), middleware: [] })
      }
      node = node.children.get(part)!
    }
    
    node.middleware.push(...middleware)
  }
  
  match(path: string): Middleware[] {
    const parts = path.split('/').filter(Boolean)
    const result: Middleware[] = []
    
    let node = this.root
    for (const part of parts) {
      if (node.children.has('*')) {
        result.push(...node.children.get('*')!.middleware)
      }
      
      if (node.children.has(part)) {
        node = node.children.get(part)!
        result.push(...node.middleware)
      } else {
        break
      }
    }
    
    return result
  }
}
```

## 預估影響

```
當前（每請求，10 個路徑中間件規則）:
  - Map 迭代 x10           ~100ns
  - matchPattern() x10     ~200ns
  - 總計: ~300ns
  
優化後（快取命中）:
  - Map.get()              ~10ns
  - 總計: ~10ns
```

**預估效能提升**: 5-10%（對於有多個路徑中間件的應用）

## 修正版建議

1. **快取鍵正確性**
   - 避免僅用 `routeMiddleware.length`，改為「路由 ID + middleware 參考」
2. **變更時完整失效**
   - `use`, `usePattern`, `add` 與路由重編譯時，都必須清掉快取
