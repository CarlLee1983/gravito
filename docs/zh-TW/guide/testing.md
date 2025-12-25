# HTTP 測試指南

Gravito 提供了一個強大、靈感來自 Laravel 的測試套件（Testing Harness），讓你能夠輕鬆模擬 HTTP 請求並對回應結果進行流暢的斷言。

## 簡介

在 Gravito 中，測試是頭等公民。基於 **Bun Test** 構建的 `HttpTester` 讓你能測試路由、控制器和中間件，而不需要真實網絡回環的開銷，執行速度極快。

## 發送請求

要開始測試，請對你的 `PlanetCore` 實例使用 `createHttpTester` 輔助函數。

```typescript
import { createHttpTester } from '@gravito/core';
import { core } from './app'; // 你的 PlanetCore 實例

const tester = createHttpTester(core);

it('可以渲染首頁', async () => {
  const response = await tester.get('/');
  
  await response.assertOk();
});
```

### 支援的方法

測試器支援所有常見的 HTTP 方法：

*   `tester.get(uri, headers?)`
*   `tester.post(uri, data?, headers?)`
*   `tester.put(uri, data?, headers?)`
*   `tester.patch(uri, data?, headers?)`
*   `tester.delete(uri, data?, headers?)`

### 發送 JSON 數據

當你將物件傳遞給 `post` 等方法時，Gravito 會自動將其序列化為 JSON 並設置 `Content-Type` 標頭：

```typescript
const response = await tester.post('/api/users', {
  name: 'Carl Lee',
  email: 'carl@gravito.dev'
});
```

---

## 回應斷言 (Response Assertions)

測試器返回的 `TestResponse` 提供了一套流暢的 API 來檢查回應。

### 狀態斷言 (Status Assertions)

*   `assertStatus(code)`：斷言特定的狀態碼。
*   `assertOk()`：斷言狀態碼為 200。
*   `assertCreated()`：斷言狀態碼為 201。
*   `assertNotFound()`：斷言狀態碼為 404。
*   `assertForbidden()`：斷言狀態碼為 403。
*   `assertUnauthorized()`：斷言狀態碼為 401。
*   `assertRedirect(uri?)`：斷言回應為重定向（可選指定 URI）。

### 內容斷言 (Content Assertions)

*   `assertSee(value)`：斷言回應 Body 包含給定字串。
*   `assertDontSee(value)`：斷言回應 Body 不包含給定字串。
*   `assertJson(data)`：斷言 JSON 回應包含給定的片段數據。
*   `assertExactJson(data)`：斷言 JSON 回應完全符合給定數據。
*   `assertJsonStructure(structure)`：斷言 JSON 回應具有預期的結構（鍵名）。

### Header 斷言

*   `assertHeader(key, value)`：斷言 Header 存在且值符合。
*   `assertHeaderMissing(key)`：斷言 Header 不存在。

---

## 完整測試範例

```typescript
import { describe, it, beforeEach } from 'bun:test';
import { PlanetCore, createHttpTester } from '@gravito/core';

describe('User API 測試', () => {
  let tester: any;

  beforeEach(async () => {
    // 啟動核心實例
    const core = await PlanetCore.boot();
    tester = createHttpTester(core);
  });

  it('可以建立使用者', async () => {
    const response = await tester.post('/api/users', { name: 'Carl' });

    // 流暢的斷言鏈
    await response
      .assertCreated()
      .assertJson({ created: true })
      .assertJsonStructure({ id: 0 });
  });
});
```
