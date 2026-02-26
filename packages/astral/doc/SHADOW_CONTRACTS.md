# Shadow Contracts Guide

**Shadow Contracts** are the preferred way to document APIs in the Gravito ecosystem. They ensure your business logic remains "Clean" while providing robust, machine-readable API definitions.

## 1. The Purity Rule

In Gravito, **Controllers and Services must never contain documentation decorators** (e.g., `@ApiOperation`). 

Documentation is metadata about your code, not the code itself. By separating them, you:
- Keep business logic readable.
- Reduce build times by avoiding heavy decorator reflection.
- Allow documentation to evolve independently of implementation.

## 2. Defining a Contract

Create a dedicated `contracts/` directory in your Satellite.

```typescript
// satellites/catalog/src/contracts/ProductContract.ts
import { astral } from '@gravito/astral'
import { ProductDTO, CreateProductSchema } from '../dtos'

export const ProductContract = astral.resource('/api/products', {
  tags: ['Catalog'],
  operations: {
    index: {
      summary: 'Search products',
      description: 'Find products by name or category with pagination.',
      query: {
        q: { type: 'string', required: false },
        page: { type: 'number', default: 1 }
      },
      output: [ProductDTO]
    },
    store: {
      summary: 'Create a product',
      input: CreateProductSchema,
      output: ProductDTO,
      security: ['jwt']
    }
  }
})
```

## 3. Registering Contracts

Satellites should register their contracts with the `AstralManager` during the `BOOT` phase.

```typescript
// satellites/catalog/src/CatalogSatellite.ts
export class CatalogSatellite extends Satellite {
  async boot(core: PlanetCore) {
    const doc = core.container.resolve('astral');
    doc.addContract(ProductContract);
  }
}
```

## 4. Advanced: Reusable Components

Define global security schemes and shared components in your main application configuration.

```typescript
OrbitAstral.configure({
  title: 'My Galaxy API',
  security: {
    jwt: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
  },
  contracts: [ ... ]
})
```

## 5. Automation: Generating Clients

The output of Astral (OpenAPI 3.1) can be used to generate type-safe clients using `@gravito/beam` or other generators.

```bash
# Example: Generate a TypeScript SDK from Astral output
bun orbit docs:generate-client --output ./sdk
```
