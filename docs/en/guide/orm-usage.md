---
title: ORM Usage Guide
---

# ORM Usage Guide

> Complete guide for using Atlas ORM, covering all features and use cases.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Defining Schema and Relations](#defining-schema-and-relations)
3. [Using Model Classes (Elegant Way)](#using-model-classes-elegant-way)
4. [CRUD Operations](#crud-operations)
5. [Relation Queries](#relation-queries)
6. [Transactions](#transactions)
7. [Bulk Operations](#bulk-operations)
8. [Migrations and Seeders](#migrations-and-seeders)
9. [Deployment](#deployment)
10. [Best Practices](#best-practices)

## Basic Setup

### 1. Install Dependencies

```bash
bun add @gravito/atlas drizzle-orm postgres
```

### 2. Initialize Database Connection

```typescript
import { PlanetCore } from 'gravito-core';
import orbitDB from '@gravito/atlas';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const core = new PlanetCore();
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

// Register Atlas 模組
orbitDB(core, {
  db,
  databaseType: 'postgresql', // Explicitly specify PostgreSQL for optimal performance
  exposeAs: 'db',
  enableQueryLogging: true,   // Enable query logging in development
  queryLogLevel: 'debug'
});
```

### 3. Use in Routes

```typescript
core.app.get('/users', async (c) => {
  const db = c.get('db'); // DBService instance
  const users = await db.findAll(users);
  return c.json({ users });
});
```

## Defining Schema and Relations

### Define Table Structure

```typescript
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Posts table
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Comments table
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Define Relations

```typescript
import { relations } from 'drizzle-orm';

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),        // A user has many posts
  comments: many(comments),  // A user has many comments
}));

// Post relations
export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {        // A post belongs to one user
    fields: [posts.userId],
    references: [users.id],
  }),
  comments: many(comments), // A post has many comments
}));

// Comment relations
export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));
```

### Create Drizzle Instance (with Relations)

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL);

// Include schema and relations
const db = drizzle(client, {
  schema: {
    users,
    posts,
    comments,
    usersRelations,
    postsRelations,
    commentsRelations,
  },
});

// Then register to Atlas
orbitDB(core, { db, databaseType: 'postgresql' });
```

## Using Model Classes (Elegant Way)

> **Inspired by Laravel Eloquent**: Provides elegant Model API while maintaining Drizzle query builder performance.

### Defining Models

```typescript
import { Model } from '@gravito/atlas';
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

// Define table (still using Drizzle for performance)
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define User Model (similar to Laravel Eloquent)
export class User extends Model {
  // Set table information
  static table = usersTable;
  static tableName = 'users';
  static primaryKey = 'id'; // Optional, defaults to 'id'
  
  // Type definitions
  declare attributes: {
    id?: number;
    name: string;
    email: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
}
```

### Auto-Registering Models

When `Atlas` initializes, it automatically initializes all registered Models:

```typescript
import { ModelRegistry } from '@gravito/atlas';

// Register Models (at application startup)
ModelRegistry.register(User, usersTable, 'users');
ModelRegistry.register(Post, postsTable, 'posts');

// Atlas will automatically initialize all Models on db:connected hook
orbitDB(core, { db, databaseType: 'postgresql' });
```

### Using Models (Laravel-like)

```typescript
// Find by ID
const user = await User.find(1);

// Find by condition
const user = await User.where('email', 'john@example.com');

// Find with multiple conditions
const user = await User.whereMany({ 
  email: 'john@example.com',
  name: 'John'
});

// Get all records
const users = await User.all();

// Find with conditions
const users = await User.findAll({ name: 'John' });

// Paginate
const result = await User.paginate({ page: 1, limit: 10 });
// result.data: User[]
// result.pagination: { page, limit, total, totalPages, hasNext, hasPrev }

// Count
const count = await User.count();
const count = await User.count({ name: 'John' });

// Check existence
const exists = await User.exists({ email: 'john@example.com' });

// Create
const user = await User.create({
  name: 'John',
  email: 'john@example.com'
});

// Using instance methods
const user = new User();
user.set('name', 'John');
user.set('email', 'john@example.com');
await user.save(); // Automatically determines create or update

// Update
const user = await User.find(1);
user.set('name', 'Updated Name');
await user.save();

// Or use update method
await user.update({ name: 'Updated Name' });

// Delete
await user.delete();

// Convert to JSON
const json = user.toJSON();
```

### Defining Relations

Similar to Laravel Eloquent, you can define relations in Models:

