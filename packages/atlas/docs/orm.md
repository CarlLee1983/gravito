# Active Record ORM

Atlas ORM is a powerful, decorator-based system for mapping database tables to TypeScript classes. It focuses on **Developer Experience (DX)** and **Performance**.

## 📝 Defining Models

A model is a class that extends `Model`. Use decorators to define columns and behavior.

```typescript
import { Model, column, SoftDeletes } from '@gravito/atlas'

@SoftDeletes()
export class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: Date
}
```

### Decorators
- `@column(options)`: Marks a property as a DB column.
- `@column.dateTime(options)`: Helper for date/time columns.
- `@SoftDeletes(options)`: Enables soft deletes (adds `deleted_at`).
- `@sharded(options)`: Enables horizontal sharding.
- `@version()`: Enables optimistic locking via a version column.

## 🔍 Fetching Records

### Basic Queries
```typescript
const user = await User.find(1)
const allActive = await User.where('status', 'active').get()
const firstUser = await User.first()
```

### Advanced Fetching
- **Pagination**: `const page = await User.paginate(1, 15)`
- **Chunking**: `await User.chunk(100, (users) => { ... })`
- **Streaming**: `for await (const users of User.cursor(10)) { ... }`

## 💾 Persistence

Atlas tracks changes to your models. When you call `.save()`, only the modified fields are sent to the database.

```typescript
const user = await User.find(1)
user.email = 'updated@example.com'
await user.save() // Only updates 'email'
```

### Creation
```typescript
const user = new User()
user.fill({ email: 'test@example.com' })
await user.save()
```

## 🔗 Relationships

Define relationships using decorators. Atlas handles the joining and eager loading logic.

```typescript
import { HasMany, BelongsTo } from '@gravito/atlas'

class User extends Model {
  @HasMany(() => Post)
  declare posts: Post[]
}

class Post extends Model {
  @BelongsTo(() => User)
  declare user: User
}
```

### Eager Loading
Prevent N+1 issues by pre-fetching relations.
```typescript
const users = await User.with('posts').get()
```

### Relation Queries
```typescript
const user = await User.find(1)
const publishedPosts = await user.related('posts').where('status', 'published').get()
```
