# @gravito/pulsar 🛰️

> Gravito 的進階 Session 管理與 CSRF 保護 Orbit。

`@gravito/pulsar` 為無狀態的 HTTP 請求提供狀態化體驗。受 Laravel Session 系統啟發，它提供了一個高效能、開發者友善的 API 來管理跨請求的用戶數據，並結合了強大的 CSRF 安全保護。

## 🌟 核心特性

- **🚀 效能至上**：採用延遲載入 (Lazy-loading) 機制，並透過可配置的 touch 間隔大幅減少存儲 I/O。
- **🛡️ 整合式 CSRF 保護**：自動為所有非安全 HTTP 方法 (POST, PUT, DELETE) 生成並驗證 Token。
- **💾 多種存儲驅動**：原生支援 Memory、Redis、SQLite 以及檔案 (File) 存儲。
- **⚡ 閃存數據 (Flash Data)**：支援僅存續於下一次請求的臨時數據，非常適合顯示操作成功訊息。
- **🔒 安全導向**：使用加密安全的 Session ID，支援自動輪轉 (Rotation) 與安全 Cookie 處理。
- **📦 Galaxy 架構相容**：設計為標準的 Gravito Orbit，支援零配置整合。

## 📦 安裝

```bash
bun add @gravito/pulsar
```

## 🚀 快速上手

### 1. 註冊 Orbit

在 `PlanetCore` 啟動程序中配置 Pulsar。

```typescript
import { PlanetCore, defineConfig } from '@gravito/core'
import { OrbitPulsar } from '@gravito/pulsar'

const config = defineConfig({
  config: {
    session: {
      driver: 'redis',
      cookie: { name: 'gravito_sid', secure: true },
      idleTimeoutSeconds: 3600, // 1 小時
    },
  },
  orbits: [new OrbitPulsar()],
})

const core = await PlanetCore.boot(config)
```

### 2. 管理 Session 數據

透過請求上下文 (Context) 取得 Session 服務。

```typescript
app.post('/profile', async (c) => {
  const session = c.get('session')

  // 存儲數據
  session.put('user_id', 123)
  
  // 設置閃存數據（僅下一次請求有效）
  session.flash('status', '個人檔案已更新！')

  return c.redirect('/dashboard')
})

app.get('/dashboard', async (c) => {
  const session = c.get('session')
  
  const userId = session.get('user_id')
  const status = session.getFlash('status')

  return c.html(`用戶 ${userId}: ${status}`)
})
```

## 🛠️ 支援的驅動程式 (Drivers)

| 驅動名稱 | 依賴項目 | 適用場景 |
|---|---|---|
| **Memory** | 無 | 開發與測試環境 |
| **Redis** | `@gravito/plasma` | 可擴展的生產環境集群 |
| **SQLite** | `bun:sqlite` | 單機持久化存儲 |
| **File** | Node.js `fs` | 簡單的持久化存儲 |
| **Cache** | `OrbitCache` | 共享的快取基礎設施 |

## 🛡️ CSRF 保護

Pulsar 會自動啟用 CSRF 保護。要在前端使用：

1. 中間件會在每次請求時設置 `XSRF-TOKEN` Cookie。
2. 對於非 GET 請求，請在 Header 中包含 `X-XSRF-TOKEN` 或 `X-CSRF-TOKEN`。

```typescript
// Fetch 調用範例
await fetch('/api/data', {
  method: 'POST',
  headers: {
    'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
  },
  body: JSON.stringify(data)
})
```

## 🧩 API 參考

### `SessionService`
- `session.get(key, default?)`：讀取數值。
- `session.put(key, value)`：存儲數值。
- `session.flash(key, value)`：存儲臨時數據。
- `session.pull(key)`：讀取並立即刪除數值。
- `session.regenerate()`：更換 Session ID（防止 Session 固定攻擊）。
- `session.invalidate()`：清除所有數據並重置 ID。

### `CsrfService`
- `csrf.token()`：獲取當前會話的 CSRF Token。

## 🤝 參與貢獻

我們歡迎任何形式的貢獻！詳細資訊請參閱 [貢獻指南](../../CONTRIBUTING.md)。

## 📄 開源授權

MIT © Carl Lee
