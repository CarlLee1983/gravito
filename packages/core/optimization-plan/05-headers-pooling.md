# Phase 5: FastContext Headers 池化

> **適用範圍**: Gravito Engine  
> **優先級**: P5（需要基準測試驗證）

## 問題分析

**文件**: `packages/core/src/engine/FastContext.ts:131-137`

```typescript
reset(request: Request, params: Record<string, string> = {}): this {
  this._req.reset(request, params)
  // Optimization: Creating new Headers is faster than iterating to delete
  this._headers = new Headers()  // ← 原註解聲稱 new Headers() 更快
  return this
}
```

## 重要警告

⚠️ **源碼註解與優化方案矛盾**

現有註解說「Creating new Headers is faster than iterating to delete」。這可能是基於特定基準測試的結論。

**在實施此優化之前，必須先進行基準測試驗證**。

## 基準測試設計

```typescript
import { bench, group, run } from 'mitata'

group('Headers Reset Strategy', () => {
  // 策略 1: 每次創建新 Headers
  bench('new Headers()', () => {
    const h = new Headers()
    h.set('Content-Type', 'application/json')
    h.set('X-Request-ID', '123')
  })
  
  // 策略 2: 重用並追蹤刪除（1 個 header）
  const h1 = new Headers()
  const keys1: string[] = []
  bench('reuse + tracked delete (1 key)', () => {
    h1.set('Content-Type', 'application/json')
    keys1.push('Content-Type')
    for (const k of keys1) h1.delete(k)
    keys1.length = 0
  })
  
  // 策略 3: 重用並追蹤刪除（3 個 headers）
  const h3 = new Headers()
  const keys3: string[] = []
  bench('reuse + tracked delete (3 keys)', () => {
    h3.set('Content-Type', 'application/json')
    h3.set('X-Request-ID', '123')
    h3.set('Cache-Control', 'no-cache')
    keys3.push('Content-Type', 'X-Request-ID', 'Cache-Control')
    for (const k of keys3) h3.delete(k)
    keys3.length = 0
  })
  
  // 策略 4: 使用普通物件替代 Headers
  bench('plain object', () => {
    const h: Record<string, string> = {}
    h['Content-Type'] = 'application/json'
    h['X-Request-ID'] = '123'
  })
})

await run()
```

## 條件實施方案

**只有在基準測試證明「追蹤刪除」比「new Headers()」更快時，才實施以下方案**：

```typescript
class FastContext implements IFastContext {
  private _headers = new Headers()
  private _headerKeys: string[] = []
  
  reset(request: Request, params: Record<string, string> = {}): this {
    this._req.reset(request, params)
    
    // 只刪除實際設置過的 headers
    for (const key of this._headerKeys) {
      this._headers.delete(key)
    }
    this._headerKeys.length = 0
    
    return this
  }
  
  header(name: string, value: string): void {
    this._headers.set(name, value)
    this._headerKeys.push(name)
  }
}
```

## 替代方案: 使用普通物件

如果基準測試顯示普通物件更快，考慮：

```typescript
class FastContext implements IFastContext {
  private _headerObj: Record<string, string> = {}
  
  reset(request: Request, params: Record<string, string> = {}): this {
    this._req.reset(request, params)
    // 重置為空物件
    this._headerObj = {}
    return this
  }
  
  header(name: string, value: string): void {
    this._headerObj[name] = value
  }
  
  json<T>(data: T, status = 200): Response {
    this._headerObj['Content-Type'] = 'application/json; charset=utf-8'
    return new Response(JSON.stringify(data), {
      status,
      headers: this._headerObj,
    })
  }
}
```

## 預估影響

**待基準測試驗證**

如果優化有效: 3-5%  
如果現有實現已最優: 0%

## 修正版建議

1. **以數據為唯一條件**
   - 明確定義採用門檻（例如：平均耗時下降 > 10% 才採用）
2. **環境一致性**
   - 基準需固定 Bun 版本與硬體環境，避免誤判
