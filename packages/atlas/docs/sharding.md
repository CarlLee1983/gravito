# Database Sharding

Atlas provides a powerful horizontal sharding engine that allows you to distribute your data across multiple database instances while maintaining a single model-based interface.

## 🚀 Key Concepts

- **Sharding Manager**: Orchestrates multiple connections and manages shard distribution logic.
- **Shard Key**: The property on your model (e.g., `tenantId`, `userId`) used to determine which database shard a record belongs to.
- **Dynamic Routing**: Active Record automatically selects the correct connection based on the shard key provided during queries or persistence operations.

## 🛠️ Configuration

To use sharding, you first need to define a `sharding` configuration in your `DB` setup.

```typescript
import { DB } from '@gravito/atlas'

DB.configure({
  connections: {
    'shard-0': { driver: 'postgres', host: 'db-shard-0', ... },
    'shard-1': { driver: 'postgres', host: 'db-shard-1', ... },
  },
  sharding: {
    default: {
      shards: ['shard-0', 'shard-1'],
      // Optional: Custom logic for shard selection
      resolver: (key) => `shard-${Number(key) % 2}`
    }
  }
})
```

## 📦 Using `@sharded` Decorator

Apply the `@sharded` decorator to your model to enable automatic routing.

```typescript
import { Model, column, sharded } from '@gravito/atlas'

@sharded({ key: 'tenantId' })
export class User extends Model {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tenantId: string

  @column()
  declare name: string
}
```

## 🔍 Querying Sharded Models

When querying a sharded model, you should provide the shard key to ensure the query is routed to the correct database.

```typescript
// Explicitly targeting a shard
const users = await User.shard('tenant-123')
  .where('status', 'active')
  .get()

// Saving a new record (automatically routed via the internal shard key value)
const user = new User()
user.tenantId = 'tenant-456'
user.name = 'John Doe'
await user.save() // Routed to the shard for 'tenant-456'
```

### Note on Global Queries
If you perform a query without a shard key (e.g., `User.all()`), Atlas will attempt to execute the query across **all shards** and aggregate the results, or return an error depending on the configuration. *Note: Multi-shard aggregation is currently restricted to simple selects.*

## 📈 Performance

Atlas sharding uses a lightweight connection pool and cached routing maps, ensuring that shard resolution overhead is negligible (<100ns).