```typescript
import { Model } from '@gravito/atlas';

export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  declare attributes: {
    id?: number;
    name: string;
    email: string;
  };
}

export class Post extends Model {
  static table = postsTable;
  static tableName = 'posts';
  declare attributes: {
    id?: number;
    userId?: number;
    title: string;
    content?: string;
  };
}

// Define relations
User.hasMany(Post, 'userId', 'id');        // A user has many posts
Post.belongsTo(User, 'userId', 'id');      // A post belongs to a user

// Use relations (lazy loading)
const user = await User.find(1);
const posts = await user.getRelation('posts');

// Or use eager loading (recommended, avoids N+1 problem)
await user.load('posts');
const posts = await user.getRelation('posts');
```

Supported relation types:
- `hasMany()` - One-to-many
- `belongsTo()` - Many-to-one
- `hasOne()` - One-to-one
- `belongsToMany()` - Many-to-many (requires pivot table)
- `morphTo()` - Polymorphic many-to-one (e.g., Comment belongs to Post or Video)
- `morphMany()` - One-to-many polymorphic (e.g., Post has many Comments)
- `morphOne()` - One-to-one polymorphic (e.g., Post has one Image)

### Polymorphic Relations

Polymorphic relations allow a model to belong to more than one other model. For example, a Comment can belong to a Post or a Video.

#### morphTo - Polymorphic Many-to-One

```typescript
export class Comment extends Model {
  static table = commentsTable;
  static tableName = 'comments';
  declare attributes: {
    id?: number;
    commentableType?: string;  // 'Post' or 'Video'
    commentableId?: number;     // Post or Video ID
    content: string;
  };
}

export class Post extends Model {
  static table = postsTable;
  static tableName = 'posts';
  declare attributes: {
    id?: number;
    title: string;
  };
}

export class Video extends Model {
  static table = videosTable;
  static tableName = 'videos';
  declare attributes: {
    id?: number;
    title: string;
  };
}

// Define polymorphic relation
Comment.morphTo('commentable', 'commentable_type', 'commentable_id');

// Use morphMap to map type names to model classes (optional)
const morphMap = new Map();
morphMap.set('Post', Post);
morphMap.set('Video', Video);
Comment.morphTo('commentable', 'commentable_type', 'commentable_id', morphMap);

// Usage
const comment = await Comment.find(1);
const commentable = await comment.getRelation('commentable'); // Returns Post or Video based on commentable_type
```

#### morphMany - One-to-Many Polymorphic

```typescript
// Post has many Comments
Post.morphMany(Comment, 'comments', 'commentable_type', 'commentable_id');

// Usage
const post = await Post.find(1);
const comments = await post.getRelation('comments'); // ModelCollection<Comment>
```

#### morphOne - One-to-One Polymorphic

```typescript
// Post has one Image
Post.morphOne(Image, 'image', 'imageable_type', 'imageable_id');

// Usage
const post = await Post.find(1);
const image = await post.getRelation('image'); // Image | null
```

### Query Builder

Use the fluent query builder for more flexible complex queries:

```typescript
// Start query builder
const users = await User.query()
  .where('status', 'active')
  .whereIn('role', ['admin', 'user'])
  .whereNotNull('email')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get(); // ModelCollection<User>

// Get first record
const user = await User.query()
  .where('email', 'john@example.com')
  .first(); // User | null

// Complex conditions
const posts = await Post.query()
  .where('published', true)
  .whereBetween('created_at', startDate, endDate)
  .whereLike('title', '%tutorial%')
  .orderByDesc('views')
  .limit(20)
  .get();

// Pagination
const result = await User.query()
  .where('active', true)
  .paginate(1, 20); // { data: ModelCollection<User>, pagination: {...} }

// Count and existence check
const count = await User.query()
  .where('status', 'active')
  .count();

const exists = await User.query()
  .where('email', 'john@example.com')
  .exists();
```

**Query Builder Methods:**
- `where(column, value)` / `where(whereObject)` - WHERE conditions
- `whereIn(column, values)` - WHERE IN
- `whereNotIn(column, values)` - WHERE NOT IN
- `whereNull(column)` - WHERE IS NULL
- `whereNotNull(column)` - WHERE IS NOT NULL
- `whereBetween(column, min, max)` - WHERE BETWEEN
- `whereLike(column, pattern)` - WHERE LIKE
- `orderBy(column, direction)` - Ordering
- `orderByDesc(column)` - Descending order
- `limit(count)` - Limit results
- `offset(count)` - Skip records
- `groupBy(...columns)` - Grouping
- `first()` - Get first record
- `get()` - Get all records
- `count()` - Count
- `exists()` - Check existence
- `paginate(page, limit)` - Pagination

