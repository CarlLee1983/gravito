---
title: Cosmos Architecture 技術架構規格書
version: 1.2.0
status: Stable
tier: C
last_updated: 2026-01-31
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

### 2.5 Translation Loaders (Abstraction Layer) ⭐ v3.1.0 新增
- **職責**：抽象化翻譯資源的載入機制,支援多種來源。
- **位置**：`src/loaders/`
- **關鍵組件**：
  - **TranslationLoader 介面**：定義統一的載入介面。
  - **FileSystemLoader**：從本地檔案系統載入 JSON 翻譯檔案。
  - **RemoteLoader**：從遠端 HTTP API 載入翻譯,支援 ETag 快取與重試機制。
  - **ChainedLoader**：組合多個載入器,實現降級策略(本地 → 遠端 → 默認)。

### 2.6 HMR Watcher ⭐ v3.1.0 新增
- **職責**：在開發模式下監視翻譯檔案變更並自動重新載入。
- **位置**：`src/HMRWatcher.ts`
- **機制**：
  - 使用 Node.js `fs.watch()` 監視翻譯目錄。
  - 支援防抖機制,避免短時間內多次觸發重新載入。
  - 自動調用 `I18nManager.reloadLocale()` 重新載入變更的語言。

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

## 5. 新增功能 (v3.1.0) ⭐

### 5.1 TranslationLoader 抽象層
Cosmos 現在支援抽象化的翻譯載入機制,允許從多種來源載入翻譯資源:

```typescript
import { FileSystemLoader, RemoteLoader, ChainedLoader } from '@gravito/cosmos'

// 組合多個載入器,實現降級策略
const config: I18nConfig = {
  defaultLocale: 'zh-TW',
  supportedLocales: ['zh-TW', 'en'],
  loaders: [
    new FileSystemLoader({ baseDir: './lang' }),
    new RemoteLoader({
      url: 'https://api.example.com/i18n/:locale',
      headers: { 'Authorization': 'Bearer token' },
      etagCache: true,
      retries: 3
    })
  ]
}
```

**主要特性**：
- 支援檔案系統、遠端 HTTP API、或自訂載入器
- 鏈式組合,實現多層降級策略
- RemoteLoader 支援 ETag 快取優化、自動重試、超時處理
- 完全向後相容舊的 `lazyLoad.loader` 配置

### 5.2 熱重載 (HMR) 支援
在開發模式下,翻譯檔案的變更會自動被檢測並重新載入:

```typescript
const config: I18nConfig = {
  defaultLocale: 'zh-TW',
  supportedLocales: ['zh-TW', 'en'],
  loaders: [new FileSystemLoader({ baseDir: './lang' })],
  hmr: {
    enabled: process.env.NODE_ENV === 'development',
    watchDirs: ['./lang'],
    debounce: 300,
    verbose: true
  }
}
```

**主要特性**：
- 自動監視翻譯檔案變更
- 防抖機制,避免頻繁觸發重新載入
- 僅影響變更的語言,不會清空整個快取
- 可配置的副檔名篩選和監視目錄

### 5.3 reloadLocale API
新增 `reloadLocale()` 方法,支援手動重新載入特定語言:

```typescript
// 手動重新載入某個語言
await i18nManager.reloadLocale('zh-TW')

// 也可以在自訂邏輯中使用
app.post('/admin/reload-i18n/:locale', async (c) => {
  const locale = c.req.param('locale')
  await c.get('i18n').manager.reloadLocale(locale)
  return c.json({ success: true })
})
```

---

## 6. 後續優化建議

### 短期 (v1.1) ✅ 已完成
1. ✅ **Loading Coalescing**：修復並發載入問題，確保同一語言的檔案讀取 Promise 被共用。
2. ✅ **LRU Cache**：為翻譯結果快取引入 LRU 機制，防止記憶體過度膨脹。

### 中期 (v1.2) ✅ 已完成
1. ✅ **Remote Backend**：支援從遠端 CMS (如 Contentful) 或資料庫載入翻譯 (透過 RemoteLoader)。
2. ✅ **HMR Support**：在開發模式下支援翻譯檔案的熱重載 (透過 HMRWatcher)。

### 長期 (v2.0) 🚧 規劃中
1. **Edge Compatible**：移除對 Node.js `fs` 模組的硬依賴，改用與 Edge Runtime (Workers/Vercel) 相容的載入介面。
   - 建立 EdgeLoader 類別
   - 支援 Cloudflare Workers KV、Vercel KV 等儲存方案
   - 條件化導出,根據環境自動選擇合適的實現

2. **資料庫載入器**：支援從 PostgreSQL、MongoDB 等資料庫載入翻譯。

3. **WebSocket 實時推送**：支援翻譯變更的實時推送,無需重新載入。

---
*Created by Gravito Architect. Last updated: 2026-01-31*
