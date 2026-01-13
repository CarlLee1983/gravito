# 構建 RESTful APIs

Gravito 為構建現代化、高效能的 RESTful API 提供了一套統一的工作流程。透過結合 **Atlas** (ORM)、**Impulse** (驗證) 與 **Astral** (文檔)，您可以以最少的樣板代碼和最高的型別安全性建立強大的 API。

## Gravito 開發工作流

1.  **模型 (Model)**：定義數據結構。
2.  **請求 (Request)**：使用 Zod 定義驗證規則。
3.  **合約 (Contract)**：定義 API 元數據以供文檔生成。
4.  **控制器 (Controller)**：實作業務邏輯，並使用完整的強型別輸入。

## 範例：商品管理 API

讓我們建立一個簡單的商品管理 API。

### 1. 定義模型 (Model)

使用 **Atlas ORM** 定義數據庫模型。

```typescript
// src/models/Product.ts
import { Model } from '@gravito/atlas'

export class Product extends Model {
  static table = 'products'

  declare id: number
  declare name: string
  declare price: number
  declare stock: number
}
```

### 2. 定義驗證規則 (Validation)

使用 **Impulse** 建立 `FormRequest`。這會處理驗證、授權與型別推斷。

```typescript
// src/requests/CreateProductRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class CreateProductRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(3).describe('商品名稱'),
    price: z.number().positive().describe('價格 (USD)'),
    stock: z.number().int().min(0).default(0)
  })
}
```

### 3. 定義合約 (影子合約 Shadow Contract)

使用 **Astral** 在獨立文件中定義 API 規格。這能保持您的控制器乾淨，同時生成完全符合 OpenAPI 3.1 標準的說明文件。

```typescript
// src/contracts/ProductContract.ts
import { astral } from '@gravito/astral'
import { z } from 'zod'
import { CreateProductRequest } from '../requests/CreateProductRequest'

// 定義回應 DTO
const ProductDTO = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  stock: z.number()
})

export const ProductContract = astral.resource('/api/products', {
  tags: ['商品模組'],
  operations: {
    index: {
      summary: '列出所有商品',
      output: [ProductDTO]
    },
    store: {
      summary: '建立新商品',
      input: CreateProductRequest, // 複用驗證器的 Schema！
      output: ProductDTO,
      status: 201
    }
  }
})
```

### 4. 實作控制器 (Controller)

現在，我們實作業務邏輯。請注意 `req.input` 如何根據您的 Zod Schema 自動獲得型別。

```typescript
// src/controllers/ProductController.ts
import { Controller } from '@gravito/core'
import { Product } from '../models/Product'
import { CreateProductRequest } from '../requests/CreateProductRequest'

export class ProductController extends Controller {
  async index() {
    return Product.all()
  }

  async store(req: CreateProductRequest) {
    // req.input 已經是強型別：{ name: string, price: number, stock: number }
    const product = await Product.create(req.input)
    
    return this.response.json(product, 201)
  }
}
```

### 5. 註冊所有組件

最後，在 `bootstrap.ts` 中註冊 `OrbitAstral` 與您的路由。

```typescript
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitAstral } from '@gravito/astral'
import { ProductContract } from './contracts/ProductContract'
import { ProductController } from './controllers/ProductController'

const config = defineConfig({
  orbits: [
    OrbitAstral.configure({
      title: '商店 API',
      contracts: [ProductContract]
    })
  ]
})

const app = await PlanetCore.boot(config)

// 註冊路由
app.router.resource('/api/products', ProductController)

export default app.liftoff()
```

## 為什麼這樣更好？

*   **零污染 (Zero Pollution)**：您的控制器代碼 100% 專注於業務邏輯。沒有 `@ApiBody` 或 `@IsString` 等裝飾器干擾。
*   **單一事實來源 (Single Source of Truth)**：您的驗證規則 (`CreateProductRequest`) 同時驅動了運行時驗證與 API 文檔。
*   **型別安全 (Type Safety)**：TypeScript 型別直接從 Zod Schema 推斷，確保代碼與驗證規則永遠同步。
