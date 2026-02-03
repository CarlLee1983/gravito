# GraphQL

Gravito 提供了一個強大且零配置的 GraphQL 整合，由 [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) 驅動。這讓您可以快速構建高效能的 GraphQL API，同時充分利用 Gravito 強大的後端功能。

## 簡介

`@gravito/graphql` 套件 (OrbitGraphQL) 將現代化的 GraphQL 生態系統引入 Gravito。它具備以下特色：

- **零配置啟動：** 掛載 Orbit 即可立即獲得運作中的 GraphQL 伺服器與 GraphiQL 介面。
- **高效能：** 基於 `graphql-yoga` 構建，並針對 Bun 進行了優化。
- **無縫整合：** 在 Resolvers 中可完整存取 `GravitoContext` (使用者、請求、容器)。
- **符合標準：** 支援所有標準 GraphQL 功能 (Queries, Mutations, Subscriptions)。

## 安裝

安裝套件及其 Peer Dependencies：

```bash
bun add @gravito/graphql graphql graphql-yoga
```

## 快速開始

### 1. 註冊 Orbit

在 `bootstrap.ts` 或您初始化 `PlanetCore` 的地方，將 `OrbitGraphQL` 加入應用程式配置中。

```typescript
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitGraphQL } from '@gravito/graphql'

const config = defineConfig({
  orbits: [
    OrbitGraphQL
  ]
})

const app = await PlanetCore.boot(config)
export default app.liftoff()
```

就這樣！您的應用程式現在擁有一個位於 `/graphql` 的端點。您可以打開瀏覽器訪問 `http://localhost:3000/graphql` 來使用 GraphiQL playground。

### 2. 定義 Schema

預設情況下，Gravito 提供一個範例的 "Hello World" Schema。您可以使用 `GRAPHQL_SCHEMA` 配置鍵來提供您自己的 Schema。

```typescript
import { createSchema } from 'graphql-yoga'

const schema = createSchema({
  typeDefs: `
    type Query {
      hello(name: String): String
      version: String
    }
  `,
  resolvers: {
    Query: {
      hello: (_, { name }) => `Hello, ${name || 'Gravito'}!`,
      version: () => '1.0.0'
    }
  }
})

const config = defineConfig({
  config: {
    // 在這裡注入您的 Schema
    GRAPHQL_SCHEMA: schema
  },
  orbits: [OrbitGraphQL]
})
```

## 進階使用

### 存取 Context

Gravito 會自動將 `GravitoContext` 注入到 GraphQL Context 中的 `gravito` 鍵下。這讓您可以存取底層請求、使用者驗證、依賴注入容器等。

```typescript
const resolvers = {
  Query: {
    me: (_, __, context) => {
      // 存取 Gravito Context
      const ctx = context.gravito
      
      // 存取請求標頭
      const userAgent = ctx.req.header('User-Agent')
      
      // 存取驗證 (如果已安裝 OrbitSentinel)
      // const user = ctx.get('auth').user()
      
      return { userAgent }
    }
  }
}
```

### 自定義端點

您可以透過傳遞選項給 `OrbitGraphQL` 建構函式來自定義 GraphQL 端點路徑。

```typescript
const config = defineConfig({
  orbits: [
    new OrbitGraphQL({ 
      path: '/api/v1/query' // 自定義路徑
    })
  ]
})
```

### Service Provider 模式

對於大型應用程式，您可能希望在 Service Provider 中綁定 Schema，而不是在 config 物件中。這允許您使用容器中的服務動態構建 Schema。

```typescript
// app/providers/GraphQLServiceProvider.ts
import { ServiceProvider } from '@gravito/core'
import { createSchema } from 'graphql-yoga'

export class GraphQLServiceProvider extends ServiceProvider {
  async register(container) {
    const schema = createSchema({ /* ... */ })
    
    // 綁定到 OrbitGraphQL 預期的特定鍵
    container.instance('GRAPHQL_SCHEMA', schema)
  }
}
```

## Code-First Schema

雖然 Gravito 完美支援標準的 Schema-First 設計 (SDL)，但我們強烈建議使用 **Pothos** 或 **TypeGraphQL** 等函式庫來獲得型別安全的 Code-First 體驗。由於 `graphql-yoga` 接受任何標準的 `GraphQLSchema`，您可以使用您喜歡的任何 Schema 建構器。

使用 Pothos 的範例：

```typescript
import SchemaBuilder from '@pothos/core'

const builder = new SchemaBuilder({})

builder.queryType({
  fields: (t) => ({
    hello: t.string({
      resolve: () => 'Hello from Pothos!',
    }),
  }),
})

const schema = builder.toSchema()

// 將此 schema 傳遞給 Gravito 配置
```