### Soft Deletes

When soft deletes are enabled, delete operations don't actually delete records, but mark the `deleted_at` field:

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  static usesSoftDeletes = true;
  static deletedAtColumn = 'deleted_at';
  declare attributes: {
    id?: number;
    name: string;
    deletedAt?: Date | null;
  };
}

// Usage
const user = await User.find(1);
await user.delete(); // Soft delete, sets deleted_at

// Check if soft deleted
if (user.trashed()) {
  // Restore
  await user.restore();
}

// Force delete (actually delete)
await user.forceDelete();

// Query including soft deleted records
const allUsers = await User.withTrashed().get();

// Query only soft deleted records
const deletedUsers = await User.onlyTrashed().get();
```

### Fillable/Guarded

Control which attributes can be mass assigned:

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  
  // Whitelist mode: only allow these fields
  static fillable = ['name', 'email'];
  
  // Or blacklist mode: exclude these fields
  // static guarded = ['id', 'created_at', 'updated_at'];
  
  declare attributes: {
    id?: number;
    name: string;
    email: string;
    isAdmin?: boolean;
  };
}

// Only fields in fillable will be saved
const user = await User.create({
  name: 'John',
  email: 'john@example.com',
  isAdmin: true // This field will be ignored (if not in fillable)
});
```

### Automatic Timestamps

Automatically manage `created_at` and `updated_at`:

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  static timestamps = true; // Default is true
  static createdAtColumn = 'created_at'; // Default
  static updatedAtColumn = 'updated_at'; // Default
  
  declare attributes: {
    id?: number;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

// Automatically sets created_at and updated_at on create
const user = await User.create({ name: 'John' });

// Automatically updates updated_at on update
await user.update({ name: 'Jane' });
```

### Query Scopes

Define reusable query constraints:

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  
  // Define local scope
  static addScope('active', (query) => {
    return { ...query, status: 'active' };
  });
  
  static addScope('recent', (query) => {
    return { ...query, created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
  });
  
  // Define global scope (automatically applied to all queries)
  static addGlobalScope((query) => {
    // Example: automatically filter deleted records
    return { ...query, deleted_at: null };
  });
}

// Use local scope (via query builder)
const activeUsers = await User.query()
  .where('status', 'active')
  .get();

// Without global scopes
const allUsers = await User.withoutGlobalScopes().get();
```

### Model Events

Listen to model lifecycle events:

```typescript
// Register event listeners at application startup
core.hooks.addAction('model:creating', async ({ model, attributes }) => {
  console.log('Creating model:', model.constructor.name);
});

core.hooks.addAction('model:created', async ({ model }) => {
  console.log('Model created:', model.getKey());
});

core.hooks.addAction('model:updating', async ({ model, attributes }) => {
  console.log('Updating model:', model.getKey());
});

core.hooks.addAction('model:updated', async ({ model }) => {
  console.log('Model updated:', model.getKey());
});

core.hooks.addAction('model:saving', async ({ model, wasRecentlyCreated }) => {
  console.log('Saving model:', model.getKey());
});

core.hooks.addAction('model:saved', async ({ model, wasRecentlyCreated }) => {
  console.log('Model saved:', model.getKey());
});

core.hooks.addAction('model:deleting', async ({ model }) => {
  console.log('Deleting model:', model.getKey());
});

core.hooks.addAction('model:deleted', async ({ model, soft }) => {
  console.log('Model deleted:', model.getKey(), soft ? '(soft)' : '(hard)');
});
```

### With Count

Eager load relation counts:

```typescript
// Load post count for each user
const users = await User.withCount('posts');

users.forEach(user => {
  console.log(user.get('posts_count')); // Post count
});
```

### Batch Processing (Chunk & Cursor)

Efficiently process large datasets:

```typescript
// Process in chunks (100 records per chunk)
await User.chunk(100, async (users) => {
  for (const user of users) {
    // Process each chunk
    await processUser(user);
  }
});

// Cursor processing (one record at a time)
await User.cursor(async (user) => {
  await processUser(user);
});
```

### Type Casting

Similar to Laravel's `$casts`, you can define type casting for attributes:

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  static casts = {
    age: 'number',           // String to number
    isActive: 'boolean',     // String to boolean
    metadata: 'json',        // JSON string to object
    tags: 'array',          // To array
    createdAt: 'date',      // To Date object
  };
  declare attributes: {
    id?: number;
    name: string;
    age?: string | number;
    isActive?: string | boolean;
    metadata?: string | object;
    tags?: string | string[];
    createdAt?: string | Date;
  };
}

