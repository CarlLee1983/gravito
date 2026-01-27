# @gravito/graphql v2.1.0+ 實作路線圖

> 🎯 目標：擴展 GraphQL 企業級功能與增強自動化查詢能力

---

## 🚀 核心功能擴展

### 1. GraphQL Federation 支援
實作 Apollo Federation 規範，讓 `@gravito/graphql` 能夠作為微服務架構中的 Subgraph。
- [x] 支援 `@key`, `@shareable`, `@external`, `@requires`, `@provides` 指令。
- [x] 實作 `_entities` query resolver。
- [x] 整合 `@apollo/subgraph` 或原生指令解析。

### 2. 進階自動化過濾器 (Advanced Filters)
在 `createAtlasSchema` 中自動生成更強大的過濾輸入類型，超越目前的基礎操作。
- [x] **邏輯運算符**：支援 `_and`, `_or`, `_not` 巢狀篩選。
- [x] **比較運算符擴展**：
    - 字串：`contains`, `startsWith`, `endsWith`, `match` (Regex)。
    - 數值/日期：`gt`, `gte`, `lt`, `lte`, `between` (目前部分手動實作，需標準化生成)。
- [x] **關聯篩選**：支援根據關聯對象的屬性進行篩選 (例如：`users(where: { posts: { title: { contains: "Gravito" } } })`)。

### 3. 專用自定義純量 (Custom Scalars)
解決目前 Atlas 整合中將複雜類型映射為 `String` 的問題。
- [x] **JSON Scalar**：支援 `json` 與 `jsonb` 類型的結構化存取。
- [x] **DateTime Scalar**：符合 ISO-8601 標準的日期時間驗證與轉換。
- [x] **BigInt Scalar**：處理 64-bit 整數以防止前端精度丟失。

---

## 🛠️ 內部優化 (Codebase TODOs)

### 1. 模型元數據優化
- [x] **隱藏欄位處理**：在生成 GraphQL Type 時自動讀取並排除 `Model.hidden` 中定義的欄位。
- [x] **動態屬性 (Appends)**：支援 `Model.appends` 定義的 Accessors 自動轉換為 GraphQL 欄位。

### 2. 性能與安全性增強
- [x] **分頁標準化**：支援 Relay 規範的 `Connection` 模式 (Cursor-based pagination)。
- [x] **自動限流**：整合成本分析 (Query Cost) 到速率限制 (Rate Limiting) 策略中。

---

## 📝 實作備註
- **技術棧保持**：持續優先使用 Bun 原生 API 以確保極致性能。
- **與 Atlas 對齊**：所有自動化生成邏輯應緊跟 `@gravito/atlas` 的裝飾器與元數據系統更新。
