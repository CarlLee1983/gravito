# Query Builder

Atlas provides a fluent, driver-agnostic query builder that allows you to construct complex database queries with ease. It supports SQL (PostgreSQL, MySQL, SQLite) and NoSQL (MongoDB) through a unified interface.

## Retrieving Results

### `get()`
The `get` method returns an array of results. When used on a model, it returns an array of model instances.
```typescript
const users = await User
  .where('active', true)
  .get();
```

### `first()`
If you only need a single row, use `first`.
```typescript
const user = await User
  .where('email', 'alice@example.com')
  .first();
```

### `pluck()`
If you want to retrieve an array containing the values of a single column:
```typescript
const titles = await Post.pluck('title'); // ['Hello World', 'Atlas Guide', ...]
```

### `count()` / `max()` / `min()` / `avg()` / `sum()`
```typescript
const count = await User.count();
const maxPrice = await Product.max('price');
```

## Select Clauses

### `select()`
Specify which columns to retrieve:
```typescript
const users = await User
  .select('name', 'email as user_email')
  .get();
```

### `distinct()`
```typescript
const roles = await User.distinct().pluck('role');
```

## Joins (SQL Drivers)

Atlas supports various join types for SQL databases.

### Inner Join
```typescript
const users = await User.query()
  .join('contacts', 'users.id', '=', 'contacts.user_id')
  .select('users.*', 'contacts.phone')
  .get();
```

### Left / Right Join
```typescript
const users = await User
  .leftJoin('posts', 'users.id', '=', 'posts.author_id')
  .get();
```

## Advanced Where Clauses

### Basic Wheres
```typescript
// Implicit '='
const users = await User.where('votes', 100).get();

// Explicit operator
const users = await User.where('votes', '>=', 100).get();
```

### Logical Groups (Or Statements)
```typescript
const users = await User
  .where('votes', '>', 100)
  .orWhere('name', 'John')
  .get();
```

### JSON Where Clauses
If your database supports JSON (PostgreSQL, MySQL, MongoDB), you can query nested properties:
```typescript
const users = await User.where('options.language', 'en').get();
```

### `whereIn` / `whereNull` / `whereBetween`
```typescript
const users = await User.whereIn('id', [1, 2, 3]).get();
const pending = await Task.whereNull('completed_at').get();
const range = await User
  .whereBetween('votes', [1, 100])
  .get();
```

## Ordering, Grouping, Limit & Offset

### `orderBy()`
```typescript
const users = await User
  .orderBy('name', 'desc')
  .get();
```

### `latest()` / `oldest()`
Convenience methods for `orderBy('created_at', 'desc')`:
```typescript
const user = await User.latest().first();
```

### `groupBy()` / `having()`
```typescript
const stats = await User
  .groupBy('account_id')
  .having('count', '>', 5)
  .get();
```

### `skip()` / `take()`
```typescript
const users = await User
  .skip(10)
  .take(5)
  .get();
```

## Aggregates

The query builder also provides a variety of methods for retrieving aggregate values:

```typescript
const count = await User.where('active', true).count();
const price = await DB.table('orders').max('price');
const average = await DB.table('users').avg('age');
```

## Raw Expressions

Sometimes you may need to use a raw expression in a query. These expressions will be injected into the query as strings, so be careful not to create any SQL injection vulnerabilities:

```typescript
const users = await User
    .select(DB.raw('count(*) as user_count, status'))
    .where('status', '<>', 1)
    .groupBy('status')
    .get();
```

## Chunking Results

If you need to work with thousands of database records, consider using the `chunk` method. This method retrieves a small chunk of results at a time and feeds each chunk into a closure for processing:

```typescript
await User.query().chunk(100, async (users) => {
    for (const user of users) {
        // Process user...
    }
});
```

You may stop further chunks from being processed by returning `false` from the closure:

```typescript
await User.query().chunk(100, async (users) => {
  // Process records...
  return false; // Stop processing
});
```

## Inserts, Updates & Deletes

### `insert()`
```typescript
await DB.table('users').insert([
  { email: 'kayla@example.com', votes: 0 },
  { email: 'taylor@example.com', votes: 0 }
]);
```

### `update()`
```typescript
await User.where('id', 1).update({ votes: 1 });
```

### `increment` & `decrement`
```typescript
await User.where('id', 1).increment('votes');
await User.where('id', 1).decrement('votes', 5);
```

### `delete()`
```typescript
await User.where('votes', '<', 50).delete();
```