// Usage
const user = await User.find(1);
console.log(typeof user.get('age'));        // 'number'
console.log(typeof user.get('isActive'));   // 'boolean'
console.log(user.get('metadata'));          // object (parsed JSON)
```

Supported cast types:
- `'string'` - To string
- `'number'` - To number
- `'boolean'` - To boolean
- `'date'` - To Date object
- `'json'` - JSON string to object
- `'array'` - To array
- Custom function - `(value: unknown) => unknown`

### Polymorphic Relations

Polymorphic relations allow a model to belong to more than one other model. For example, a Comment can belong to a Post or a Video.

#### morphTo - Polymorphic Many-to-One

```typescript
export class Comment extends Model {
  static table = commentsTable;
  static tableName = 'comments';
  declare attributes: {
    id?: number;
    commentableType?: string;  // 'Post' or 'Video'
    commentableId?: number;     // Post or Video ID
    content: string;
  };
}

export class Post extends Model {
  static table = postsTable;
  static tableName = 'posts';
  declare attributes: {
    id?: number;
    title: string;
  };
}

export class Video extends Model {
  static table = videosTable;
  static tableName = 'videos';
  declare attributes: {
    id?: number;
    title: string;
  };
}

// Define polymorphic relation
Comment.morphTo('commentable', 'commentable_type', 'commentable_id');

// Use morphMap to map type names to model classes (optional)
const morphMap = new Map();
morphMap.set('Post', Post);
morphMap.set('Video', Video);
Comment.morphTo('commentable', 'commentable_type', 'commentable_id', morphMap);

// Usage
const comment = await Comment.find(1);
const commentable = await comment.getRelation('commentable'); // Returns Post or Video based on commentable_type
```

#### morphMany - One-to-Many Polymorphic

```typescript
// Post has many Comments
Post.morphMany(Comment, 'comments', 'commentable_type', 'commentable_id');

// Usage
const post = await Post.find(1);
const comments = await post.getRelation('comments'); // ModelCollection<Comment>
```

#### morphOne - One-to-One Polymorphic

```typescript
// Post has one Image
Post.morphOne(Image, 'image', 'imageable_type', 'imageable_id');

// Usage
const post = await Post.find(1);
const image = await post.getRelation('image'); // Image | null
```

### Query Builder

Use the fluent query builder for more flexible complex queries:

```typescript
// Start query builder
const users = await User.query()
  .where('status', 'active')
  .whereIn('role', ['admin', 'user'])
  .whereNotNull('email')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get(); // ModelCollection<User>

// Get first record
const user = await User.query()
  .where('email', 'john@example.com')
  .first(); // User | null

// Complex conditions
const posts = await Post.query()
  .where('published', true)
  .whereBetween('created_at', startDate, endDate)
  .whereLike('title', '%tutorial%')
  .orderByDesc('views')
  .limit(20)
  .get();

// Pagination
const result = await User.query()
  .where('active', true)
  .paginate(1, 20); // { data: ModelCollection<User>, pagination: {...} }

// Count and existence check
const count = await User.query()
  .where('status', 'active')
  .count();

const exists = await User.query()
  .where('email', 'john@example.com')
  .exists();
```

**Query Builder Methods:**
- `where(column, value)` / `where(whereObject)` - WHERE conditions
- `whereIn(column, values)` - WHERE IN
- `whereNotIn(column, values)` - WHERE NOT IN
- `whereNull(column)` - WHERE IS NULL
- `whereNotNull(column)` - WHERE IS NOT NULL
- `whereBetween(column, min, max)` - WHERE BETWEEN
- `whereLike(column, pattern)` - WHERE LIKE
- `orderBy(column, direction)` - Ordering
- `orderByDesc(column)` - Descending order
- `limit(count)` - Limit results
- `offset(count)` - Skip records
- `groupBy(...columns)` - Grouping
- `first()` - Get first record
- `get()` - Get all records
- `count()` - Count
- `exists()` - Check existence
- `paginate(page, limit)` - Pagination

### Soft Deletes

When soft deletes are enabled, delete operations don't actually delete records, but mark the `deleted_at` field:

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  static usesSoftDeletes = true;
  static deletedAtColumn = 'deleted_at';
  declare attributes: {
    id?: number;
    name: string;
    deletedAt?: Date | null;
  };
}

// Usage
const user = await User.find(1);
await user.delete(); // Soft delete, sets deleted_at

// Check if soft deleted
if (user.trashed()) {
  // Restore
  await user.restore();
}

// Force delete (actually delete)
await user.forceDelete();

// Query including soft deleted records
const allUsers = await User.withTrashed().get();

// Query only soft deleted records
const deletedUsers = await User.onlyTrashed().get();
```

