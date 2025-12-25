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

在控制器中，您可以安全地取得驗證後的數據：

```typescript
async store(c: Context) {
  // 取得驗證過且帶有正確型別的數據
  const data = c.req.valid('json');
  
  const user = await User.create(data);
  return c.json(user, 201);
}
```

## 自定義驗證行為

您可以在 Form Request 類別中定義 `authorize` 方法（如果已實作此功能）或自定義錯誤訊息邏輯。
