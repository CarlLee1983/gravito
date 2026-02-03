---
title: Webhook 系統 (Echo)
description: 了解如何使用 Gravito Echo 安全地接收與發送 Webhooks。
---

# Webhook 系統 (Echo)

> `@gravito/echo` 提供美觀且安全的 Webhook 解決方案，支援簽名驗證、重試機制與多種服務供應商。

## 接收 Webhook

安全地接收來自 Stripe、GitHub 或自定義服務的訊號。

```typescript
import { Echo } from '@gravito/echo'

core.app.post('/webhooks/stripe', async (c) => {
  const echo = c.get('echo')
  
  // 自動驗證簽名並處理事件
  const event = await echo.receive('stripe', c.req)
  
  if (event.type === 'checkout.session.completed') {
    // 處理訂單...
  }

  return c.json({ received: true })
})
```

## 發送 Webhook

向外部服務發送通知，內建可靠的重試機制。

```typescript
const echo = c.get('echo')

await echo.send('https://example.com/callback', {
  event: 'order.created',
  data: { id: 123 }
}, {
  secret: 'your_signing_secret'
})
```

## 支援供應商 (Providers)

- Stripe
- GitHub
- Shopify
- Slack
- 自定義 (Hmac)

---

## 下一步
了解如何使用 [通知系統](./notifications.md) 通知使用者。