### Fillable/Guarded

Control which attributes can be mass assigned:

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  
  // Whitelist mode: only allow these fields
  static fillable = ['name', 'email'];
  
  // Or blacklist mode: exclude these fields
  // static guarded = ['id', 'created_at', 'updated_at'];
  
  declare attributes: {
    id?: number;
    name: string;
    email: string;
    isAdmin?: boolean;
  };
}

// Only fields in fillable will be saved
const user = await User.create({
  name: 'John',
  email: 'john@example.com',
  isAdmin: true // This field will be ignored (if not in fillable)
});
```

### Automatic Timestamps

Automatically manage `created_at` and `updated_at`:

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  static timestamps = true; // Default is true
  static createdAtColumn = 'created_at'; // Default
  static updatedAtColumn = 'updated_at'; // Default
  
  declare attributes: {
    id?: number;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

// Automatically sets created_at and updated_at on create
const user = await User.create({ name: 'John' });

// Automatically updates updated_at on update
await user.update({ name: 'Jane' });
```

### Query Scopes

Define reusable query constraints:

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  
  // Define local scope
  static addScope('active', (query) => {
    return { ...query, status: 'active' };
  });
  
  static addScope('recent', (query) => {
    return { ...query, created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
  });
  
  // Define global scope (automatically applied to all queries)
  static addGlobalScope((query) => {
    // Example: automatically filter deleted records
    return { ...query, deleted_at: null };
  });
}

// Use local scope (via query builder)
const activeUsers = await User.query()
  .where('status', 'active')
  .get();

// Without global scopes
const allUsers = await User.withoutGlobalScopes().get();
```

### Model Events

Listen to model lifecycle events:

```typescript
// Register event listeners at application startup
core.hooks.addAction('model:creating', async ({ model, attributes }) => {
  console.log('Creating model:', model.constructor.name);
});

core.hooks.addAction('model:created', async ({ model }) => {
  console.log('Model created:', model.getKey());
});

core.hooks.addAction('model:updating', async ({ model, attributes }) => {
  console.log('Updating model:', model.getKey());
});

core.hooks.addAction('model:updated', async ({ model }) => {
  console.log('Model updated:', model.getKey());
});

core.hooks.addAction('model:saving', async ({ model, wasRecentlyCreated }) => {
  console.log('Saving model:', model.getKey());
});

core.hooks.addAction('model:saved', async ({ model, wasRecentlyCreated }) => {
  console.log('Model saved:', model.getKey());
});

core.hooks.addAction('model:deleting', async ({ model }) => {
  console.log('Deleting model:', model.getKey());
});

core.hooks.addAction('model:deleted', async ({ model, soft }) => {
  console.log('Model deleted:', model.getKey(), soft ? '(soft)' : '(hard)');
});
```

### With Count

Eager load relation counts:

```typescript
// Load post count for each user
const users = await User.withCount('posts');

users.forEach(user => {
  console.log(user.get('posts_count')); // Post count
});
```

### Batch Processing (Chunk & Cursor)

Efficiently process large datasets:

```typescript
// Process in chunks (100 records per chunk)
await User.chunk(100, async (users) => {
  for (const user of users) {
    // Process each chunk
    await processUser(user);
  }
});

