# Astral OpenAPI

Astral 是 Gravito 的 API 文檔解決方案。它能產生 **OpenAPI 3.1** 規格並提供內建的 Swagger UI，採用 **影子合約 (Shadow Contract)** 的設計理念，讓您的控制器保持乾淨，不受裝飾器污染。

## 簡介

在許多框架中，文檔邏輯往往會用大量的裝飾器（`@ApiOperation`, `@ApiResponse` 等）污染您的控制器程式碼。Astral 採取了不同的方法：

*   **邏輯分離：** 在獨立的合約文件中定義 API 元數據。
*   **自動推斷：** 它會讀取您的 Zod Schemas（來自 `Mass` 或 `Impulse`）自動生成文檔。
*   **即時文檔：** Swagger UI 會隨著您的 Schema 變更自動更新。

## 安裝

```bash
bun add @gravito/astral
```

## 快速開始

### 1. 定義 Schemas 與 Requests

Astral 與 Zod Schema 配合得最好。如果您已經使用 `@gravito/impulse` 進行驗證，那麼您已經完成了一半的工作。

```typescript
// src/dtos.ts
import { z } from 'zod'
import { FormRequest } from '@gravito/impulse'

export const UserDTO = z.object({
  id: z.number(),
  name: z.string().describe('使用者全名'),
  email: z.string().email().describe('已驗證的電子郵件')
})

export class CreateUserRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(2),
    email: z.string().email()
  })
}
```

### 2. 建立影子合約 (Shadow Contract)

影子合約將您的 API 路由映射到輸入/輸出 Schema。這個文件通常與您的控制器放在一起，或放在專門的 `contracts/` 目錄中。

```typescript
// src/contracts/UserContract.ts
import { astral } from '@gravito/astral'
import { CreateUserRequest, UserDTO } from '../dtos'

export const UserContract = astral.resource('/api/users', {
  tags: ['User Management'],
  operations: {
    index: {
      summary: '列出所有使用者',
      description: '回傳分頁的使用者列表。',
      output: [UserDTO] // 自動推斷陣列回應
    },
    store: {
      summary: '註冊新使用者',
      input: CreateUserRequest, // 從 FormRequest 提取 Schema
      output: UserDTO
    }
  }
})
```

### 3. 註冊 Orbit

在應用程式啟動流程中掛載 `OrbitAstral`，並將您的合約傳遞給配置。

```typescript
// src/bootstrap.ts
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitAstral } from '@gravito/astral'
import { UserContract } from './contracts/UserContract'

const config = defineConfig({
  orbits: [
    // ... 其他 orbits
    OrbitAstral.configure({
      title: '我的銀河 API',
      version: '1.0.0',
      description: 'Galaxy API 服務的說明文件。',
      contracts: [UserContract],
      uiPath: '/docs', // UI 路徑
      jsonPath: '/openapi.json' // JSON 規格路徑
    })
  ]
})

const app = await PlanetCore.boot(config)
export default app.liftoff()
```

現在，打開瀏覽器訪問 `http://localhost:3000/docs` 即可探索您的 API！

## 進階使用

### 合約分組

對於大型應用程式，您可以依據領域來組織合約。

```typescript
const CommerceContracts = [
  ProductContract,
  OrderContract,
  CartContract
]

OrbitAstral.configure({
  contracts: [
    ...AuthContracts,
    ...CommerceContracts
  ]
})
```

### 自定義操作

合約中的每個操作都支援廣泛的自定義選項，對應到 OpenAPI 的各個欄位。

```typescript
astral.route('POST', '/api/upload', {
  tags: ['Media'],
  summary: '上傳檔案',
  input: {
    contentType: 'multipart/form-data',
    schema: z.object({
      file: z.any().describe('二進位檔案數據')
    })
  },
  responses: {
    200: { description: '上傳成功', schema: FileDTO },
    400: { description: '無效的檔案類型' }
  },
  security: [{ bearerAuth: [] }]
})
```

### 身份驗證

您可以在配置中全域定義安全方案。

```typescript
OrbitAstral.configure({
  // ...
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  },
  security: [{ bearerAuth: [] }] // 全域套用
})
```
