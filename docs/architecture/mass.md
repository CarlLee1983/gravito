---
title: Mass Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Mass Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/mass` 的內部架構、TypeBox 整合策略以及與 `OrbitImpulse` 的定位差異。

---

## 1. 核心哲學：The Weight of Integrity

Mass 與 Impulse 同為驗證模組，但側重點截然不同：
- **Impulse**: Class-based, Declarative, OOP 風格。適合複雜業務邏輯與權限校驗。
- **Mass**: Schema-based, Functional, FP 風格。適合高效能 API、微服務與邊緣運算 (Edge)。

Mass 選擇 **TypeBox** 作為核心引擎，原因在於其獨特的「編譯時驗證器生成」特性，能在執行時達到接近原生的驗證速度。

---

## 2. 模組組件分析

### 2.1 Validator (Core)
- **職責**：封裝 TypeBox Validator 為 Photon 中間件。
- **位置**：`src/validator.ts`
- **實作**：直接重用了 `@hono/typebox-validator` 的核心邏輯 (`tbValidator`)，確保與 Hono 生態的相容性，同時加上了 Gravito 的型別增強。

### 2.2 Schema Builder
- **職責**：提供 Fluent API 構建 JSON Schema。
- **位置**：`src/index.ts` (Re-export)
- **機制**：直接導出 `@sinclair/typebox` 的 `Type` 物件為 `Schema`，保持 API 一致性但更符合 Gravito 命名慣例。

### 2.3 Utility Layer
- **職責**：提供常見的 Schema 操作輔助函數。
- **位置**：`src/utils.ts`
- **Partial**: 封裝 `Type.Partial`，簡化 PATCH 請求的 Schema 定義。

---

## 3. 技術規格與設計決策

### 3.1 為什麼選擇 TypeBox？
- **效能**：TypeBox 使用 `new Function` 生成優化的驗證代碼，比 Zod/Valibot 快 10-50 倍 (在某些場景下)。
- **JSON Schema 相容**：TypeBox 定義的 Schema 本質上就是 JSON Schema，這使得與 OpenAPI (Swagger) 的整合變得零成本。
- **零依賴**：TypeBox 是一個極其輕量的庫，適合 Serverless 與 Edge 環境。

### 3.2 與 Photon 的整合
Mass 利用 TypeScript 的泛型推斷，將驗證後的型別直接注入到 `c.req.valid('json')`。
- **Inference**：
  ```typescript
  // 中間件定義
  MiddlewareHandler<E, P, { in: { json: Static<T> }, out: { json: Static<T> } }>
  ```
- 這確保了在 Controller 中不需要手動轉型 (Type Casting)。

### 3.3 錯誤處理 Hooks
Mass 允許透過 `ValidationHook` 攔截驗證結果。
- **預設行為**：回傳 400 Bad Request。
- **自定義**：開發者可以傳入 Hook 函數，自定義錯誤格式 (如 JSON:API 或 Problem Details RFC 7807)。

---

## 4. 潛在風險與效能評估

### 4.1 錯誤訊息的可讀性
TypeBox 原生的錯誤訊息通常較為機械化 (e.g., `Expected string, received number`)。
- **限制**：相較於 Zod，TypeBox 的錯誤訊息客製化較為繁瑣。
- **建議**：若需高度客製化的 i18n 錯誤訊息，Impulse 是更好的選擇。

### 4.2 編譯開銷 (Startup Time)
雖然 Runtime 快，但 TypeBox 在首次使用 Schema 時需要編譯 Validator。
- **風險**：對於擁有數千個 Schema 的大型應用，啟動時間可能微幅增加。
- **緩解**：由於是 Lazy Compilation，通常影響不大。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Format Registry**：預註冊常用的 TypeBox Formats (email, uuid, date-time)，簡化使用者配置。
2. **OpenAPI Generator**：提供工具將 Mass Schema 直接轉換為 Astral 文檔定義。

### 中期 (v1.2)
1. **Coercion Helpers**：增強 Query 與 Param 的型別強制轉換 (Coercion) 支援，例如自動將字串 "true" 轉為布林值。

### 長期 (v2.0)
1. **Universal Validator**：探索與 ArkType 或標準 Schema 介面的整合，提供更統一的驗證體驗。

---
*Created by Gravito Architect.*


## 快速開始

> 內容補齊中...


## 架構設計

> 內容補齊中...


## API 參考

> 內容補齊中...