// Cursor processing (one record at a time)
await User.cursor(async (user) => {
  await processUser(user);
});
```

### Accessors & Mutators

Similar to Laravel, you can define accessors and mutators:

```typescript
export class User extends Model {
  static table = usersTable;
  static tableName = 'users';
  declare attributes: {
    id?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  // Accessor - automatically processed when getting
  getFullNameAttribute(value: unknown): string {
    const attrs = this.attributes as any;
    return `${attrs.firstName || ''} ${attrs.lastName || ''}`.trim();
  }

  // Mutator - automatically processed when setting
  setEmailAttribute(value: unknown): string {
    return String(value).toLowerCase().trim();
  }
}

// Usage
const user = new User();
user.set('firstName', 'John');
user.set('lastName', 'Doe');
user.set('email', '  JOHN@EXAMPLE.COM  ');

console.log(user.get('fullName'));  // 'John Doe' (accessor automatically processed)
console.log(user.attributes.email); // 'john@example.com' (mutator automatically processed)
```

Accessor naming: `get{AttributeName}Attribute`
Mutator naming: `set{AttributeName}Attribute`

### Model vs DBService

Atlas provides two usage patterns with the same performance:

**Pattern 1: Model Classes (Elegant, Laravel-like)**
```typescript
const user = await User.find(1);
```

**Pattern 2: DBService (Direct, Performance-focused)**
```typescript
const db = c.get('db');
const user = await db.findById(usersTable, 1);
```

Both patterns use the same Drizzle query builder underneath. Choose the style that fits your project.

## CRUD Operations

Atlas provides two ways to perform CRUD operations:

### Pattern 1: Using Model Classes (Elegant)

```typescript
// Create
const user = await User.create({ name: 'John', email: 'john@example.com' });

// Read
const user = await User.find(1);
const users = await User.all();

// Update
const user = await User.find(1);
await user.update({ name: 'Updated' });

// Delete
const user = await User.find(1);
await user.delete();
```

### Pattern 2: Using DBService (Direct)

### Create

```typescript
// Create single record
const newUser = await db.create(users, {
  name: 'John Doe',
  email: 'john@example.com',
});

// Insert single or multiple
const user = await db.insert(users, {
  name: 'Jane Doe',
  email: 'jane@example.com',
});

// Bulk insert
const users = await db.insert(users, [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
]);
```

### Read

```typescript
// Find by ID
const user = await db.findById(users, 1);

// Find single record
const user = await db.findOne(users, { email: 'john@example.com' });

// Find all records
const allUsers = await db.findAll(users);

// With conditions
const activeUsers = await db.findAll(users, { status: 'active' });

// With sorting and limit
const recentUsers = await db.findAll(users, undefined, {
  orderBy: users.createdAt,
  orderDirection: 'desc',
  limit: 10,
});

// Count records
const totalUsers = await db.count(users);
const activeCount = await db.count(users, { status: 'active' });

// Check if record exists
const exists = await db.exists(users, { email: 'john@example.com' });

// Paginated query
const result = await db.paginate(users, {
  page: 1,
  limit: 10,
  orderBy: users.createdAt,
  orderDirection: 'desc',
});

// result.data - Array of data
// result.pagination - Pagination info
```

### Update

```typescript
// Update records
const updatedUsers = await db.update(
  users,
  { id: 1 },
  { name: 'John Updated' }
);
```

### Delete

```typescript
// Delete records
await db.delete(users, { id: 1 });
```

## Relation Queries

### Basic Relation Queries

```typescript
// Query user with all posts
const user = await db.findByIdWith('users', 1, {
  posts: true,
});

// Query user with posts and comments
const user = await db.findByIdWith('users', 1, {
  posts: true,
  comments: true,
});

// Nested relations (load posts with comments)
const user = await db.findByIdWith('users', 1, {
  posts: {
    comments: true,  // Load comments for each post
  },
});

// Find single record with relations
const user = await db.findOneWith(
  'users',
  { email: 'john@example.com' },
  { posts: true }
);

// Find all records with relations
const users = await db.findAllWith('users', { posts: true }, {
  where: { status: 'active' },
  limit: 10,
});
```

### Using Raw Drizzle Query API

If relation query methods don't meet your needs, you can use Drizzle's query API directly:

```typescript
import { eq } from 'drizzle-orm';

// Use Drizzle's query API
const user = await db.raw.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: {
      comments: {
        user: true,  // Load comment author
      },
    },
  },
});
```

## Transactions

### Basic Transaction

```typescript
const result = await db.transaction(async (tx) => {
  // Execute multiple operations in transaction
  const user = await tx.insert(users).values({
    name: 'John',
    email: 'john@example.com',
  }).returning();

  const profile = await tx.insert(profiles).values({
    userId: user[0].id,
    bio: 'Bio text',
  }).returning();

  return { user: user[0], profile: profile[0] };
});
```

### Error Handling in Transactions

```typescript
try {
  const result = await db.transaction(async (tx) => {
    // If any operation fails, the entire transaction is automatically rolled back
    await tx.insert(users).values({ name: 'John' });
    await tx.insert(posts).values({ userId: 1, title: 'Post' });
  });
} catch (error) {
  // Handle error, transaction already rolled back
  console.error('Transaction failed:', error);
}
```

### Atomicity and Consistency (Why Transactions Matter)

Transactions protect critical writes so they either **all succeed** or **all roll back**. Use them when you must keep data consistent:

- Order + payment status updates
- Inventory deduction + order item creation
- User + profile creation

### Isolation and Concurrency (Modern RDBMS Practices)

To keep concurrency safe and avoid deadlocks:

- **Keep transactions short** and avoid external calls (HTTP, email) inside a transaction.
- **Write in a consistent order** when touching multiple tables to reduce lock conflicts.
- Consider **optimistic concurrency** (e.g., version columns) for high‑traffic records.
- For critical stock or balance updates, use **row-level locks** (e.g., `FOR UPDATE`) if your driver supports it.

### Retry Strategy for Transient Failures

High‑isolation levels can occasionally fail due to deadlocks or serialization conflicts. Wrap critical transactions in a retry loop with small backoff for transient errors.

### Relational Integrity and Constraints

Use database constraints to enforce correctness at the lowest layer:

- **Foreign keys** with `onDelete`/`onUpdate` rules
- **Unique constraints** for identifiers and business rules
- **Check constraints** for domain validation

Example (schema-level constraints):

```typescript
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  orderNo: text('order_no').notNull().unique(),
});
```

## Bulk Operations

### Bulk Insert

```typescript
const newUsers = await db.bulkInsert(users, [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  { name: 'User 3', email: 'user3@example.com' },
]);
```

### Bulk Update

```typescript
// Bulk update (executed in transaction)
const updatedUsers = await db.bulkUpdate(users, [
  { where: { id: 1 }, data: { name: 'User 1 Updated' } },
  { where: { id: 2 }, data: { name: 'User 2 Updated' } },
]);
```

### Bulk Delete

```typescript
// Bulk delete (executed in transaction)
await db.bulkDelete(users, [
  { id: 1 },
  { id: 2 },
  { id: 3 },
]);
```

## Migrations and Seeders

### Run Migrations

Gravito CLI wraps `drizzle-kit` to provide a consistent migration workflow.

```bash
# Run pending migrations
gravito migrate

