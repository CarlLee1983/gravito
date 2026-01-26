# Phase 7: 其他微優化

## 7.1 路徑提取優化 ✅ 已實現

**文件**: `packages/core/src/engine/path.ts`

**狀態**: 已經使用無 URL 物件的優化實現

```typescript
// 現有實現已最優化
export function extractPath(url: string): string {
  const protocolEnd = url.indexOf('://')
  const searchStart = protocolEnd === -1 ? 0 : protocolEnd + 3
  const pathStart = url.indexOf('/', searchStart)
  if (pathStart === -1) return '/'
  const queryStart = url.indexOf('?', pathStart)
  return queryStart === -1 ? url.slice(pathStart) : url.slice(pathStart, queryStart)
}
```

**無需額外優化**。

## 7.2 JSON 序列化快取（靜態響應）

對於健康檢查等靜態響應，可以預序列化：

```typescript
// 預序列化靜態響應
const healthResponse = JSON.stringify({ status: 'ok' })
const healthHeaders = { 'Content-Type': 'application/json' }

app.get('/health', (c) => {
  return new Response(healthResponse, { headers: healthHeaders })
})

// 更進階：預編碼為 Uint8Array
const healthBuffer = new TextEncoder().encode(healthResponse)

app.get('/health', (c) => {
  return new Response(healthBuffer, { headers: healthHeaders })
})
```

**適用場景**: 健康檢查、版本資訊等不變的響應

## 7.3 ThrottleRequests 優化

```typescript
// 當前：每次請求都計算 key
const key = `throttle:${ip}:${c.req.path}`

// 優化：使用 WeakMap 快取（自動 GC）
const keyCache = new WeakMap<Request, string>()

function getThrottleKey(c: GravitoContext): string {
  const raw = c.req.raw
  let key = keyCache.get(raw)
  if (!key) {
    const ip = resolveIp(c)
    key = `throttle:${ip}:${c.req.path}`
    keyCache.set(raw, key)
  }
  return key
}
```

## 7.4 Request Body 快取（FastContext）

`PhotonAdapter` 已有 `_cachedJsonBody` 快取，但 `FastContext` 沒有：

```typescript
// src/engine/FastContext.ts

class FastRequestImpl implements FastRequest {
  private _cachedJson: unknown = undefined
  private _jsonParsed = false
  
  async json<T = unknown>(): Promise<T> {
    if (!this._jsonParsed) {
      this._cachedJson = await this._request.json()
      this._jsonParsed = true
    }
    return this._cachedJson as T
  }
  
  // reset() 時清除快取
  reset(request: Request, params: Record<string, string> = {}): void {
    this._request = request
    this._params = params
    // ...
    this._cachedJson = undefined
    this._jsonParsed = false
  }
}
```
