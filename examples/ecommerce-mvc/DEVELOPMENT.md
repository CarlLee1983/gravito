# Development Guide

## Getting Started

### Prerequisites
- Node.js/Bun 1.0+
- Git
- PostgreSQL (optional, SQLite is default)

### Initial Setup

```bash
# Clone and enter directory
cd examples/ecommerce-mvc

# Install dependencies
bun install

# Run tests to verify setup
bun test

# Start development server
bun run dev
```

Server runs on `http://localhost:3070`

## Development Workflow

### 1. Creating a New Feature

Follow the **Clean Architecture** pattern:

```
Feature: Add Product Reviews

1. Design
   └─ Data model: Review (id, product_id, user_id, rating, text)
   └─ Relationships: hasOne User, hasOne Product
   └─ API endpoints: POST /products/{id}/reviews, GET /products/{id}/reviews

2. Implementation Order
   a. Create Model (Models/Review.ts)
   b. Create Repository (Repositories/ReviewRepository.ts)
   c. Create Service (Services/ReviewService.ts)
   d. Add Event (Events/ReviewSubmitted.ts)
   e. Create Controller (Http/Controllers/ReviewController.ts)
   f. Write Tests (tests/Unit/Services/ReviewService.test.ts)
   g. Write Integration Tests (tests/Integration/ReviewFlow.integration.test.ts)

3. Testing
   └─ Unit tests: Service logic (mock repository)
   └─ Integration tests: Complete workflows
   └─ Target: 80%+ coverage

4. Documentation
   └─ Update CHANGELOG.md
   └─ Update API.md if adding endpoints
```

### 2. Code Style

**File Organization**:
```
src/
├── Models/             # Data models (@column decorators)
├── Repositories/       # Data access layer
├── Services/          # Business logic
├── Presenters/        # DTO transformation
├── Events/            # Domain events
├── Listeners/         # Event handlers
├── Http/
│   ├── Controllers/   # Request handling
│   └── Middleware/    # HTTP middleware
└── bootstrap.ts       # App initialization
```

**Naming Conventions**:
- Classes: PascalCase (CartService, ProductRepository)
- Methods: camelCase (getCartAsDTO, batchLoadProducts)
- Files: Same as class name (CartService.ts)
- Constants: UPPER_SNAKE_CASE (ORDER_CREATION_FEE = 600)
- Interfaces: PascalCase with prefix I or suffix DTO (CartResponseDTO)

**Code Style Guidelines**:
```typescript
// ✅ Good: Clear, concise, type-safe
async getCart(cartId: number): Promise<Cart | null> {
  const cart = await this.repository.find(cartId)
  if (!cart) return null
  cart.items = await this.loadItems(cartId)
  return cart
}

// ❌ Bad: Verbose, unclear intent
async getCart(id: any): Promise<any> {
  const c = await this.repository.find(id)
  if (c === null || c === undefined) {
    return null
  }
  const items = await this.loadItems(id)
  c.items = items
  return c
}
```

**Key Principles**:
- Keep methods small (< 20 lines)
- Explicit is better than implicit
- Fail fast with clear error messages
- Use type annotations (no `any`)
- Immutability: Create new objects instead of mutating

### 3. Testing Requirements

**Test Structure**:
```
tests/
├── Unit/
│   ├── Services/              # 45 tests
│   │   ├── CartService.test.ts
│   │   └── OrderService.test.ts
│   ├── Repositories/
│   ├── Presenters/
│   └── Events/
└── Integration/
    └── (29 tests)
        ├── CartFlow.integration.test.ts
        ├── OrderFlow.integration.test.ts
        └── EventDispatch.integration.test.ts
```

**Test Template**:
```typescript
import { describe, it, expect, beforeEach } from 'bun:test'

describe('CartService', () => {
  let service: CartService
  let repository: CartRepository

  beforeEach(() => {
    repository = new CartRepository()
    service = new CartService(repository)
  })

  describe('getCartAsDTO', () => {
    it('should return cart DTO with items', async () => {
      // Arrange
      const mockCart = createMockCart()
      repository.getWithItems = async () => mockCart

      // Act
      const dto = await service.getCartAsDTO(1)

      // Assert
      expect(dto.id).toBe(1)
      expect(dto.items).toHaveLength(2)
    })

    it('should return null for non-existent cart', async () => {
      repository.getWithItems = async () => null

      const dto = await service.getCartAsDTO(999)

      expect(dto).toBeNull()
    })
  })
})
```

**Running Tests**:
```bash
# All tests
bun test

# Watch mode
bun test --watch

# Specific file
bun test tests/Unit/Services/CartService.test.ts

# With output
bun test --reporter=verbose
```

**Coverage Target**: 80%+ for new code

### 4. Commit Message Format

Follow conventional commits:

```
<type>: [<scope>] <subject>

<optional body>

<optional footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test changes
- `docs`: Documentation
- `chore`: Build, CI, dependencies

**Examples**:
```
feat: [cart] Add product batch loading for performance
fix: [order] Correct stock deduction logic
perf: [cache] Implement request-level product caching
test: [integration] Add CartFlow tests
docs: Update PERFORMANCE.md with Phase 4 details
```

### 5. Code Review Checklist

Before pushing:

- [ ] Tests pass: `bun test`
- [ ] Types check: `bun run typecheck`
- [ ] Code formatted: `bun run format`
- [ ] No console.log in production code
- [ ] Error handling present
- [ ] Type annotations on all functions
- [ ] No `any` types (except when necessary)
- [ ] Commit message follows format
- [ ] CHANGELOG.md updated

## Performance Optimization Checklist

When adding features, ensure:

- [ ] No N+1 queries (batch load related data)
- [ ] Repository has batch methods if needed
- [ ] Service uses batch-loading patterns (Phase 3)
- [ ] Request cache integrated if applicable (Phase 4)
- [ ] Integration tests verify query efficiency
- [ ] Comments explain optimization rationale

## Database Migrations

### Creating a Migration

```bash
bun run migrate:make create_reviews_table
```

This creates: `database/migrations/XXX_create_reviews_table.ts`

```typescript
import type { Knex } from 'knex'

