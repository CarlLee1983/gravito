---
title: Cosmos Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# Cosmos Architecture 技術架構規格書 (v3.1.0)

本文件詳述 `@gravito/cosmos` 的內部架構、國際化 (i18n) 實作機制以及請求範疇 (Request-Scoped) 的設計策略。

---

## 1. 核心哲學：Lightweight & Request-Scoped

Cosmos 是 Gravito 框架的國際化引擎，其設計目標是在高效能與開發體驗之間取得平衡。
- **Request-Scoped State**：採用「全局資源、請求狀態」的分離模式。翻譯資源由全域 Manager 管理，而每個 HTTP 請求擁有獨立的輕量級 Instance 來追蹤當前語言。
- **Type Safety**：利用 TypeScript 的模板文字類型 (Template Literal Types) 實現翻譯鍵值的強型別檢查與自動補全。
- **Lazy Loading**：翻譯檔案僅在需要時從檔案系統載入，顯著降低應用啟動時間與記憶體初始佔用。
- **Performance Optimized**：引入 LRU 快取與並發載入合併機制，解決高效能場景下的瓶頸。

---

## 2. 模組組件分析

### 2.1 OrbitCosmos (Entrypoint)
- **職責**：作為 Orbit 插件，負責初始化與安裝。
- **位置**：`src/index.ts`
- **機制**：
  - 實例化全域單例 `I18nManager`。
  - 註冊 `localeMiddleware` 到 Gravito 核心，攔截所有請求以注入 `i18n` 服務。

### 2.2 I18nManager (Global Resource Hub)
- **職責**：管理所有翻譯資源、快取與配置。
- **位置**：`src/I18nService.ts`
- **關鍵行為**：
  - **Resource Holding**：儲存所有已載入的翻譯包 (`TranslationMap`)。
  - **Caching**：維護解析後的翻譯字串快取 (`locale:key` -> string)，採用 **LRU (Least Recently Used)** 策略防止記憶體洩漏。
  - **Request Coalescing**：透過 `loadingPromises` Map 實現並發請求合併，避免 "Thundering Herd" 問題。
  - **Pluralization**：快取 `Intl.PluralRules` 實例，處理複數邏輯。
  - **Loading**：協調檔案系統讀取 (`loader.ts`)。

### 2.3 I18nInstance (Request Context)
- **職責**：請求層級的介面，持有當前 Locale 狀態。
- **位置**：`src/I18nService.ts`
- **設計模式**：Proxy / Facade。
  - 它本身非常輕量，只包含 `_locale` 字串與對 Manager 的參考。
  - 所有的 `t()` 呼叫最終都委派給 `Manager.translate(this._locale, ...)` 執行。

### 2.4 Locale Detectors (Strategy)
- **職責**：決定請求應使用哪種語言。
- **位置**：`src/I18nService.ts`
- **內建策略**：
  1. `RouteParamDetector`: `:locale` 路徑參數。
  2. `QueryDetector`: `?lang=zh-TW` 查詢參數。
  3. `HeaderDetector`: `Accept-Language` HTTP 標頭。

---

## 3. 技術規格與設計決策

### 3.1 雙層架構 (Manager vs Instance)
Cosmos 選擇不將 Locale 狀態儲存在全域，也不為每個請求複製整個翻譯資源。
- **決策**：`I18nManager` (Singleton) + `I18nInstance` (Transient)。
- **優點**：極低的記憶體開銷。即使有 10,000 個並發請求，也只是創建了 10,000 個包含兩個屬性的輕量物件，而巨大的翻譯字典在記憶體中只有一份。

### 3.2 惰性載入與快取 (Lazy Loading & Caching)
- **Lazy Loading**: `ensureLocale` 方法確保只有在請求該語言時才讀取 JSON 檔。
- **Resolution Cache**: 翻譯鍵值通常是巢狀的 (`auth.errors.invalid_password`)。為了避免每次 `t()` 都進行深層物件屬性查找，Manager 會將解析結果快取：
  - Key: `en:auth.errors.invalid_password`
  - Value: `"Invalid password provided."`
- **效能**：這將翻譯查找的時間複雜度從 O(Depth) 降低到接近 O(1)。

### 3.3 複數處理 (Pluralization)
Cosmos 遵循 `Intl` 標準而非自定義邏輯。
- **機制**：使用原生 `Intl.PluralRules` API。
- **支援**：支援 `zero`, `one`, `other` 以及特定語言的複數規則 (如阿拉伯語的 dual, few, many)。

---

## 4. 潛在風險與效能評估

### 4.1 快取無限增長 (Memory Leak Risk)
- **現況**：✅ 已實作 LRU 快取淘汰機制。
- **機制**：`I18nManager` 使用 `lru-cache` 限制翻譯字串的快取數量，確保記憶體佔用可控。

### 4.2 並發載入 (Thundering Herd)
- **現況**：✅ 已實作 Request Coalescing。
- **機制**：`ensureLocale` 會檢查 `loadingPromises`，若該語言正在載入中，則返回現有的 Promise，確保檔案系統僅被讀取一次。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Loading Coalescing**：修復並發載入問題，確保同一語言的檔案讀取 Promise 被共用。
2. **LRU Cache**：為翻譯結果快取引入 LRU 機制，防止記憶體過度膨脹。

### 中期 (v1.2)
1. **Remote Backend**：支援從遠端 CMS (如 Contentful) 或資料庫載入翻譯，而不僅限於檔案系統。
2. **HMR Support**：在開發模式下支援翻譯檔案的熱重載 (Hot Module Replacement)。

### 長期 (v2.0)
1. **Edge Compatible**：移除對 Node.js `fs` 模組的硬依賴，改用與 Edge Runtime (Workers/Vercel) 相容的載入介面。

---
*Created by Gravito Architect.*
