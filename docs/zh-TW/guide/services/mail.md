---
title: 郵件發送 (Mail)
description: 了解如何使用 Gravito Signal 發送美觀的電子郵件。
---

# 郵件發送 (Mail)

> Gravito 提供強大的郵件抽象層，支援 SMTP、SES 與多種渲染引擎（HTML, React, Vue）。

## 快速開始

### 定義 Mailable

Mailable 是代表一封特定郵件的類別。

```typescript
import { Mailable } from '@gravito/signal'

export class WelcomeEmail extends Mailable {
  constructor(private user: any) {
    super()
  }

  build() {
    return this
      .to(this.user.email)
      .subject('歡迎加入 Gravito!')
      .view('emails/welcome', { name: this.user.name })
  }
}
```

### 發送郵件

```typescript
core.app.post('/register', async (c) => {
  const mail = c.get('mail')
  const user = { name: 'Alice', email: 'alice@example.com' }

  // 立即發送
  await mail.send(new WelcomeEmail(user))

  return c.json({ message: '歡迎信已發送' })
})
```

## 配合佇列 (Queuing Mail)

如果要非同步發送郵件（推薦），只需確保您的環境已安裝 `@gravito/stream`：

```typescript
// 郵件將被推送到背景佇列處理
await new WelcomeEmail(user).queue()
```

## 配置

在 `gravito.config.ts` 中配置 `OrbitSignal`：

```typescript
import { OrbitSignal, SmtpTransport } from '@gravito/signal'

export default {
  orbits: [
    OrbitSignal.configure({
      from: { name: 'My App', address: 'no-reply@myapp.com' },
      transport: new SmtpTransport({
        host: 'smtp.mailtrap.io',
        port: 2525,
        auth: { user: '...', pass: '...' }
      })
    })
  ]
}
```

## 渲染引擎

- **HTML**: 直接傳入字串。
- **Views**: 使用 `c.view()` 渲染 `.hbs` 或其他模板。
- **React**: 使用 `c.react(Component, props)`。
- **Vue**: 使用 `c.vue(Component, props)`。

---

## 下一步
了解如何透過 [通知系統](./notifications.md) 發送多通路訊息。
