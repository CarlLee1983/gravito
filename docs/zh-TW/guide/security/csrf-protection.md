---
title: CSRF 防護
description: 了解如何保護您的 Gravito 應用程式免受跨站請求偽造攻擊。
---

# CSRF 防護

跨站請求偽造 (CSRF) 是一種惡意攻擊，它會迫使已驗證的使用者在 Web 應用程式上執行非預期的操作。Gravito 的 **Pulsar** 模組內建了強大的 CSRF 防護機制。

## 運作原理

1.  當 Session 啟動時，Gravito 會為每個活躍用戶自動產生一個 CSRF "token"。
2.  此 token 會儲存在 Session 中，並作為一個名為 `XSRF-TOKEN` 的 Cookie 發送給瀏覽器。
3.  當發送非安全性請求（POST、PUT、PATCH、DELETE）時，客戶端必須在請求標頭中帶回正確的 Token。

## 啟用防護

確保在 `gravito.config.ts` 的 session 設定中啟用了 CSRF：

```typescript
config: {
  session: {
    csrf: {
      enabled: true,
      headerName: 'X-CSRF-Token', // 預設檢查的標頭
      ignore: (ctx) => {
        // 可以排除特定的路徑，例如 Webhooks
        return ctx.req.path.startsWith('/api/webhooks');
      }
    }
  }
}
```

## 前端實作

### 自動化 (Axios)

如果您使用 Axios 等現代 HTTP 客戶端，它們通常會自動讀取 `XSRF-TOKEN` cookie 並將其放入 `X-XSRF-TOKEN` 標頭中。在 Gravito 中，您只需要確保配置一致即可。

### 手動送出 (Fetch)

如果您使用原生 `fetch`，則需要手動處理：

```javascript
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('XSRF-TOKEN='))
  ?.split('=')[1];

fetch('/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': decodeURIComponent(csrfToken)
  },
  body: JSON.stringify({ title: 'Hello World' })
});
```

## 在樣板中使用

如果您使用 **Prism (Handlebars)** 引擎，可以在表單中加入 hidden 欄位（雖然 Gravito 預設推薦透過 Header 檢查，但亦支援透過表單欄位）：

```html
<form method="POST" action="/profile">
  <input type="hidden" name="_token" value="{{ csrf_token }}">
  <!-- ... -->
</form>
```

## 排除路由

有時您可能需要排除特定的路由免受 CSRF 檢查（例如支付平台的 Callbacks）：

```typescript
csrf: {
  enabled: true,
  ignore: (ctx) => {
    return ctx.req.path === '/paypal/notify';
  }
}
```

---

## 接下來
閱讀 [Session 管理](./sessions.md) 進一步了解如何儲存使用者狀態。
