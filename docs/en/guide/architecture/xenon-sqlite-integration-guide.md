---
title: Xenon + SQLite Integration Guide
description: Complete guide for integrating SQLite with Gravito using the Xenon Secure FFI Layer. Covers connection management, transactions, and performance.
---

# 🗄️ Xenon + SQLite Integration Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Complete Implementation](#complete-implementation)
3. [Common Patterns](#common-patterns)
4. [Testing Strategy](#testing-strategy)
5. [Troubleshooting](#troubleshooting)
6. [Performance Optimization](#performance-optimization)

---

## Quick Start

### Installation

```bash
# SQLite Satellite depends on Xenon
bun add @gravito/xenon @gravito/satellite-sqlite
```

### Minimal Example

```typescript
import { Xenon } from '@gravito/xenon'
import { SatelliteSQLite } from '@gravito/satellite-sqlite'

// 1. Configure security policy
Xenon.configure({
  allowedPaths: [
    '/usr/lib/libsqlite3.so*',
    '/usr/lib/libsqlite3.dylib',
  ],
})

// 2. Setup satellite
const satellite = SatelliteSQLite.configure({
  libPath: '/usr/lib/libsqlite3.so.0',
})

// 3. Mount in application
const app = createApp({
  satellites: [satellite],
})

// 4. Usage
app.use(async (ctx) => {
  const sqlite = ctx.sqlite
  const conn = await sqlite.createConnection('app.db')
  const rows = await conn.execute('SELECT * FROM users')
  await conn.close()
})
```

---

## Complete Implementation

### Step 1: Define SQLite Symbols
Map native C functions to FFI symbols using the standard SQLite C API.

### Step 2: Connection Wrapper
Create a wrapper that handles pointer allocation/deallocation via `Xenon.allocBuffer` and `Xenon.freeBuffer`.

### Step 3: Service Layer
Manage the library lifecycle and provide a connection pool.

---

## Common Patterns

### Pattern 1: Single Connection
Best for simple, sequential script execution or migration tasks.

### Pattern 2: Connection Pooling
Recommended for high-concurrency web applications to prevent DB locks.

### Pattern 3: Transaction Management
Using `BEGIN`, `COMMIT`, and `ROLLBACK` via a high-level helper class.

---

## Testing Strategy

- **Unit Tests**: Test the connection logic using `:memory:` databases.
- **Integration Tests**: Verify transaction rollbacks and crash recovery.

---

## Troubleshooting

- **"Library path not allowed"**: Path is blocked by security policy. Update `allowedPaths`.
- **"Double-free detected"**: A buffer was freed multiple times. Use `try...finally`.
- **"Memory limit exceeded"**: Allocation hit the `maxTotalMemory` cap.

---

**Version**: 1.0.0
**Last Updated**: 2026-02-26
