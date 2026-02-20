# Atlas Architecture: The Orbit Engine

Atlas is designed as a series of concentric "orbits" that manage data from high-level ORM abstractions down to low-level database socket interactions.

## 🏗️ The Layers

### 1. The Model Orbit (ORM)
The outermost layer provides an **Active Record** implementation. Models are intelligent entities that know how to hydrate themselves, track changes ("Dirty Tracking"), and manage relationships.

- **Decorators**: `@column`, `@sharded`, `@SoftDeletes`.
- **Hydration**: Converting raw database rows into rich class instances.
- **Persistence**: Efficiently creating or updating records using computed diffs.

### 2. The Fluent Orbit (Query Builder)
Underneath the ORM, the **Query Builder** provides a chainable, type-safe API for building complex queries. It uses a **Copy-on-Write (CoW)** strategy, making query cloning extremely fast and memory-efficient.

```typescript
DB.table('users').where('age', '>', 25).clone() // Near-instant!
```

### 3. The Galactic Orbit (Grammars & Compilers)
Each database driver has a corresponding **Grammar**. The grammar is responsible for compiling the abstract query state into raw SQL or NoSQL commands specific to the target database (PostgreSQL, MySQL, SQLite, MongoDB).

### 4. The Core Orbit (Drivers & Pools)
The innermost layer handles raw connectivity.
- **Dynamic Connection Pooling**: Manages lifecycle of database connections.
- **Native Support**: Uses `Bun.sql` when available for maximum speed.
- **Observability**: Automatically instruments every operation with OpenTelemetry.

## 🔄 Query Lifecycle

1. **Invocation**: A query begins (e.g., `User.find(1)`).
2. **Analysis**: Atlas checks if the model is `@sharded` and resolves the connection.
3. **DSL Building**: Parameters and filters are added to the Query Builder.
4. **Compilation**: The Grammar converts the builder state into a SQL string + bindings.
5. **Execution**: The Driver sends the command via the pool.
6. **Hydration**: The resulting rows are passed back through the Model Registry to create instances.

## 🛡️ Security
All queries are **Auto-Parameterized**. Atlas never interpolates variables directly into query strings, providing native protection against SQL injection at the compiler level.
