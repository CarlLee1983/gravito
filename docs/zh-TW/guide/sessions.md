---
title: Session 會話管理
description: 了解如何在 Gravito 中使用 Session 管理使用者狀態與資料。
---

# Session 會話管理

> **Pulsar** 是 Gravito 的官方 Session 模組，它提供了類似 Laravel 的開發體驗，支援多種驅動程式與快閃資料功能。

## 安裝與配置

首先，請確保您已安裝 `@gravito/pulsar` 套件：

```bash
bun add @gravito/pulsar
```

在 `src/bootstrap.ts` 中啟用並配置 Pulsar：

```typescript
import { defineConfig } from '@gravito/core';
import { OrbitPulsar } from '@gravito/pulsar';

export default defineConfig({
  config: {
    session: {
      driver: 'memory', // 開發建議使用 memory，正式環境建議使用 cache (Redis)
      cookie: { 
        name: 'gravito_session',
        secure: true,
        httpOnly: true
      },
      idleTimeoutSeconds: 1800, // 30 分鐘
    }
  },
  orbits: [new OrbitPulsar()]
});
```

## 基本用法

### 取得 Session 實例

在控制器中，您可以透過 `Context` 取得 session 物件：

```typescript
export class UserController {
  index(c: Context) {
    const session = c.get('session');
    // ...
  }
}
```

### 讀取與儲存資料

```typescript
// 儲存資料
session.put('key', 'value');

// 讀取資料（可提供預設值）
const value = session.get('key', 'default');

// 檢查是否存在
if (session.has('key')) {
  // ...
}

// 刪除特定內容
session.forget('key');

// 清空所有資料
session.flush();
```

## Flash Data (快閃資料)

Flash 資料僅在 **下一次** 請求中可用，這非常適合用來儲存狀態訊息或驗證錯誤訊息。

```typescript
// 儲存快閃資料
session.flash('status', '設定已更新！');

// 取得快閃資料
const status = session.get('status');
```

如果您想讓資料多留一個回合，可以使用 `reflash` 或 `keep`：

```typescript
// 保留所有資料到下下次請求
session.reflash();

// 僅保留特定 key
session.keep(['status']);
```

## 重新產生 Session ID

為了防止 Session 固定攻擊 (Session Fixation)，在使用者登入或變更權限時，建議重新產生 Session ID：

```typescript
session.regenerate();
```

## Session 驅動程式

Pulsar 支援以下驅動程式：
- **memory**: 資料儲存在記憶體中（適合開發，重啟會消失）。
- **file**: 儲存在本機檔案中。
- **cache**: 使用 `@gravito/stasis` 的快取系統（推薦生產環境搭配 Redis）。
- **redis**: 直接與 Redis 通訊。

---

## 接下來
閱讀 [CSRF 防護](./csrf-protection.md) 了解如何保護您的 Session 免受跨站請求偽造攻擊。
