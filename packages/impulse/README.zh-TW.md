---
title: Orbit Request (Impulse)
---

# Orbit Request 🚀

**Impulse** (@gravito/impulse) 是 Gravito 框架的高效能請求驗證模組。它提供了一種聲明式的、基於類別（Class-based）的驗證方式，靈感來自 Laravel 的 FormRequest，但專為 TypeScript 生態系重新設計，原生支援 **Zod** 和 **Valibot**。

## 🌟 核心特性

- **聲明式驗證**：將驗證規則組織在乾淨、可重用的類別中。
- **框架無關**：內建支援 [Zod](https://zod.dev/) 和 [Valibot](https://valibot.dev/)。
- **極致效能**：多層快取系統（實例、Schema、編譯快取）確保驗證速度極快。
- **類型安全**：完整的 TypeScript 推導。驗證後的資料會根據您的 Schema 自動標註類型。
- **豐富的上下文**：整合權限檢查（Authorization）、資料轉換（Transformation）和自定義錯誤訊息。
- **多種資料源**：輕鬆驗證 JSON 主體、Multipart 表單、查詢參數（Query）或路由參數（Params）。
- **Blueprint 生成**：自動將驗證規則導出為 JSON，方便前端同步驗證邏輯。
- **國際化支援**：可插拔的 `MessageProvider`，支援多國語言錯誤訊息。

## 📦 安裝

```bash
bun add @gravito/impulse
```

## 🚀 快速上手

### 1. 定義驗證類別

建立一個繼承自 `FormRequest` 的類別，並在 `schema` 屬性中定義規則。

```typescript
// src/requests/CreateUserRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class CreateUserRequest extends FormRequest {
  // 使用 Zod (或 Valibot) 定義規則
  schema = z.object({
    username: z.string().min(3).max(20),
    email: z.string().email(),
    password: z.string().min(8),
    age: z.number().min(18).optional(),
  })

  // 選填：在驗證前進行權限檢查
  async authorize(ctx) {
    // 只有管理員可以執行此操作
    return ctx.get('user')?.role === 'admin'
  }
}
```

### 2. 應用於路由

Impulse 與 Gravito 的路由系統完美整合。

```typescript
import { CreateUserRequest } from './requests/CreateUserRequest'

// 路由會自動套用驗證中間件
router.post('/users', CreateUserRequest, [UserController, 'store'])
```

### 3. 使用驗證後的資料

在控制器中直接存取安全且具備類型的資料。

```typescript
// src/controllers/UserController.ts
import { type CreateUserRequest } from '../requests/CreateUserRequest'
import { z } from 'zod'

export class UserController {
  async store(ctx) {
    // 資料已經過驗證且具備類型定義！
    const data = ctx.get('validated') as z.infer<CreateUserRequest['schema']>
    
    return ctx.json({ message: '用戶已建立', data }, 201)
  }
}
```

## 🛠️ 進階用法

### 資料來源 (Data Sources)
預設情況下，Impulse 會驗證 JSON body。您可以透過 `source` 屬性更改此行為：

```typescript
export class SearchRequest extends FormRequest {
  source = 'query' // 可選 'form', 'param', 'query', 'json'
  
  schema = z.object({
    q: z.string(),
    page: z.coerce.number().default(1)
  })
}
```

### 資料轉換 (Data Transformation)
在進入驗證器之前預處理輸入資料：

```typescript
export class ProfileRequest extends FormRequest {
  transform(data: any) {
    return {
      ...data,
      email: data.email?.toLowerCase(), // 將信箱轉為小寫
    }
  }
}
```

### 自定義錯誤訊息
使用更友好的訊息覆蓋函式庫的預設錯誤：

```typescript
export class LoginRequest extends FormRequest {
  messages() {
    return {
      'email.invalid_string': '請提供有效的電子郵件地址。',
      'password.too_small': '密碼長度至少需要 8 個字元。',
    }
  }
}
```

### Blueprints (前端同步)
獲取驗證規則的 JSON 表示法，用於前端同步：

```typescript
const request = new CreateUserRequest()
const blueprint = request.getBlueprint()
// 可用於動態生成前端表單或驗證邏輯
```

## ⚡ 效能優化

Impulse 將效能視為核心設計目標：

1.  **實例快取**：透過 `FormRequestInstanceCache` 重用 `FormRequest` 實例。
2.  **Schema 快取**：快取 Schema 函式庫偵測結果（Zod vs Valibot）。
3.  **編譯快取**：將 Schema 編譯為優化的驗證函數，重複執行速度提升可達 100 倍。
4.  **訊息快取**：根據欄位與錯誤代碼快取解析後的訊息。

## 🤝 支援

更多詳細資訊請造訪 [Gravito 官方文件](https://gravito.dev)。

## 📄 授權

MIT © Carl Lee