# Drop all tables and re-run migrations (Fresh)
gravito migrate --fresh

# Check migration status
gravito migrate:status
```

### Run Seeders

```bash
# Run all seeders
gravito db:seed

# Run specific seeder class
gravito db:seed --class UsersSeeder
```

In code:

```typescript
// Define seed function
const seedUsers = async (db: any) => {
  await db.insert(users).values([
    { name: 'Admin', email: 'admin@example.com' },
    { name: 'User', email: 'user@example.com' },
  ]);
};

// Run single seed
await db.seed(seedUsers, 'users-seed');

// Run multiple seeds
await db.seedMany([
  { name: 'users-seed', seed: seedUsers },
  { name: 'posts-seed', seed: seedPosts },
]);
```

## Deployment

### Automated Deployment

```typescript
// Deploy database (run migrations and seeds)
const result = await db.deploy({
  runMigrations: true,      // Run migrations (default: true)
  runSeeds: false,          // Run seeds (default: false)
  skipHealthCheck: false,   // Skip health check (default: false)
  validateBeforeDeploy: true, // Validate before deploy (default: true)
});

if (result.success) {
  console.log('Deployment successful');
  console.log('Migrations:', result.migrations);
  console.log('Health check:', result.healthCheck);
} else {
  console.error('Deployment failed:', result.error);
}
```

### Production Deployment Example

```typescript
// Execute deployment on app startup
core.hooks.addAction('app:ready', async () => {
  const db = core.app.get('db');
  
  if (process.env.NODE_ENV === 'production') {
    const result = await db.deploy({
      runMigrations: true,
      runSeeds: false,  // Usually don't run seeds in production
      validateBeforeDeploy: true,
    });
    
    if (!result.success) {
      throw new Error(`Database deployment failed: ${result.error}`);
    }
  }
});
```

## Best Practices

### 1. Use Type Safety

```typescript
// Define types
type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;

// Use types
const user: User = await db.findById(users, 1);
const newUser: NewUser = { name: 'John', email: 'john@example.com' };
```

### 2. Error Handling

```typescript
try {
  const user = await db.findById(users, 1);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json({ user });
} catch (error) {
  console.error('Database error:', error);
  return c.json({ error: 'Internal server error' }, 500);
}
```

### 3. Use Transactions for Complex Operations

```typescript
// Complex operations should be executed in transactions
const result = await db.transaction(async (tx) => {
  const user = await tx.insert(users).values({ name: 'John' }).returning();
  const profile = await tx.insert(profiles).values({ userId: user[0].id }).returning();
  const posts = await tx.insert(posts).values([
    { userId: user[0].id, title: 'Post 1' },
    { userId: user[0].id, title: 'Post 2' },
  ]).returning();
  
  return { user: user[0], profile: profile[0], posts };
});
```

### 4. Use Relation Queries to Avoid N+1 Problem

```typescript
// ❌ Bad practice (N+1 problem)
const users = await db.findAll(users);
for (const user of users) {
  const posts = await db.findAll(posts, { userId: user.id }); // Query each time
}

