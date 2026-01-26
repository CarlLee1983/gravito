# 驗證 (Validation)

Gravito 提供了強大的驗證功能，確保您的應用程式處理的數據是乾淨且符合預期的。推薦的方式是使用 **Form Requests**。

## 建立 Form Requests

Form Request 是一個封裝了驗證邏輯的類別。通常我們會搭配 **Impulse** (基於 Zod) 來定義結構。

```typescript
import { FormRequest } from '@gravito/impulse';
import { z } from 'zod';

export class StoreUserRequest extends FormRequest {
  // 定義 Zod 驗證結構
  schema = z.object({
    name: z.string().min(2).max(255),
    email: z.string().email(),
    password: z.string().min(8),
  });
}
```

## 在路由中使用驗證

要在路由中使用 Form Request，請將其作為第二個參數傳遞給路由方法：

```typescript
routes.post('/user', StoreUserRequest, [UserController, 'store']);
```

### 驗證流程

1.  當請求進入時，Gravito 會自動實例化 `StoreUserRequest`。
2.  執行驗證。如果驗證失敗，會自動回傳 `422 Unprocessable Entity` 回應與錯誤訊息。
3.  如果驗證通過，請求會繼續到達控制器。

## 取得驗證過的數據

在控制器中，您可以透過 `c.get('validated')` 取得經過驗證的數據。這是最推薦的方式，因為它整合了 Impulse 的型別推斷：

```typescript
import type { GravitoContext } from '@gravito/core';

async store(c: GravitoContext) {
  // 取得驗證過的數據
  const data = c.get('validated') as { name: string; email: string };
  
  const user = await User.create(data);
  return c.json(user, 201);
}
```

或者，您也可以直接從請求對象取得：

```typescript
const data = c.req.valid('json');
```

注意：`Model.create()` 是非同步且會立即寫入資料庫。若只需要記憶體中的實例，請使用 `Model.make()`，再自行呼叫 `save()`。

## 效能 (Performance)

Gravito 的驗證系統（由 Impulse 驅動）內建多層快取機制，確保高效能表現：

- **Schema 編譯快取**：Zod 與 Valibot Schema 會被編譯為最佳化的驗證函數並進行快取。
- **實例重複利用**：FormRequest 實例會在請求間重複利用，大幅減少記憶體分配。
- **高效型別偵測**：系統自動偵測並快取 Schema 類型（Zod 或 Valibot），具備 O(1) 查找速度。
- **資料快取**：請求內容（Body）解析結果會被快取，避免重複操作。

即使是複雜的驗證規則，這些優化也能讓驗證過程極致快速。

## 自定義驗證行為

您可以在 Form Request 類別中定義 `authorize` 方法（如果已實作此功能）或自定義錯誤訊息邏輯。
