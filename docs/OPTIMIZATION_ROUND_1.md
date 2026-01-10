# Gravito Engine - Optimization Round 1

## 實施的優化

### 優化 1: 消除 URL 對象重複創建 ⚡️
**問題**: 每次 `FastContext.reset()` 都創建新的 `URL` 對象  
**影響**: 每個請求都有不必要的記憶體分配和 GC 壓力  
**解決方案**: 重用 URL 對象，只更新 `href` 屬性

```typescript
// Before
private _url!: URL
reset(request: Request, params = {}) {
  this._url = new URL(request.url)  // 每次都創建新對象
}

// After  
private _url: URL = new URL('http://localhost')  // 重用
reset(request: Request, params = {}) {
  this._url.href = request.url  // 只更新屬性
}
```

**預期收益**: 減少 ~5-10% 的記憶體分配

---

### 優化 2: 消除 Headers 對象重複創建 ⚡️
**問題**: 每次 `FastContext.reset()` 都創建新的 `Headers` 對象  
**影響**: 每個請求都有額外的對象創建開銷  
**解決方案**: 重用 Headers 對象，清空而非重建

```typescript
// Before
reset(request: Request, params = {}) {
  this._headers = new Headers()  // 每次都創建新對象
}

// After
reset(request: Request, params = {}) {
  // 清空現有對象
  this._headers.forEach((_, key) => this._headers.delete(key))
}
```

**預期收益**: 減少 ~3-5% 的記憶體分配

---

### 優化 3: 零中間件快速路徑 🚀
**問題**: 即使沒有中間件，也要執行 `executeMiddleware` 函數  
**影響**: 不必要的函數調用和 async 開銷  
**解決方案**: 檢測零中間件情況，直接調用 handler

```typescript
// Before
const response = await this.executeMiddleware(ctx, match.middleware, match.handler)

// After
if (match.middleware.length === 0) {
  return await match.handler(ctx)  // 直接調用
}
const response = await this.executeMiddleware(ctx, match.middleware, match.handler)
```

**預期收益**: 減少 ~10-15% 的函數調用開銷

---

### 優化 4: collectMiddleware 早期返回 ⚡️
**問題**: 即使沒有任何中間件，也要創建空數組並遍歷檢查  
**影響**: 不必要的數組操作  
**解決方案**: 檢測零中間件情況，立即返回空數組

```typescript
// Before
private collectMiddleware(path: string, routeMiddleware: Middleware[]): Middleware[] {
  const middleware: Middleware[] = []
  middleware.push(...this.globalMiddleware)  // 總是執行
  // ...
  return middleware
}

// After
private collectMiddleware(path: string, routeMiddleware: Middleware[]): Middleware[] {
  // 快速路徑：完全沒有中間件
  if (
    this.globalMiddleware.length === 0 &&
    this.pathMiddleware.size === 0 &&
    routeMiddleware.length === 0
  ) {
    return []  // 立即返回
  }
  // ...
}
```

**預期收益**: 減少 ~5% 的數組操作開銷

---

## 優化總結

### 關鍵改進
1. **減少對象創建**: URL 和 Headers 對象重用
2. **減少函數調用**: 零中間件快速路徑
3. **減少數組操作**: 早期返回空數組

### 預期總體收益
基於以上優化，預期總體性能提升：
- **最佳情況** (零中間件的簡單路由): +20-30%
- **一般情況** (少量中間件): +10-15%
- **最差情況** (大量中間件): +5-10%

### 測試驗證
✅ 所有 13 個單元測試通過  
⏳ Benchmark 運行中...

---

## 下一輪優化方向

如果當前優化仍未達標，考慮：

### 優化 5: 內聯關鍵路徑
- 將 `match()` 的靜態路由查找內聯到 `fetch()`
- 減少函數調用層級

### 優化 6: 移除不必要的 async/await
- 檢查哪些函數可以是同步的
- 減少 Promise 創建開銷

### 優化 7: 優化 JSON.stringify
- 對於簡單對象，考慮手動序列化
- 或使用更快的 JSON 庫

### 優化 8: 研究 Elysia 的技巧
- 分析 Elysia 為何比 Native 還快
- 可能使用了 Bun 的特殊 API

---

## Benchmark 結果對比

### 優化前
- Gravito: 73,106 req/s
- vs Hono: -10.4%
- vs Native: -22.3%

### 優化後
⏳ 等待結果...

---

## 優化時間線

- **22:38** - 開始性能分析
- **22:40** - 識別關鍵瓶頸
- **22:42** - 實施 4 項優化
- **22:43** - 測試通過
- **22:44** - 運行 benchmark

總耗時: ~6 分鐘