export async function up(knex: Knex) {
  return knex.schema.createTable('reviews', (table) => {
    table.increments('id').primary()
    table.integer('product_id').unsigned().notNullable()
    table.integer('user_id').unsigned().notNullable()
    table.integer('rating').unsigned().notNullable()
    table.text('text').notNullable()
    table.timestamps(true, true)

    table.foreign('product_id').references('products.id')
    table.foreign('user_id').references('users.id')
    table.index('product_id')
  })
}

export async function down(knex: Knex) {
  return knex.schema.dropTable('reviews')
}
```

### Running Migrations

```bash
bun run migrate       # Run all pending
bun run migrate:latest  # Same as above
bun run migrate:rollback # Rollback last batch
```

## Database Seeding

### Creating a Seeder

```bash
bun run seed:make product_seeder
```

```typescript
import { Seeder } from '@gravito/atlas'
import { Product } from '../src/models'

export class ProductSeeder extends Seeder {
  async run() {
    await Product.create({
      name: 'iPhone 15',
      slug: 'iphone-15',
      price: 35000,
      stock: 100,
    })
  }
}
```

### Running Seeders

```bash
bun run seed        # Run all seeders
bun run seed:specific ProductSeeder
```

## Debugging

### Logging

```typescript
// Use console for development
console.log('Debug info:', value)

// For production, use logger
import { Logger } from '@gravito/core'
const logger = new Logger()
logger.info('Informational message')
logger.error('Error occurred', error)
```

### Testing Edge Cases

```typescript
// Test error conditions
it('should throw when stock insufficient', async () => {
  repository.findProduct = async () => ({ stock: 1 })

  expect(() => service.addItem(1, 1, 5)).rejects.toThrow('Insufficient stock')
})

// Test boundary conditions
it('should handle cart with 0 items', async () => {
  const cart = { items: [] }
  const dto = CartPresenter.present(cart)

  expect(dto.itemCount).toBe(0)
  expect(dto.subtotal).toBe(0)
})
```

## Performance Profiling

### Query Logging

Atlas automatically logs N+1 warnings:
```
[Atlas] ⚠️ Potential N+1 Query Detected on table "products"
Executed 5 similar queries within 1000ms.
```

Address these by:
1. Using batch loading (Phase 3)
2. Implementing request cache (Phase 4)
3. Using ORM relationships (Phase 2)

### Timing

```typescript
// Measure execution time
const start = performance.now()
await service.getCartAsDTO(cartId)
const duration = performance.now() - start
console.log(`Query took ${duration.toFixed(2)}ms`)
```

## Documentation

### Code Comments

Add comments for **why**, not **what**:

```typescript
// Good: Explains business logic
// Deduplicate product IDs to avoid querying same product twice
const uniqueIds = [...new Set(productIds)]

// Bad: States obvious
// Create a set from productIds
const uniqueIds = [...new Set(productIds)]
```

### JSDoc Comments

Document public APIs:

```typescript
/**
 * Get cart with all items and product data
 * @param cartId - The cart ID to load
 * @returns Cart with items populated, or null if not found
 * @throws Error if product data cannot be loaded
 */
async getCartAsDTO(cartId: number): Promise<CartResponseDTO | null> {
  // ...
}
```

### Updating Documentation

When you:
- Add a new endpoint → Update API.md
- Change architecture → Update ARCHITECTURE.md
- Add feature → Update CHANGELOG.md
- Optimize performance → Update PERFORMANCE.md

## Troubleshooting

### Tests Fail

```bash
# Clear cache
rm -rf .next/cache

# Reinstall dependencies
bun install

# Run specific failing test
bun test tests/Unit/Services/CartService.test.ts --verbose
```

### Type Errors

```bash
# Check all types
bun run typecheck

# See specific error
bun run typecheck --pretty
```

### Database Issues

```bash
# Reset SQLite (dev only)
rm database.sqlite

# Reset PostgreSQL
docker-compose down -v
docker-compose up -d
```

## Performance Optimization Workflow

When optimizing a slow endpoint:

1. **Identify** the bottleneck
   ```bash
   bun test --verbose  # Look for N+1 warnings
   ```

2. **Measure** baseline
   ```typescript
   const start = performance.now()
   await operation()
   console.log(`Took ${performance.now() - start}ms`)
   ```

3. **Apply Phase 1-4 optimizations**
   - Phase 1: Remove redundant fetches
   - Phase 2: Use ORM relationships
   - Phase 3: Batch load related data
   - Phase 4: Add request caching

4. **Test** improvements
   ```bash
   bun test  # Verify no regressions
   ```

5. **Document** changes
   - Add comment explaining optimization
   - Update PERFORMANCE.md if major change
   - Note in commit message

## Deployment Preparation

Before deploying:

```bash
# Run full test suite
bun test

# Check types
bun run typecheck

# Check code quality
bun run lint

# Build assets
bun run build

# Run security check
npm audit  # or bun audit when available
```

## Resources

- [Gravito Framework Docs](https://gravito.dev)
- [Atlas ORM Guide](./docs/orm.md) (within Gravito)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)

---

**Version**: 1.2.0
**Last Updated**: 2026-02-12
