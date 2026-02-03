---
title: 日誌系統 (Logging)
description: 學習如何配置與使用 Gravito 的日誌輸出，以監控應用程式的狀態。
---

# 日誌系統

不管是在開發階段還是生產環境，良好的日誌 (Logging) 紀錄是確保應用程式穩定性的關鍵。Gravito 提供了一個可插入式的日誌介面。

## 基礎用法

您可以透過 `c.logger` 存取當前請求的日誌器：

```typescript
export class ExampleController {
  index(c: Context) {
    c.logger.info('使用者造訪了首頁');
    c.logger.warn('這是一個警告訊息');
    c.logger.error('發生了重大的錯誤！', { userId: 123 });
    
    return c.text('OK');
  }
}
```

## 日誌等級

Gravito 支援以下標準日誌等級（由低到高）：
1.  **debug**：詳細的偵錯資訊。
2.  **info**：一般性訊息。
3.  **warn**：非嚴重的警告。
4.  **error**：嚴重的錯誤，需要介入處理。

## 自定義日誌處理器 (Loggers)

預設情況下，Gravito 使用 `ConsoleLogger` 將日誌輸出到終端機。您可以實作 `Logger` 介面來將日誌傳送到 Loki、Datadog 或儲存到檔案：

```typescript
import { Logger } from '@gravito/core';

class CloudWatchLogger implements Logger {
  info(message: string, context?: any) {
    // 實作傳送到雲端日誌的邏輯
  }
  // ... 其他實作
}

// 在入口點使用
const core = new PlanetCore({
  logger: new CloudWatchLogger()
});
```

## 日誌中介層

若要自動捕捉所有進入應用程式的請求詳情，可以使用日誌中介層：

```typescript
// src/bootstrap.ts
core.adapter.useGlobal(async (c, next) => {
  c.logger.info(`Request: ${c.req.method} ${c.req.path}`);
  await next();
});
```

---

## 接下來
閱讀 [錯誤處理](./errors.md) 了解如何紀錄特定的例外狀況。
