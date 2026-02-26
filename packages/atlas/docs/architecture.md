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

---

## 🔧 Modular Architecture (Phase 1 Optimization)

Atlas has been refactored into fine-grained, composable modules using **Bun-native optimizations** to reduce bundle size and improve type-checking performance.

### Type System Organization

The type definitions are now organized into semantic modules for better maintainability:

```
src/types/
├── index.ts          # Re-exports all type groups
├── common.ts         # 🔹 Fundamental types (no dependencies)
├── connection.ts     # 🔹 Connection pool and driver contracts
├── query.ts          # 🔹 Query builder DSL types (~16.8 KB)
└── contracts.ts      # 🔹 Grammar compilation contracts
```

**Module Characteristics**:
- **`types/common.ts`**: Foundation types like `Awaitable`, `Column`, `Relation` - imported by everything
- **`types/connection.ts`**: Connection config, pool manager, and driver lifecycle types
- **`types/query.ts`**: Largest module containing all query builder clause types, expressions, and constraints
- **`types/contracts.ts`**: Grammar interfaces for SQL/NoSQL compilation to various targets

### Query Builder Sub-Modules

The fluent Query Builder is now split by concern:

```
src/query/builders/
├── AggregateBuilder.ts       # COUNT, SUM, AVG, MIN, MAX aggregates
├── PaginationBuilder.ts      # Limit, offset, keyset pagination
├── MutationBuilder.ts        # Insert, update, delete, upsert operations
└── SubqueryBuilder.ts        # Subquery and derived table construction
```

**Design Pattern**: Delegation
- Main `QueryBuilder` class orchestrates all operations
- Specialized builders handle specific concerns
- All return `QueryBuilder` for fluent chaining (method swallowing)

### Benefits of Modular Architecture

| Benefit | Impact |
|---------|--------|
| **Tree-shaking** | 30-40% smaller bundles with `sideEffects: false` |
| **Import granularity** | Import only needed types/functions, not entire modules |
| **Type checking speed** | TypeScript processes smaller, focused modules faster |
| **Code maintainability** | Each module has a single responsibility |
| **Zero breaking changes** | All public APIs remain 100% compatible |

### Import Examples

**Before** (monolithic):
```typescript
import * from '@gravito/atlas' // 1,358 lines of type definitions
```

**After** (granular):
```typescript
// Import only what you need
import type { Column, Relation } from '@gravito/atlas/types/common'
import type { QueryBuilder } from '@gravito/atlas/query'
```

---

## 📊 Module Dependencies

```
types/common.ts (no deps)
    ↓
types/connection.ts ← types/common
types/query.ts ← types/common
    ↓
query/builders/* ← types/query
    ↓
query/index.ts ← all builders
```

The dependency graph flows from foundational types (common) → specialized contracts → builder implementations, preventing circular dependencies and enabling optimal tree-shaking.
