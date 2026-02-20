# Database Drivers

Atlas is database-agnostic. It supports multiple SQL and NoSQL databases through a unified interface.

## 🔌 Supported Drivers

| Driver | Database | Peer Dependency |
|--------|----------|-----------------|
| `postgres` | PostgreSQL | `pg` |
| `mysql` | MySQL / MariaDB | `mysql2` |
| `sqlite` | SQLite | `better-sqlite3` (Node) or Native (Bun) |
| `mongodb` | MongoDB | `mongodb` |
| `redis` | Redis | `ioredis` |

## 📦 Installation

Drivers are not bundled with `@gravito/atlas` to keep the package lightweight. You must install the driver for your database manually.

```bash
# Example: Using PostgreSQL
bun add pg
```

## ⚙️ Configuration

Set the `driver` property in your connection configuration.

```typescript
DB.configure({
  connections: {
    main: {
      driver: 'postgres',
      host: 'localhost',
      database: 'production',
      // ...
    }
  }
})
```

## 🚀 Native Bun Support

If you are running in the **Bun** environment, Atlas can leverage `Bun.sql` for significantly higher performance.

To enable, set `useNativeDriver: true` (only for supported SQL drivers).

```typescript
{
  driver: 'postgres',
  useNativeDriver: true,
  // ...
}
```

## 🧠 MongoDB Support

Atlas provides an ORM layer for MongoDB that mimics SQL behavior where possible, including relationships.

```typescript
@Model()
class MongoUser extends Model {
  static connection = 'mongodb'
  static table = 'users' // collection name
}
```

## ⚡ Redis Support

While mostly used for caching, Atlas can treat Redis as a primary data store for simple Key-Value models.
