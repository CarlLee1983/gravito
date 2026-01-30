---
title: GraphQL Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 GraphQL Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/graphql` 的內部架構、Schema 自動生成機制以及與 Gravito 生態系的深度整合。

---

## 1. 核心哲學：Zero-Config, High-Performance GraphQL

Gravito GraphQL 的設計目標是提供一個「開箱即用」的 GraphQL 層，同時具備企業級的效能與安全性。
- **Zero Config**: 自動掃描 Atlas 模型並生成對應的 GraphQL Schema (CRUD + Relations)，開發者無需手寫繁瑣的 Type Definitions。
- **Performance First**: 預設整合 APQ (Automatic Persisted Queries)、Response Cache 與 DataLoader，解決 N+1 問題並減少網路流量。
- **Security**: 內建 Query Depth Limit、Complexity Analysis 與 Rate Limiting，防止惡意查詢攻擊。

---

## 2. 模組組件分析

### 2.1 OrbitGraphQL (Entrypoint)
- **職責**：整合 GraphQL Yoga 伺服器與 Gravito Router。
- **位置**：`src/index.ts`
- **機制**：
  - **Schema Resolution**: 支援從檔案、物件或 IoC 容器 (`GRAPHQL_SCHEMA`) 載入 Schema。
  - **Plugin Management**: 根據配置自動注入 Envelop Plugins (Security, Cache)。
  - **Context Injection**: 將 `GravitoContext` 注入到 GraphQL Context 中，讓 Resolver 能存取 `ctx.gravito.get('auth')`。

### 2.2 Atlas Integration (Schema Generator)
- **職責**：將 Atlas ORM 模型自動轉換為 GraphQL Schema。
- **位置**：`src/atlas.ts`
- **流程**：
  1. **Model Scan**: 遍歷 `options.models`。
  2. **Type Generation**: 根據 Column Type 對應到 Scalar (Int, String, DateTime)。
  3. **Relation Handling**: 自動生成關聯欄位 (`posts: [Post]`) 與 Loader 邏輯。
  4. **Operation Generation**: 生成標準 CRUD (`user(id: ID)`, `createUser`, `updateUser`, `deleteUser`)。
  5. **Filtering**: 生成強型別的 Filter Input (`UserWhereInput`)，支援巢狀過濾 (`AND`, `OR`)。

### 2.3 DataLoader Integration (N+1 Solution)
- **職責**：解決 GraphQL 的 N+1 查詢問題。
- **位置**：`src/dataloaders/atlas-loader.ts`
- **實作**：
  - `createAtlasLoaders`: 為每個模型的每個關聯自動建立 DataLoader。
  - **Mechanism**: 當 Resolver 請求關聯數據時，DataLoader 會收集 ID，並使用 Atlas 的 `eagerLoad` (或 `whereIn`) 一次性查詢資料庫。

### 2.4 Federation Support
- **職責**：支援 Apollo Federation，使 Gravito 能作為 Subgraph 運作。
- **位置**：`src/federation/`
- **功能**：
  - 自動添加 `@key`, `@extends` 等 Directives。
  - 實作 `_entities` 與 `_service` Resolver。

---

## 3. 技術規格與設計決策

### 3.1 過濾器架構 (Filtering)
GraphQL 的查詢能力取決於 Filter 的設計。
- **設計**：參考 Hasura/Prisma 的風格。
  ```graphql
  users(where: {
    age: { gt: 18 },
    posts: { some: { title: { contains: "GraphQL" } } }
  })
  ```
- **實作**：`src/filters/` 負責將 GraphQL Input Object 轉換為 Atlas Query Builder 的 `where` 條件。

### 3.2 游標分頁 (Relay Pagination)
除了傳統的 `limit/offset`，Gravito GraphQL 也原生支援 Relay 風格的 Cursor Pagination。
- **Type**: `Connection`, `Edge`, `PageInfo`。
- **優點**：適合無限滾動 (Infinite Scroll) 場景，效能優於 Offset 分頁 (當數據量大時)。

### 3.3 訂閱 (Subscriptions)
支援基於 WebSocket 的實時數據推送。
- **Backend**: 整合 `graphql-ws` 協議。
- **Integration**: 當 Atlas 模型發生變更 (Create/Update/Delete) 時，自動發布事件到 PubSub (需配合 `@gravito/radiance` 或 Redis)。

---

## 4. 潛在風險與效能評估

### 4.1 Schema 膨脹
若模型數量巨大，自動生成的 Schema 可能會非常龐大，導致客戶端 Introspection 變慢。
- **解法**：建議在生產環境禁用 Introspection，或使用 Persisted Queries。

### 4.2 關聯深度攻擊
惡意用戶可能構造深層巢狀查詢 (`author { posts { author { posts ... } } }`)。
- **防護**：預設啟用了 `depthLimit` (建議值 10) 與 `complexityLimit` (建議值 1000)。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Custom Scalars**：新增更多實用的 Scalars (JSON, Email, URL, DateTime)。
2. **Middleware Support**：允許為特定的 Resolver 添加中間件 (如 `auth` guard)。

### 中期 (v1.2)
1. **Code-First Schema**：整合 Pothos，提供更靈活的 Code-First Schema 定義方式 (目前主要是 Schema-First 或 Auto-Generated)。

### 長期 (v2.0)
1. **Deferred/Stream**：支援 GraphQL `@defer` 與 `@stream` 指令，優化慢速欄位的傳輸體驗。

---
*Created by Gravito Architect.*
