# Phase 2: MinimalContext Query 快取

> **適用範圍**: Gravito Engine (MinimalContext)  
> **優先級**: P2（計劃遺漏但影響顯著）

## 問題分析

**文件**: `packages/core/src/engine/MinimalContext.ts:47-67`

**現狀**: 每次調用 `query()` 都創建新的 `URL` 物件

```typescript
class MinimalRequest implements FastRequest {
  query(name: string): string | undefined {
    // ❌ 每次調用都創建 new URL()
    const url = new URL(this._request.url)
    return url.searchParams.get(name) ?? undefined
  }

  queries(): Record<string, string | string[]> {
    // ❌ 同樣的問題
    const url = new URL(this._request.url)
    const result: Record<string, string | string[]> = {}
    // ...
  }
}
```

**問題**:
1. `new URL()` 是相對昂貴的操作
2. 同一請求多次調用 `query()` 會重複創建
3. `MinimalContext` 是為「超輕量」設計的，但這個問題違反了設計意圖

## 優化方案: 延遲初始化 + 快取

```typescript
class MinimalRequest implements FastRequest {
  private _searchParams: URLSearchParams | null = null
  
  constructor(
    private readonly _request: Request,
    private readonly _params: Record<string, string>,
    private readonly _path: string
  ) {}
  
  /**
   * 延遲初始化 searchParams，只在首次訪問時解析
   */
  private getSearchParams(): URLSearchParams {
    if (this._searchParams === null) {
      // 方案 A: 使用 URL（完整解析）
      // this._searchParams = new URL(this._request.url).searchParams
      
      // 方案 B: 直接解析 query string（更快）
      const url = this._request.url
      const queryStart = url.indexOf('?')
      if (queryStart === -1) {
        this._searchParams = new URLSearchParams()
      } else {
        const hashStart = url.indexOf('#', queryStart)
        const queryString = hashStart === -1 
          ? url.slice(queryStart + 1)
          : url.slice(queryStart + 1, hashStart)
        this._searchParams = new URLSearchParams(queryString)
      }
    }
    return this._searchParams
  }

  query(name: string): string | undefined {
    return this.getSearchParams().get(name) ?? undefined
  }

  queries(): Record<string, string | string[]> {
    const params = this.getSearchParams()
    const result: Record<string, string | string[]> = {}
    
    for (const [key, value] of params.entries()) {
      const existing = result[key]
      if (existing === undefined) {
        result[key] = value
      } else if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        result[key] = [existing, value]
      }
    }
    return result
  }
}
```

## FastContext 同步優化

檢查 `FastContext` 是否有類似問題：

```typescript
// src/engine/FastContext.ts - FastRequestImpl

class FastRequestImpl implements FastRequest {
  private _url: URL = new URL('http://localhost') // ✅ 已重用
  private _query: URLSearchParams | null = null   // ✅ 已延遲初始化
  
  // 現有實現已經正確，無需修改
}
```

**結論**: `FastContext` 已正確實現延遲初始化，只需修復 `MinimalContext`。

## 預估影響

```
當前（每次 query() 調用）:
  - new URL()             ~200ns
  - searchParams.get()    ~20ns
  - 總計: ~220ns/次
  
優化後（首次調用）:
  - 直接解析 query string ~50ns
  - 快取 searchParams     ~10ns
  - 總計: ~60ns（首次）
  
優化後（後續調用）:
  - 讀取快取              ~5ns
  - searchParams.get()    ~20ns
  - 總計: ~25ns
```

**預估效能提升**: 5-8%（對於頻繁存取查詢參數的路由）

## 修正版建議

1. **邊界行為一致性**
   - 明確處理：無 `?`、只有 `?`、包含 `#` 的 URL
   - 與原 `new URL()` 行為比對（空值與重複 key 的處理）
