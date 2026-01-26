# @gravito/graphql 🕸️

> **Gravito 的零配置 GraphQL 模組，基於 GraphQL Yoga。**

`@gravito/graphql` 將 [GraphQL Yoga](https://the-guild.dev/graphql/yoga) 完美整合進 Gravito 生態系統。它讓您能以最少的配置構建高效能、類型安全的 GraphQL API，同時保留對 Gravito 核心功能的完整存取。

## 🌟 特性

- **⚡️ 基於 Yoga**：利用 GraphQL Yoga 5 的高效能與靈活性。
- **🛠️ 零配置**：即使不提供 Schema，也會自動使用預設的 Hello World 範例運作。
- **🔗 上下文整合**：將 `GravitoContext` 自動注入 GraphQL Resolver 中，鍵名為 `gravito`。
- **🔌 靈活的 Schema 解析**：
  - 在建構函數中直接傳入預先構建的 `GraphQLSchema`。
  - 在應用程式配置中定義 `GRAPHQL_SCHEMA`。
  - 在 IoC 容器中註冊 `GRAPHQL_SCHEMA`。
- **🚀 完全類型安全**：使用 TypeScript 編寫，提供完善的配置與上下文類型定義。
- **🎨 內建 Playground**：內建 GraphiQL 介面，方便開發時測試。

## 📦 安裝

```bash
bun add @gravito/graphql graphql
```

## 🚀 快速上手

在您的應用程式中註冊 `OrbitGraphQL`：

```typescript
import { PlanetCore } from '@gravito/core';
import { OrbitGraphQL } from '@gravito/graphql';
import { createSchema } from 'graphql-yoga';

const core = new PlanetCore();

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String
    }
  `,
  resolvers: {
    Query: {
      hello: () => '來自 Gravito 的問候！'
    }
  }
});

await core.orbit(new OrbitGraphQL({
  path: '/graphql', // 選填：預設為 /graphql
  schema: schema     // 選填：亦可從容器中解析
}));

await core.liftoff();
```

在瀏覽器中訪問 **`http://localhost:3000/graphql`** 即可開啟 GraphiQL 工具。

## ⚙️ 配置選項

`GraphQLConfig` 物件支援以下選項：

| 選項 | 類型 | 預設值 | 描述 |
|---|---|---|---|
| `path` | `string` | `'/graphql'` | GraphQL 節點的 URL 路徑。 |
| `schema` | `GraphQLSchema` | `undefined` | 預先構建的 GraphQL Schema 實例。 |

## 🔌 存取 Gravito 上下文

`GravitoContext` 會自動注入到 GraphQL 上下文的 `gravito` 鍵中。您可以直接在 Resolver 中存取您的服務、用戶數據或請求資訊：

```typescript
resolvers: {
  Query: {
    user: (parent, args, context) => {
      // 存取 Gravito Context
      const gravito = context.gravito;
      const auth = gravito.get('auth');
      
      return auth.user();
    }
  }
}
```

## 🛠️ 進階：IoC 容器解析

除了直接傳遞 Schema，您也可以將其註冊到 Gravito 容器中。這對於使用依賴注入的複雜應用非常有用：

```typescript
core.container.singleton('GRAPHQL_SCHEMA', () => {
  return myComplexSchemaBuilder.build();
});

// 模組將會自動尋找並使用註冊過的 Schema
await core.orbit(new OrbitGraphQL());
```

## 📄 授權

MIT © Carl Lee
