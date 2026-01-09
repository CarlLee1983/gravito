# Atlas

> Standardized Database Orbit for Gravito —— Featuring a Laravel-style Query Builder & ORM.

Package: `@gravito/atlas`

This module provides standardized database connection management, a fluent Query Builder, transaction support, model relationships, migrations, and data seeding.

## Reading Guide

This page is an overview. Detailed documentation is grouped by topic:

| Topic | Page |
|------|------|
| Getting Started | [Getting Started](./atlas/getting-started.md) |
| Query Builder | [Query Builder](./atlas/query-builder.md) |
| Models (ORM) | [Models](./atlas/models.md) |
| Relations | [Relations](./atlas/relations.md) |
| Serialization | [Serialization](./atlas/serialization.md) |
| Pagination | [Pagination](./atlas/pagination.md) |
| Migrations & Seeding | [Migrations & Seeding](./atlas/migrations-seeding.md) |

## Features Overview

- **Multi-driver Support**: Full support for PostgreSQL, MySQL, SQLite, MongoDB, and Redis.
- **Fluent Queries**: Laravel-like API for building complex `where`, `join`, and JSON queries.
- **Connection Management**: Easily switch and manage multiple database connections.
- **Eloquent-style Models**: Define Model classes and use relationships (HasMany, BelongsTo, etc.).
- **Maintenance Tools**: Built-in Migrations, Factories, and Seeders.

## Installation

```bash
bun add @gravito/atlas
```

## Quick Start

See [Getting Started](./atlas/getting-started.md) for full examples.

```ts
import { PlanetCore } from '@gravito/core'
import { DB } from '@gravito/atlas'

// Configure Database
DB.configure({
  connections: {
    default: {
      driver: 'postgres',
      host: 'localhost',
      database: 'myapp'
    }
  }
})

// Access in application
const users = await DB.table('users').get()
```

## Usage Guides

- [ORM Usage Guide (English)](../guide/orm-usage.md)
- [ORM 使用指南（繁體中文）](../../../zh-TW/guide/orm-usage.md)

