# @gravito/atlas

> 標準資料庫軌道 - 專為 Gravito 打造的查詢構建器與 ORM

**@gravito/atlas** 是一個高效能、以開發者體驗為中心的資料庫工具包。它提供流暢的 Query Builder、強大的 Active Record ORM，以及深受 Laravel 與 Drizzle 啟發的水平分表 (Sharding) 功能。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.0-orange)](package.json)
[![Performance](https://img.shields.io/badge/performance-extreme-brightgreen)](docs/architecture.md)

---

## ✨ 核心特性

- 🚀 **極致效能**: 零成本查詢克隆 (CoW) 與優化的模型水合 (Hydration)。
- 🧩 **水平分表 (Sharding)**: 透過簡單的裝飾器實作跨資料庫水平擴展。
- 🛡️ **型別安全 ORM**: 完整的 Active Record 實作，支援豐富的關聯類型。
- 🔌 **多驅動支援**: 原生支援 PostgreSQL, MySQL, SQLite, MongoDB 與 Redis。
- 📊 **可觀察性**: 內建 OpenTelemetry 整合，支援分散式追蹤。
- 🛠️ **開發者體驗**: "Smart Guard" 錯誤建議與 N+1 查詢自動偵測。

---

## 📚 技術文件

詳細技術文件請參閱 `docs/` 目錄：

- [架構概覽](docs/architecture.md) - 理解 Orbit 引擎設計。
- [Active Record ORM](docs/orm.md) - 模型、水合與持久化。
- [水平分表 (Sharding)](docs/sharding.md) - 使用 `@sharded` 進行水平擴展。
- [流暢查詢器 (Query Builder)](docs/query-builder.md) - 進階查詢構建。
- [資料庫驅動](docs/drivers.md) - 連線與平台支援。
- [可觀察性](docs/observability.md) - 追蹤與效能監控。

---

## 📦 安裝

```bash
bun add @gravito/atlas
```

> **注意**: 資料庫驅動需要獨立安裝。請參閱 [資料庫驅動文件](docs/drivers.md)。

---

## 🚀 快速上手

### 1. 定義模型 (Model)

```typescript
import { Model, column, HasMany } from '@gravito/atlas'

export class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @HasMany(() => Post)
  declare posts: Post[]
}
```

### 2. 查詢與儲存

```typescript
// 查詢使用者與其文章
const user = await User.with('posts').find(1)

// 更新並儲存
user.email = 'orbit@gravito.dev'
await user.save()

// 流暢查詢
const activeUsers = await User.where('status', 'active')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get()
```

---

## 🛠️ 命令行工具 (Orbit CLI)

透過內建工具加速開發流程。

```bash
# 生成模型
bun orbit make:model User

# 執行遷移
bun orbit migrate

# 診斷健康狀況
bun orbit doctor
```

---

## 📄 授權

MIT © Gravito Framework
