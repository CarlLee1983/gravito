---
title: ORM Usage Guide
---

# ORM Usage Guide

> Complete Atlas ORM guide covering features and use cases. Atlas delivers a Laravel Eloquent-like experience with Bun-native performance, inspired by Prisma and Drizzle.

## Beta Notes

Atlas targets Gravito 1.0.0-beta and Bun 1.3.4+. The CLI wraps `drizzle-kit` for migrations while Atlas keeps a familiar Active Record API on top.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Defining Models](#defining-models)
3. [CRUD Operations](#crud-operations)
4. [Relationships](#relationships)
5. [Query Builder](#query-builder)
6. [Pagination](#pagination)
7. [Transactions](#transactions)
8. [Migrations and Seeders](#migrations-and-seeders)
9. [Best Practices](#best-practices)

## Basic Setup

### 1. Install Dependencies

```bash
bun add @gravito/atlas
```

### 2. Initialize Database Connection

Configure `DB` during bootstrap (e.g., `bootstrap.ts`).

```typescript
import { DB } from '@gravito/atlas'

DB.configure({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'gravito',
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  },
})
```

### 3. Use in Routes

```typescript
import { DB } from '@gravito/atlas'

core.app.get('/users', async (c) => {
  const users = await DB.table('users').get()
  return c.json({ users })
})
```

## Defining Models

Atlas uses the Active Record pattern. Extend `Model` and set the table name.

```typescript
import { Model } from '@gravito/atlas'

export class User extends Model {
  static table = 'users'
  static primaryKey = 'id'

  declare id: number
  declare name: string
  declare email: string
  declare active: boolean
}
```

### Database Migrations

Atlas provides a fluent `Blueprint` API. See [Migrations & Seeding](../api/atlas/migrations-seeding.md).

```ts
import { Blueprint, Schema } from '@gravito/atlas'

await Schema.create('users', (table: Blueprint) => {
  table.id()
  table.string('name')
  table.string('email').unique()
  table.boolean('active').default(true)
  table.timestamps()
})
```

## CRUD Operations

### 1. Create & Insert

```typescript
const user = new User()
user.name = 'John Doe'
user.email = 'john@example.com'
await user.save()

const user = await User.create({
  name: 'Jane Doe',
  email: 'jane@example.com',
})
```

### 2. Querying

```typescript
const user = await User.find(1)
const user = await User.where('email', 'john@example.com').first()
const users = await User.where('active', true).get()
```

### 3. Updating

```typescript
const user = await User.find(1)
if (user) {
  user.name = 'Updated Name'
  await user.save()
}
```

### 4. Deleting

```typescript
const user = await User.find(1)
await user.delete()
```

## Relationships

```typescript
import { Model } from '@gravito/atlas'

export class User extends Model {
  static table = 'users'

  posts() {
    return this.hasMany(Post, 'userId')
  }
}

export class Post extends Model {
  static table = 'posts'

  user() {
    return this.belongsTo(User, 'userId')
  }
}

const user = await User.find(1)
const posts = await user.posts

const userWithPosts = await User.query().with('posts').find(1)
```

Supported relationship types:
- `hasMany()` - One-to-many
- `belongsTo()` - Many-to-one
- `hasOne()` - One-to-one
- `belongsToMany()` - Many-to-many (pivot required)
- `morphTo()` - Polymorphic many-to-one
- `morphMany()` - Polymorphic one-to-many
- `morphOne()` - Polymorphic one-to-one

### Polymorphic Relations

#### morphTo

```typescript
export class Comment extends Model {
  static table = commentsTable
  static tableName = 'comments'
  declare attributes: {
    id?: number
    commentableType?: string
    commentableId?: number
    content: string
  }
}

export class Post extends Model {
  static table = postsTable
  static tableName = 'posts'
  declare attributes: {
    id?: number
    title: string
  }
}

export class Video extends Model {
  static table = videosTable
  static tableName = 'videos'
  declare attributes: {
    id?: number
    title: string
  }
}

Comment.morphTo('commentable', 'commentable_type', 'commentable_id')

const morphMap = new Map()
morphMap.set('Post', Post)
morphMap.set('Video', Video)
Comment.morphTo('commentable', 'commentable_type', 'commentable_id', morphMap)

const comment = await Comment.find(1)
const commentable = await comment.getRelation('commentable')
```

#### morphMany

```typescript
Post.morphMany(Comment, 'comments', 'commentable_type', 'commentable_id')

const post = await Post.find(1)
const comments = await post.getRelation('comments')
```

#### morphOne

```typescript
Post.morphOne(Image, 'image', 'imageable_type', 'imageable_id')

const post = await Post.find(1)
const image = await post.getRelation('image')
```

## Query Builder

```typescript
const users = await User.query()
  .where('status', 'active')
  .whereIn('role', ['admin', 'user'])
  .whereNotNull('email')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get()

const user = await User.query()
  .where('email', 'john@example.com')
  .first()

const posts = await Post.query()
  .where('published', true)
  .whereBetween('created_at', startDate, endDate)
  .whereLike('title', '%tutorial%')
  .orderByDesc('views')
  .limit(20)
  .get()

const result = await User.query()
  .where('active', true)
  .paginate(1, 20)

const count = await User.query().where('status', 'active').count()
const exists = await User.query().where('email', 'john@example.com').exists()
```

Common methods:
- `where()`, `whereIn()`, `whereNotIn()`, `whereNull()`, `whereNotNull()`
- `whereBetween()`, `whereLike()`
- `orderBy()`, `orderByDesc()`
- `limit()`, `offset()`, `groupBy()`
- `first()`, `get()`, `count()`, `exists()`, `paginate()`

### Soft Deletes

```typescript
export class User extends Model {
  static table = usersTable
  static tableName = 'users'
  static usesSoftDeletes = true
  static deletedAtColumn = 'deleted_at'
  declare attributes: {
    id?: number
    name: string
    deletedAt?: Date | null
  }
}

const user = await User.find(1)
await user.delete()

if (user.trashed()) {
  await user.restore()
}

await user.forceDelete()
const allUsers = await User.withTrashed().get()
const deletedUsers = await User.onlyTrashed().get()
```

### Fillable / Guarded

```typescript
export class User extends Model {
  static table = usersTable
  static tableName = 'users'

  static fillable = ['name', 'email']
  // static guarded = ['id', 'created_at', 'updated_at']

  declare attributes: {
    id?: number
    name: string
    email: string
    isAdmin?: boolean
  }
}

const user = await User.create({
  name: 'John',
  email: 'john@example.com',
  isAdmin: true,
})
```

### Timestamps

```typescript
export class User extends Model {
  static table = usersTable
  static tableName = 'users'
  static timestamps = true
  static createdAtColumn = 'created_at'
  static updatedAtColumn = 'updated_at'

  declare attributes: {
    id?: number
    name: string
    createdAt?: Date
    updatedAt?: Date
  }
}

const user = await User.create({ name: 'John' })
await user.update({ name: 'Jane' })
```

### Scopes

```typescript
export class User extends Model {
  static table = usersTable
  static tableName = 'users'

  static addScope('active', (query) => {
    return { ...query, status: 'active' }
  })

  static addScope('recent', (query) => {
    return { ...query, created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
  })

  static addGlobalScope((query) => {
    return { ...query, deleted_at: null }
  })
}

const activeUsers = await User.query().where('status', 'active').get()
const allUsers = await User.withoutGlobalScopes().get()
```

### Model Events

```typescript
core.hooks.addAction('model:creating', async ({ model, attributes }) => {
  console.log('Creating model:', model.constructor.name)
})

core.hooks.addAction('model:created', async ({ model }) => {
  console.log('Model created:', model.getKey())
})

core.hooks.addAction('model:updating', async ({ model, attributes }) => {
  console.log('Updating model:', model.getKey())
})

core.hooks.addAction('model:updated', async ({ model }) => {
  console.log('Model updated:', model.getKey())
})

core.hooks.addAction('model:saving', async ({ model, wasRecentlyCreated }) => {
  console.log('Saving model:', model.getKey())
})

core.hooks.addAction('model:saved', async ({ model, wasRecentlyCreated }) => {
  console.log('Model saved:', model.getKey())
})

core.hooks.addAction('model:deleting', async ({ model }) => {
  console.log('Deleting model:', model.getKey())
})

core.hooks.addAction('model:deleted', async ({ model, soft }) => {
  console.log('Model deleted:', model.getKey(), soft ? '(soft)' : '(hard)')
})
```

### With Count

```typescript
const users = await User.withCount('posts')
users.forEach((user) => {
  console.log(user.get('posts_count'))
})
```

### Chunk & Cursor

```typescript
await User.chunk(100, async (users) => {
  for (const user of users) {
    await processUser(user)
  }
})

await User.cursor(async (user) => {
  await processUser(user)
})
```

### Casting

```typescript
export class User extends Model {
  static table = usersTable
  static tableName = 'users'
  static casts = {
    age: 'number',
    isActive: 'boolean',
    metadata: 'json',
    tags: 'array',
    createdAt: 'date',
  }
  declare attributes: {
    id?: number
    name: string
    age?: string | number
    isActive?: string | boolean
    metadata?: string | object
    tags?: string | string[]
    createdAt?: string | Date
  }
}

const user = await User.find(1)
console.log(typeof user.get('age'))
console.log(typeof user.get('isActive'))
console.log(user.get('metadata'))
```

Supported casts:
- `'string'`, `'number'`, `'boolean'`, `'date'`, `'json'`, `'array'`
- custom function `(value: unknown) => unknown`

### Accessors & Mutators

```typescript
export class User extends Model {
  static table = usersTable
  static tableName = 'users'
  declare attributes: {
    id?: number
    firstName?: string
    lastName?: string
    email?: string
  }

  getFullNameAttribute(value: unknown): string {
    const attrs = this.attributes as any
    return `${attrs.firstName || ''} ${attrs.lastName || ''}`.trim()
  }

  setEmailAttribute(value: unknown): string {
    return String(value).toLowerCase().trim()
  }
}

const user = new User()
user.set('firstName', 'John')
user.set('lastName', 'Doe')
user.set('email', '  JOHN@EXAMPLE.COM  ')

console.log(user.get('fullName'))
console.log(user.attributes.email)
```

Naming:
- Accessor: `get{AttributeName}Attribute`
- Mutator: `set{AttributeName}Attribute`

### Model vs DBService

```typescript
const user = await User.find(1)
```

```typescript
const db = c.get('db')
const user = await db.findById(usersTable, 1)
```

Both use the same Drizzle query engine. Choose the style that fits your codebase.

## CRUD With DBService

### Create

```typescript
const user = await db.create(users, {
  name: 'John',
  email: 'john@example.com',
})
```

### Insert

```typescript
const user = await db.insert(users, {
  name: 'Jane Doe',
  email: 'jane@example.com',
})

const users = await db.insert(users, [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
])
```

### Read

```typescript
const user = await db.findById(users, 1)
```

### Update

```typescript
const updatedUsers = await db.update(
  users,
  { id: 1 },
  { name: 'John Updated' }
)
```

### Delete

```typescript
await db.delete(users, { id: 1 })
```

## Relationship Queries

```typescript
const user = await db.findByIdWith('users', 1, {
  posts: true,
})
```

```typescript
const user = await db.findOneWith(
  'users',
  { email: 'john@example.com' },
  { posts: true }
)
```

```typescript
const users = await db.findAllWith('users', { posts: true }, {
  where: { status: 'active' },
  limit: 10,
})
```

### Use Drizzle Query API

```typescript
import { eq } from 'drizzle-orm'

const user = await db.raw.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: {
      comments: {
        user: true,
      },
    },
  },
})
```

## Transactions

```typescript
const result = await db.transaction(async (tx) => {
  const user = await tx.insert(users).values({
    name: 'John',
    email: 'john@example.com',
  }).returning()

  const profile = await tx.insert(profiles).values({
    userId: user[0].id,
    bio: 'Bio text',
  }).returning()

  return { user: user[0], profile: profile[0] }
})
```

### Error Handling

```typescript
try {
  const result = await db.transaction(async (tx) => {
    await tx.insert(users).values({ name: 'John' })
    await tx.insert(posts).values({ userId: 1, title: 'Post' })
  })
} catch (error) {
  console.error('Transaction failed:', error)
}
```

### Isolation & Concurrency Notes

- Keep transactions short.
- Use consistent write order to avoid deadlocks.
- Consider optimistic locking for hot rows.
- Use row locks (`FOR UPDATE`) when required by the driver.

### Integrity Constraints

```typescript
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core'

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  orderNo: text('order_no').notNull().unique(),
})
```

## Batch Operations

### Bulk Insert

```typescript
const newUsers = await db.bulkInsert(users, [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  { name: 'User 3', email: 'user3@example.com' },
])
```

### Bulk Update

```typescript
const updatedUsers = await db.bulkUpdate(users, [
  { where: { id: 1 }, data: { name: 'User 1 Updated' } },
  { where: { id: 2 }, data: { name: 'User 2 Updated' } },
])
```

### Bulk Delete

```typescript
await db.bulkDelete(users, [
  { id: 1 },
  { id: 2 },
  { id: 3 },
])
```

## Migrations and Seeders

```bash
gravito migrate
gravito migrate --fresh
gravito migrate:status
```

```bash
gravito db:seed
gravito db:seed --class UsersSeeder
```

## Deployment

```typescript
const result = await db.deploy({
  runMigrations: true,
  runSeeds: false,
  skipHealthCheck: false,
  validateBeforeDeploy: true,
})
```

```typescript
core.hooks.addAction('app:ready', async () => {
  const db = core.app.get('db')

  if (process.env.NODE_ENV === 'production') {
    const result = await db.deploy({
      runMigrations: true,
      runSeeds: false,
      validateBeforeDeploy: true,
    })

    if (!result.success) {
      throw new Error(`Database deployment failed: ${result.error}`)
    }
  }
})
```

## Best Practices

1. **Type safety** for predictable DX.
2. **Error handling** around DB operations.
3. **Transactions** for multi-table consistency.
4. **Avoid N+1** with eager loading.
5. **Pagination** for large datasets.
6. **Health checks** to detect issues early.
7. **Hooks** for monitoring and performance insight.

### Health Checks

```typescript
setInterval(async () => {
  const health = await db.healthCheck()
  if (health.status !== 'healthy') {
    console.error('Database health check failed:', health.error)
  }
}, 60000)
```

### DB Hooks

```typescript
core.hooks.addAction('db:query', ({ query, duration, timestamp }) => {
  if (duration > 1000) {
    console.warn(`Slow query detected: ${query} (${duration}ms)`)
  }
})

core.hooks.addAction('db:transaction:start', ({ transactionId }) => {
  console.log(`Transaction started: ${transactionId}`)
})

core.hooks.addAction('db:transaction:complete', ({ transactionId, duration }) => {
  console.log(`Transaction completed: ${transactionId} (${duration}ms)`)
})
```

## Full Example

```typescript
import { PlanetCore } from '@gravito/core'
import orbitDB from '@gravito/atlas'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { eq } from 'drizzle-orm'

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
})

const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
})

const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
}))

const core = new PlanetCore()
const client = postgres(process.env.DATABASE_URL)
const db = drizzle(client, {
  schema: { users, posts, usersRelations, postsRelations },
})

orbitDB(core, {
  db,
  databaseType: 'postgresql',
  exposeAs: 'db',
})

core.app.get('/users/:id', async (c) => {
  const db = c.get('db')
  const userId = parseInt(c.req.param('id'))

  const user = await db.findByIdWith('users', userId, {
    posts: true,
  })

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ user })
})

core.app.post('/users', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()

  const user = await db.create(users, {
    name: body.name,
    email: body.email,
  })

  return c.json({ user }, 201)
})

core.liftoff()
```

## Serialization

Atlas models can control JSON output (hide sensitive fields, append custom fields). See [Serialization](./api/atlas/serialization.md).

## Summary

Atlas provides:

- Full CRUD
- Rich relationships
- Transaction support
- Batch operations
- Migrations and seeders
- Deployment helpers
- Postgres optimizations

Use `db.raw` when you need the full Drizzle API.
