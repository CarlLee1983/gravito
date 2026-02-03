# 🚀 Gravito Satellite DX & Standardization Roadmap (2026 Q1-Q2)

本文件定義了在完成 2.0 核心規格制定後，Gravito 生態系針對衛星模組（Satellites）的開發者體驗（DX）優化與標準化路徑。

## 1. 衛星模組全面標準化 (The Great Refactoring)

**目標**: 確保所有官方衛星模組符合 `SATELLITE_SPEC.md` 與 `GDPS.md` 規範。

- [ ] **目錄結構重整**: 將 `catalog`, `payment`, `order` 等衛星模組重構為標準的 `Domain`, `Application`, `Infrastructure`, `Interface` 四層結構。
- [ ] **UseCase 抽離**: 消除 Controller 中的業務邏輯，確保每個動作（Action）都有對應的 `UseCase` 類別。
- [ ] **依賴注入優化**: 實作 `UseCase` 與 `PlanetCore` 的標準注入模式，減少模組內的 `c.get()` 散落。

## 2. 跨衛星通訊解耦 (Decoupling Initiative)

**目標**: 實作 `GCCS.md` 規範，消除硬編碼依賴。

- [ ] **Hook 命名空間治理**: 全面盤點現有的 `Action` 與 `Filter`，統一為 `namespace:action` 格式。
- [ ] **Event Schema 驗證**: 於 `OrbitSignal` 中引入 Payload 結構驗證機制，確保跨模組通訊的契約（Contract）穩定。
- [ ] **斷路器整合**: 針對跨衛星的異步調用實作失敗重試與回退（Fallback）機制。

## 3. 自動化診斷工具實作 (The "Doctor" Command)

**目標**: 將 `GDXS.md` 中的診斷標準轉化為 CLI 工具。

- [ ] **`gravito doctor`**: 檢測當前項目的 Orbit 配置、環境變數與 Bun Runtime 兼容性。
- [ ] **`gravito check:schema`**: 自動對比 Atlas Model 屬性與資料庫實體欄位，生成漂移報告。
- [ ] **N+1 靜態分析器**: 開發一個簡單的分析工具或 Linter 規則，檢測在 `UseCase` 循環中調用 Repository 的行為。

## 4. 企業級持久化增強

**目標**: 深化 `GDPS.md` 在複雜業務場景的應用。

- [ ] **Eager Loading 覆蓋率**: 確保所有跨衛星 Repository 方法預設支援 `with()`。
- [ ] **樂觀鎖標準化**: 在所有高頻交易相關的 Model 中強制啟用 `version` 欄位。
- [ ] **分庫分表支援 (Sharding)**: 研究並設計 `OrbitAtlas` 的分片擴展規格。

---
*Created by Gravito Architecture Team | 2026-02-03*
