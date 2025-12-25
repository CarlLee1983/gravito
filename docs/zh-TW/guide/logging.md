# 日誌 (Logging)

為了幫助您了解應用程式中發生的事情，Gravito 提供了強大的日誌記錄服務。預設情況下，Gravito 使用 `ConsoleLogger`，這在容器化環境 (如 Docker, Kubernetes) 中是最佳實踐。

## 寫入日誌訊息

您可以透過 `c.logger` (在控制器中) 或 `core.logger` (在全域服務中) 來寫入日誌。

```typescript
import { GravitoContext } from 'gravito-core';

export class UserController {
  async show(c: GravitoContext) {
    const id = c.req.param('id');
    
    c.logger.info(`正在查看使用者: ${id}`);
    
    try {
      // ...
    } catch (e) {
      c.logger.error('取得使用者失敗', e);
    }
  }
}
```

### 可用的日誌級別

Gravito 支援多種日誌級別：

```typescript
c.logger.debug('除錯訊息');
c.logger.info('一般資訊');
c.logger.warn('警告訊息');
c.logger.error('錯誤訊息');
```

## 上下文資訊

日誌記錄器會自動包含時間戳記與級別標籤。`ConsoleLogger` 會將錯誤物件 (Error Object) 格式化輸出，這對於除錯非常有幫助。
