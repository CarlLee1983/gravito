# Building RESTful APIs

Gravito provides a unified workflow for building modern, high-performance RESTful APIs. By combining **Atlas** (ORM), **Impulse** (Validation), and **Astral** (Documentation), you can create robust APIs with minimal boilerplate and maximum type safety.

## The Gravito Workflow

1.  **Model**: Define your data structure.
2.  **Request**: Define validation rules using Zod.
3.  **Contract**: Define API metadata for documentation.
4.  **Controller**: Implement logic with fully typed inputs.

## Example: Product Management API

Let's build a simple product management API.

### 1. Define the Model

Using **Atlas ORM**, we define our database model. By using the `@column` decorator, we precisely mark which properties map to database fields.

```typescript
// src/models/Product.ts
import { Model, column } from '@gravito/atlas'

export class Product extends Model {
  static table = 'products'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare price: number

  @column()
  declare stock: number
}
```

### 2. Define Validation

Using **Impulse**, we create a `FormRequest`. This handles validation, authorization, and type inference.

```typescript
// src/requests/CreateProductRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class CreateProductRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(3).describe('Product name'),
    price: z.number().positive().describe('Price in USD'),
    stock: z.number().int().min(0).default(0)
  })
}
```

### 3. Define the Contract (Shadow Contract)

Using **Astral**, we define the API specification in a separate file. This keeps your controller clean while generating fully compliant OpenAPI 3.1 documentation.

```typescript
// src/contracts/ProductContract.ts
import { astral } from '@gravito/astral'
import { z } from 'zod'
import { CreateProductRequest } from '../requests/CreateProductRequest'

// Define Response DTO
const ProductDTO = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  stock: z.number()
})

export const ProductContract = astral.resource('/api/products', {
  tags: ['Products'],
  operations: {
    index: {
      summary: 'List products',
      output: [ProductDTO]
    },
    store: {
      summary: 'Create product',
      input: CreateProductRequest, // Reuse the validator schema!
      output: ProductDTO,
      status: 201
    }
  }
})
```

### 4. Implement the Controller

Now, we implement the business logic. Notice how we retrieve the validated data from `c.get('validated')`.

```typescript
// src/controllers/ProductController.ts
import { Controller } from '@gravito/monolith'
import type { GravitoContext } from '@gravito/core'
import { Product } from '../models/Product'
import { CreateProductRequest } from '../requests/CreateProductRequest'

export class ProductController extends Controller {
  async index() {
    return Product.all()
  }

  async store(c: GravitoContext) {
    // Retrieve data validated by Impulse
    const input = c.get('validated') as { name: string, price: number, stock: number }
    
    const product = await Product.create(input)
    
    return c.json(product, 201)
  }
}
```

### 5. Register Everything

Finally, register the `OrbitAstral` and your routes in `bootstrap.ts`.

```typescript
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitAstral } from '@gravito/astral'
import { ProductContract } from './contracts/ProductContract'
import { ProductController } from './controllers/ProductController'

const config = defineConfig({
  orbits: [
    OrbitAstral.configure({
      title: 'Store API',
      contracts: [ProductContract]
    })
  ]
})

const app = await PlanetCore.boot(config)

// Register routes
app.router.resource('/api/products', ProductController)

export default app.liftoff()
```

## Why this is better?

*   **Zero Pollution**: Your controller code is 100% business logic. No `@ApiBody` or `@IsString` decorators cluttering your class.
*   **Single Source of Truth**: Your validation schema (`CreateProductRequest`) drives both the runtime validation AND the API documentation.
*   **Type Safety**: TypeScript types are inferred from Zod schemas, ensuring your code is always in sync with your validation rules.