// ✅ Good practice (use relation queries)
const users = await db.findAllWith('users', { posts: true }); // Single query
```

### 5. Use Pagination for Large Datasets

```typescript
// Avoid loading all data at once
const result = await db.paginate(users, {
  page: 1,
  limit: 20,
  orderBy: users.createdAt,
  orderDirection: 'desc',
});
```

### 6. Use Health Check to Monitor Database

```typescript
// Periodically check database health
setInterval(async () => {
  const health = await db.healthCheck();
  if (health.status !== 'healthy') {
    console.error('Database health check failed:', health.error);
  }
}, 60000); // Check every minute
```

### 7. Use Hooks to Monitor Operations

```typescript
// Monitor query performance
core.hooks.addAction('db:query', ({ query, duration, timestamp }) => {
  if (duration > 1000) {
    console.warn(`Slow query detected: ${query} (${duration}ms)`);
  }
});

// Monitor transactions
core.hooks.addAction('db:transaction:start', ({ transactionId }) => {
  console.log(`Transaction started: ${transactionId}`);
});

core.hooks.addAction('db:transaction:complete', ({ transactionId, duration }) => {
  console.log(`Transaction completed: ${transactionId} (${duration}ms)`);
});
```

### 8. Direct Drizzle API Usage (Advanced)

When helper methods don't meet your needs, you can use Drizzle's full API directly:

```typescript
// Complex queries
const result = await db.raw
  .select({
    user: users,
    postCount: sql<number>`count(${posts.id})`,
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId))
  .groupBy(users.id)
  .having(sql`count(${posts.id}) > 0`);

// Using SQL functions
import { sql, count } from 'drizzle-orm';

const result = await db.raw
  .select({
    total: count(),
    avgAge: sql<number>`avg(${users.age})`,
  })
  .from(users);
```

## Complete Example

```typescript
import { PlanetCore } from 'gravito-core';
import orbitDB from '@gravito/atlas';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

// Define tables
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});

const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
});

// Define relations
const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
}));

// Initialize
const core = new PlanetCore();
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, {
  schema: { users, posts, usersRelations, postsRelations },
});

orbitDB(core, {
  db,
  databaseType: 'postgresql',
  exposeAs: 'db',
});

// Usage examples
core.app.get('/users/:id', async (c) => {
  const db = c.get('db');
  const userId = parseInt(c.req.param('id'));
  
  // Use relation query
  const user = await db.findByIdWith('users', userId, {
    posts: true,
  });
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  return c.json({ user });
});

core.app.post('/users', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  
  // Create user
  const user = await db.create(users, {
    name: body.name,
    email: body.email,
  });
  
  return c.json({ user }, 201);
});

core.liftoff();
```

## Summary

Atlas provides complete ORM functionality, inspired by Laravel Eloquent while maintaining Drizzle ORM performance:

- ✅ **Complete CRUD Operations** - All basic database operations
- ✅ **Relation Queries** - Support for nested relation queries (hasMany, belongsTo, hasOne, belongsToMany)
- ✅ **Polymorphic Relations** - Flexible polymorphic associations (morphTo, morphMany, morphOne)
- ✅ **Query Builder** - Fluent query builder with chainable methods
- ✅ **Soft Deletes** - Soft delete support with restore capability
- ✅ **Fillable/Guarded** - Mass assignment protection
- ✅ **Automatic Timestamps** - Automatic created_at and updated_at management
- ✅ **Query Scopes** - Local and global scopes for reusable query constraints
- ✅ **Model Events** - Complete lifecycle event support
- ✅ **Type Casting** - Automatic attribute type conversion
- ✅ **Accessors & Mutators** - Custom getters and setters for attributes
- ✅ **Collections** - Laravel-like collection operations
- ✅ **Batch Processing** - Chunk and Cursor for efficient large dataset processing
- ✅ **With Count** - Eager loading relation counts
- ✅ **Transaction Support** - Complete transaction handling
- ✅ **Bulk Operations** - Efficient batch processing
- ✅ **Migration and Seeder** - Database version management
- ✅ **Deployment Support** - Automated deployment workflow
- ✅ **PostgreSQL Optimized** - Performance optimizations for PostgreSQL

Access the full power of Drizzle ORM through `db.raw` for flexibility and extensibility.
