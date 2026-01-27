# 🌌 Ion (Orbit Inertia) Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/ion` 的內部架構、Inertia.js 協議實作以及與 `OrbitPrism` 的協同工作模式。

---

## 1. 核心哲學：Modern Monolith

Ion 是 Gravito 實現 "Modern Monolith" 架構的關鍵組件。它通過伺服器端路由與控制器驅動前端 SPA，消除了傳統前後端分離架構中 80% 的 API 開發工作量。

### 關鍵設計原則
- **Protocol Adherence**：嚴格遵循 Inertia.js 協議規範，確保與官方客戶端（React/Vue/Svelte）的完美兼容。
- **View Layer Agnostic**：雖然依賴 `OrbitPrism` 進行根模板渲染，但 Ion 本身不關心具體的前端框架。
- **Performance First**：透過 `InertiaService` 實作高效的 Props 解析與序列化，並支援 Lazy Props 以減少不必要的資料庫查詢。

---

## 2. 模組組件分析

### 2.1 OrbitIon (Entrypoint)
- **職責**：作為 Orbit 插件，負責註冊中間件與服務。
- **位置**：`src/index.ts`
- **機制**：
  - 在 `core.adapter` 中註冊全域中間件，攔截所有請求。
  - 為每個請求實例化 `InertiaService`。
  - 將 `InertiaHelper` 注入到 Context (`ctx.get('inertia')`)，並透過 `Object.assign` 與 `Proxy` 模式提供類似函數的調用體驗。

### 2.2 InertiaService (Core Engine)
- **職責**：處理 Inertia 協議的核心邏輯。
- **位置**：`src/InertiaService.ts`
- **關鍵流程**：
  1. **Detection**：檢查 `X-Inertia` 標頭以區分 AJAX 請求與首次載入。
  2. **Props Resolution**：合併 Shared Props 與 Page Props，解析 Lazy Props (Functions)。
  3. **Response Generation**：
     - **Inertia Request**：回傳 JSON，包含 `component`, `props`, `url`, `version`。
     - **Initial Load**：調用 `ViewService` (Prism) 渲染根 HTML，並將序列化後的 Page Data 注入到 `data-page` 屬性。

### 2.3 InertiaHelper (DX Interface)
- **職責**：提供開發者友善的 API。
- **定義**：`src/index.ts`
- **特性**：它是一個可被調用的物件 (Callable Object)，既可以像函數一樣使用 (`inertia('Home', {})`)，也可以存取方法 (`inertia.share(...)`)。

---

## 3. 技術規格與設計決策

### 3.1 為什麼依賴 OrbitPrism？
Inertia 需要一個後端模板引擎來渲染首次載入的 HTML (包含 `<head>`, `<script>` 等資源)。
- **決策**：不重複造輪子，直接使用 Gravito 生態中的視圖引擎 `OrbitPrism`。
- **解耦**：Ion 透過 `ctx.get('view')` 獲取 View Service，這意味著理論上可以替換為其他實現了 `ViewService` 介面的 Orbit。

### 3.2 Lazy Props 實作
Inertia 支援 Partial Reloads，允許前端僅請求部分數據。
- **機制**：
  - 開發者傳入 `Function` 作為 Prop 值。
  - `InertiaService` 在渲染時檢查請求的 `X-Inertia-Partial-Data` 標頭。
  - 若 Prop 是 Lazy 的且未被請求，則跳過執行；否則執行函數獲取結果。
  - **注意**：目前的實作 (`resolveProps`) 尚未完全支援 Partial Reload 的過濾邏輯，這是 v1.1 的重點優化項目。

### 3.3 HTML 屬性轉義
為了防止 XSS 攻擊並確保 JSON 在 HTML 屬性中正確解析，`escapeForSingleQuotedHtmlAttribute` 執行了嚴格的轉義。
- **策略**：將所有特殊字符 (`&`, `"`, `<`, `>`, `'`) 轉換為 HTML 實體。這確保了即使 Props 中包含惡意腳本，瀏覽器也只會將其視為數據。

---

## 4. 潛在風險與效能評估

### 4.1 序列化開銷 (Serialization Overhead)
`JSON.stringify` 是 CPU 密集型操作。若 Props 包含大量數據，會顯著增加 Event Loop 的延遲。
- **風險**：大型列表渲染可能導致 Node.js 主線程阻塞。
- **建議**：對於大數據集，應在 Controller 層進行分頁或摘要，避免直接傳遞巨大的 ORM 物件。

### 4.2 循環引用 (Circular References)
由於 `JSON.stringify` 不支援循環引用，若傳入的 Props 包含循環結構 (常見於 ORM 關聯)，會拋出錯誤。
- **處理**：`InertiaService` 會捕獲此錯誤並拋出 `SERIALIZATION_FAILED`，並提供除錯提示。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Partial Reloads 完整支援**：實作 `only` 與 `except` 邏輯，真正跳過未請求的 Lazy Props 執行。
2. **SSR 支援**：整合 `Inertia.js Server`，支援在後端預渲染 React/Vue 組件為 HTML 字串，提升 SEO 與首屏速度。

### 中期 (v1.2)
1. **Asset Versioning 自動化**：與 Vite Manifest 整合，自動計算資源雜湊值作為 Inertia Version，實現無縫的緩存更新。

### 長期 (v2.0)
1. **Islands Architecture**：探索與 Astro 或類似技術的結合，允許部分頁面使用 Inertia，部分使用靜態 HTML。

---
*Created by Gravito Architect.*
