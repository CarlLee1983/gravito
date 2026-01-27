# 🌌 Impulse Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/impulse` 的內部架構、多層緩存策略以及與核心框架的整合模式。

---

## 1. 核心哲學：Declarative Validation

Impulse 受到 Laravel FormRequest 的啟發，旨在提供一個宣告式的請求驗證機制。其核心目標是：
- **分離關注點**：將驗證邏輯從 Controller 中抽離，保持 Controller 純淨。
- **類型安全**：利用 TypeScript 的強大推斷能力，自動從驗證 Schema 推導出 Request Body 的類型。
- **效能優先**：透過多層緩存機制，確保在海量請求下的驗證效能。

---

## 2. 模組組件分析

### 2.1 FormRequest (Base Class)
- **職責**：所有驗證類別的基底，定義了驗證流程的骨架。
- **位置**：`src/core/FormRequestBase.ts`
- **主要方法**：
  - `validate(ctx)`: 模板方法，協調授權 (`authorize`)、資料提取 (`getData`)、轉換 (`transform`) 與驗證 (`schema.parse`)。
  - `authorize(ctx)`: 權限檢查鉤子，回傳 `boolean`。
  - `getData(ctx)`: 根據 `source` 屬性從 Context 提取對應資料。

### 2.2 DataExtractor (Helper)
- **職責**：統一從不同來源 (`json`, `form`, `query`, `param`) 提取資料的介面。
- **位置**：`src/core/DataExtractor.ts`
- **優化**：
  - 針對 JSON Body 實作了 Request Level Caching (`ctx.set('__parsedBody', body)`)，避免重複解析。
  - 自動處理 `FormData` 與 `Query` 的陣列扁平化邏輯。

### 2.3 Validator Adapters (Strategy Pattern)
- **職責**：適配不同的驗證庫 (Zod / Valibot)。
- **位置**：`src/validation/`
- **策略**：
  - `ZodValidator`: 適配 Zod 的 `safeParse`。
  - `ValibotValidator`: 適配 Valibot 的 `safeParse`。
  - `SchemaValidatorFactory`: 根據 Schema 特徵自動選擇適配器 (Duck Typing)。

### 2.4 Middleware Factory
- **職責**：將 Class 轉換為標準 Gravito Middleware。
- **位置**：`src/FormRequest.ts` -> `validateRequest`
- **流程**：
  1. 從快取獲取 `FormRequest` 實例 (Singleton)。
  2. 執行驗證。
  3. 成功 -> `ctx.set('validated', data)`，呼叫 `next()`。
  4. 失敗 -> 拋出 `ValidationException` 或回傳 422 JSON。

---

## 3. 技術規格與設計決策

### 3.1 多層緩存架構 (Multi-Layer Caching)

為了極致效能，Impulse 實作了四層緩存：

| 層級 | 組件 | 作用 | 生命週期 |
|------|------|------|----------|
| **L1** | `FormRequestInstanceCache` | 緩存 Request Class 的實例 | Process |
| **L2** | `SchemaCache` | 緩存 Schema 的類型檢測結果 (Zod vs Valibot) | Process |
| **L3** | `SchemaCompilationCache` | 緩存編譯後的驗證函數 (JIT 優化) | Process |
| **L4** | `MessageCache` | 緩存錯誤訊息的解析結果 (Field + Code -> Msg) | Process |

**決策評估**：
- 雖然 JavaScript Class 實例化很快，但在高並發場景下，減少 GC 壓力至關重要。Singleton 模式確保每個 Request Class 全域只有一個實例。
- 驗證函數的 JIT 編譯 (尤其是對於某些複雜 Schema) 可以帶來 10-100 倍的效能提升。

### 3.2 錯誤訊息解析策略
Impulse 支援精細的錯誤訊息自定義，解析順序如下：
1. `messages()` 方法回傳的特定 Key (`email.invalid_string`)。
2. `messages()` 方法回傳的欄位 Key (`email`)。
3. `MessageProvider` (i18n 介面)。
4. Validator 原生錯誤訊息。

此邏輯被封裝在 `getErrorMessage` 並配合 `MessageCache` 使用，確保字串查找開銷最小化。

---

## 4. 潛在風險與效能評估

### 4.1 記憶體洩漏 (Memory Leak)
由於大量使用全域 `Map` 作為緩存 (L1-L4)，若應用動態生成大量**不同**的 Schema (例如在 Runtime 動態建立 Class)，可能導致記憶體持續增長。
- **緩解**：目前的設計假設 Request Class 是靜態定義的，數量有限 (通常 < 1000)。若用於動態 Schema 場景需謹慎。

### 4.2 非同步授權阻塞
`authorize` 支援 `Promise<boolean>`。若在此方法中執行緩慢的資料庫查詢，會直接阻塞請求處理。
- **建議**：僅在 `authorize` 中進行輕量級檢查 (如 JWT Role)，複雜邏輯移至 Controller 或 Service。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Schema Hot Reload**：在開發模式下提供清除緩存的機制，支援 HMR。
2. **Partial Validation**：支援 `PATCH` 請求的部分驗證 (Partial Schema)。

### 中期 (v1.2)
1. **OpenAPI Generator**：利用 `BlueprintGenerator` 的元數據，自動生成 OpenAPI Spec (整合 Astral)。

### 長期 (v2.0)
1. **Frontend SDK**：提供前端套件，直接消費 `getBlueprint()` 的輸出來生成前端表單與驗證邏輯，實現前後端驗證邏輯 100% 同步。

---
*Created by Gravito Architect.*
