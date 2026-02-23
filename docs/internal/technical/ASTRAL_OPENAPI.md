# Astral Architecture: The OpenAPI Orbit

**Version**: 1.0.2
**Module**: `@gravito/astral`
**Focus**: Schema-driven OpenAPI Generation, Static Export, Swagger UI

---

## 1. 核心設計哲學 (Core Philosophy)

Astral 是 Gravito 的標準文檔 Orbit，旨在實現「Contract-First」開發模式。它透過 Zod 模式直接推斷 API 的輸入與輸出，自動生成符合 OpenAPI 3.x 規範的文檔。

*   **Type Safety**: 基於 Zod，確保文檔與實作程式碼始終同步。
*   **Zero-Copy Generation**: 在運行時直接從路由元數據提取定義，無需手動編寫 YAML。
*   **Dual Mode**: 支援「動態路由渲染」與「靜態 HTML 導出」。

---

## 2. 靜態站點導出 (Static Export)

Astral 支援將 API 規範與 Swagger UI 導出為完全靜態的 HTML/JSON 檔案。

### 優勢
*   **零運行負載**: 無需在每次請求時動態編譯 Schema。
*   **離線支援**: 可選擇將 Swagger UI 的資產 (CSS/JS) 本地化，不依賴外部 CDN。
*   **靈活託管**: 可直接部署至 GitHub Pages 或 S3。

### 使用範例
```typescript
const astralOrbit = OrbitAstral.configure({
  title: 'My static API',
  bundleOfflineAssets: true, 
});

// 在 Build Script 中執行
await astralOrbit.exportStatic(core, './dist/docs');
```

---

## 3. 性能優化 (Optimization)

### 3.1 Pre-bake 模式
在生產環境，可以預先生成 `openapi.json` 並透過 `specFilePath` 配置加載，這能顯著降低應用啟動時間與記憶體開銷。

### 3.2 冷啟動優化
透過內置的 Hash 緩存機制，Astral 僅在合約內容發生變動時重新計算 Schema 片段。

---

## 4. 路由掃描機制 (Route Scanning)

Astral 透過 `RouteScanner` 自動遍歷 `PlanetCore` 中的路由表：
1.  識別與 `Contract` 綁定的路由。
2.  解析 Zod 映射為 JSON Schema。
3.  組合為完整的分層 OpenAPI 定義。
