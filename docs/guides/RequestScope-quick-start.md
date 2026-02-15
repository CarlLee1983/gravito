# RequestScope 快速開始

## 5 分鐘上手

### 步驟 1：在 ServiceProvider 中註冊

```typescript
// src/Providers/AppServiceProvider.ts
export class AppServiceProvider extends ServiceProvider {
  register(container: Container): void {
    container.scoped('productCache', () => new RequestProductCache())
  }
}
```

### 步驟 2：在 Controller 中使用

```typescript
// src/Http/Controllers/CartController.ts
static async index(ctx: GravitoContext) {
  const cache = ctx.scoped('productCache', () => new RequestProductCache())
  const products = await cache.get([1, 2, 3])
  return ctx.json({ products })
}
```

### 步驟 3：實作 cleanup（可選）

```typescript
export class RequestProductCache {
  async cleanup(): Promise<void> {
    this.cache.clear()
  }
}
```

## API 速查表

```typescript
// 解析服務（自動快取）
const cache = ctx.scoped('key', () => new Cache())

// 存取 RequestScope 管理器
const scope = ctx.requestScope()

// 檢查快取大小
scope.size() // → 3

// 手動清理（通常自動）
await scope.cleanup()
```

## 模式

### 模式 1：批量載入（推薦）

```typescript
async get(ids: number[]): Promise<Product[]> {
  const missing = ids.filter((id) => !this.cache.has(id))
  if (missing.length > 0) {
    const products = await db.where('id', 'in', missing).get()
    products.forEach((p) => this.cache.set(p.id, p))
  }
  return ids.map((id) => this.cache.get(id)!)
}
```

### 模式 2：按需快取

```typescript
async get(id: number): Promise<Product> {
  if (!this.cache.has(id)) {
    const product = await db.find(id)
    this.cache.set(id, product)
  }
  return this.cache.get(id)!
}
```

### 模式 3：資源清理

```typescript
export class DatabaseConnection {
  async cleanup(): Promise<void> {
    await this.connection.close()
  }
}
```

## 實戰範例

```typescript
// 現實場景：商品頁面 + 相關推薦
export class ProductController {
  static async show(ctx: GravitoContext) {
    const cache = ctx.scoped('cache', () => new ProductCache())

    // 1. 載入主產品
    const product = (await cache.get([ctx.param('id')]))[0]

    // 2. 載入相關產品（同一請求，只需 1 次查詢）
    const related = await cache.get(product.related_ids)

    return ctx.json({ product, related })
  }
}
```

## 性能提升

```
購物車顯示（10 項）
❌ 無快取：SELECT * FROM products WHERE id = 1
          SELECT * FROM products WHERE id = 2
          ... × 10 = 10 次查詢

✅ RequestScope：SELECT * FROM products WHERE id IN (1,2,3...)
                = 1 次查詢（90% 提升）
```

## 常見錯誤

```typescript
// ❌ 在事件監聽中訪問 RequestScope
core.hooks.addAction('order:created', async (order) => {
  const cache = core.requestScope() // ❌ 無效
})

// ✅ 在事件創建時傳遞數據
core.hooks.addAction('order:created', async (order) => {
  const cache = container.make('cache') // ✅ 全局服務
})
```

## 下一步

- 閱讀 [完整指南](./RequestScope.md)
- 查看 [進階用法](./RequestScope.md#進階用法)
- 了解 [性能指標](./RequestScope.md#性能指標)
