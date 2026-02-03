---
title: 錯誤處理 (Error Handling)
description: 了解如何在 Gravito 中捕捉、處理與回傳優雅的錯誤回應。
---

# 錯誤處理

Gravito 內建了一套完整的錯誤處理機制，會自動捕捉執行過程中的例外，並根據內容協商（HTML 或 JSON）回傳對應的結果。

## 配置

錯誤處理的細項通常在 `src/bootstrap.ts` 的核心初始化中配置：

```typescript
const core = new PlanetCore({
  // 可以自定義 Logger 來捕捉錯誤日誌
  logger: myCustomLogger,
});
```

## 丟出錯誤

您可以在代碼的任何地方拋出 `HttpException` 或一般的 `Error`，Gravito 會負責後續的流程：

```typescript
import { HttpException } from '@gravito/core';

export class PostController {
  async show(c: Context) {
    const post = await Post.find(c.req.param('id'));

    if (!post) {
      // 快速丟出 404
      throw new HttpException(404, '文章不存在');
    }

    return c.json(post);
  }
}
```

## 自定義錯誤處理

如果您想針對特定類型的錯誤進行特殊處理，可以使用 **Hook 系統**：

```typescript
core.hooks.addFilter('error:context', (context) => {
  if (context.error instanceof DatabaseError) {
    context.status = 503;
    context.payload.message = '資料庫暫時維護中';
  }
  return context;
});
```

### 錯誤回應過濾器

| Hook | 說明 |
| --- | --- |
| `error:context` | 在回傳前修改錯誤內容、狀態碼或 log 等級 |
| `error:report` | 用於將錯誤報告給 Sentry 或其他監控服務 |
| `error:render` | 覆蓋預設的渲染邏輯（例如回傳自定義的 HTML） |

## 錯誤頁面 (Error Pages)

對於 HTML 請求，Gravito 會尋找對應狀態碼的樣板。您可以在 `src/views/errors/` 目錄下建立以下檔案：

- `404.hbs`：找不到頁面時顯示。
- `500.hbs`：系統崩潰時顯示。
- `default.hbs`：其他未定義錯誤的備用頁。

## 例外處理原則

1.  **區分環境**：在開發環境 (`NODE_ENV=development`)，Gravito 會顯示詳細的 Stack Trace；在生產環境則會隱藏敏感資訊，僅顯示通用的錯誤訊息。
2.  **型別安全**：建議使用 `GravitoException` 及其子類別，以獲得更好的 i18n 支援。

---

## 接下來
閱讀 [日誌系統](./logging.md) 了解如何紀錄應用程式的執行過程。
