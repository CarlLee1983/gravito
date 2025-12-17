---
title: Orbit DB
---

# Orbit DB

> Database integration as a Gravito Orbit.

Package: `@gravito/orbit-db`

Provides seamless integration with [Drizzle ORM](https://orm.drizzle.team/).

## Installation

```bash
bun add @gravito/orbit-db drizzle-orm
```

## Usage

```typescript
import { PlanetCore } from 'gravito-core';
import orbitDB from '@gravito/orbit-db';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';

const core = new PlanetCore();
const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

// Initialize DB Orbit
orbitDB(core, {
  db,
  exposeAs: 'db' // Access via c.get('db')
});

// Use in routes
core.app.get('/users', async (c) => {
  const db = c.get('db');
  // const users = await db.select().from(...);
  return c.json({ users: [] });
});
```

## Hooks

- `db:connected` - Fired when the DB orbit initializes.
