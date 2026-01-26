# @gravito/astral 🌌

**為 Gravito 打造的「影子契約」OpenAPI 生成器。**

Astral 是一個 Schema 驅動的文檔引擎，能生成 OpenAPI 3.1 規範並提供內建的 Swagger UI，且完全不會污染您的業務邏輯。

## 🚀 核心理念：影子契約 (Shadow Contracts)

不同於傳統文檔工具需要在 Controller 中使用 Decorator（如 `@ApiOperation`），Astral 採用 **影子契約**。您在獨立的文件中定義 API 元數據，保持 Controller 的純淨，專注於業務邏輯。

## 📦 安裝

```bash
bun add @gravito/astral
# 或
npm install @gravito/astral
```

## 🛠️ 快速開始

### 1. 定義 DTO 與 Request
使用 Zod 定義您的數據結構。

```typescript
import { z } from 'zod'
import { FormRequest } from '@gravito/impulse'

export const UserDTO = z.object({
  id: z.number(),
  name: z.string().describe('使用者全名'),
  email: z.string().email()
})

export class CreateUserRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(2),
    email: z.string().email()
  })
}
```

### 2. 建立影子契約
在獨立文件中將路由映射到 DTO。

```typescript
import { astral } from '@gravito/astral'
import { CreateUserRequest, UserDTO } from './dtos'

export const UserContract = astral.resource('/api/users', {
  tags: ['使用者管理'],
  operations: {
    index: {
      summary: '列出所有使用者',
      output: [UserDTO] // 自動推斷為陣列響應
    },
    store: {
      summary: '建立使用者',
      input: CreateUserRequest, // 自動推斷為 JSON 請求體
      output: UserDTO
    }
  }
})
```

### 3. 註冊 Orbit
將 `OrbitAstral` 加入您的 `PlanetCore` 配置。

```typescript
import { PlanetCore, defineConfig } from '@gravito/core'
import { OrbitAstral } from '@gravito/astral'
import { UserContract } from './contracts'

const config = defineConfig({
  orbits: [
    OrbitAstral.configure({
      title: '我的 API 專案',
      contracts: [UserContract]
    })
  ]
})

const core = await PlanetCore.boot(config)
await core.liftoff()
```

瀏覽 `http://localhost:3000/docs` 即可查看您的 Swagger UI！

## 📚 文檔

- [API 參考](./docs/API.md) - 配置、介面與輔助工具的詳細指南。
- [進階用法](./docs/ADVANCED.md) - 學習安全機制、可重用組件與自定義錯誤處理。

## ✨ 關鍵特性

- **零侵入性**：Controller 中無需 Decorator 或 JSDoc。
- **類型推斷**：自動將 Zod Schema 與 Impulse FormRequest 轉換為 OpenAPI 組件。
- **即時更新**：文檔始終與您的 DTO 即時同步。
- **內建 UI**：整合由 CDN 驅動的 Swagger UI。

## 📄 授權

MIT
