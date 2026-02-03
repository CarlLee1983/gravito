# 📔 Session Record: 2026-02-03 規格大改革與標準化

## 1. 背景與動機

隨著 Gravito 2.0 核心功能的穩定（包括 `GravitoEngineAdapter` 與 `AOTRouter` 的實作），我們發現現有的架構文件在「具體導引」與「跨模組標準」上存在斷層。為了確保企業級開發的嚴謹性，本次會話（Session）進行了全方位的規格修復與擴充。

## 2. 關鍵決策紀錄 (Key Decisions)

### 2.1 確定 Standalone Engine 的 Bun-Only 定位
- **決策**: 明確標註 `GravitoEngine` 為 Bun 原生優化引擎。
- **原因**: 為了追求極致效能，該引擎深度整合了 Bun 的 `fetch` 與 `sql` 特性。若強行支援 Node.js 將導致代碼複雜度急劇增加且效能下降。跨 Runtime 需求應由 `PhotonAdapter` 承載。

### 2.2 強化 UseCase 與 PlanetCore 的綁定
- **決策**: 規範 `UseCase` 應明確注入 `PlanetCore`。
- **原因**: 業務邏輯經常需要調用核心提供的雜湊（Hasher）、掛鉤（Hooks）或日誌（Logger）。透過注入而非全域單例，能大幅提升單元測試的可 Mock 性。

### 2.3 建立數據持久化 (GDPS) 與通訊 (GCCS) 規範
- **決策**: 強制要求跨衛星通訊必須透過掛鉤或事件，嚴禁直接操作資料表。
- **原因**: 解決單體應用中常見的「模組糾纏（Module Tangling）」問題。這是實現 Galaxy Architecture 「核心嚴謹、邊緣靈活」的必要手段。

## 3. 本次會話產出

1.  **文件校準**: `ARCHITECTURE_SPEC.md`, `SATELLITE_SPEC.md`。
2.  **新標準建立**:
    *   `DATA_PERSISTENCE_SPEC.md`: Atlas ORM 企業級規範。
    *   `CROSS_SATELLITE_COMM_SPEC.md`: 跨模組去中心化通訊規範。
    *   `DX_DIAGNOSTIC_SPEC.md`: 測試與診斷標準。
3.  **引導重構**: `GUIDE_2.0_INTEGRATION.md`。
4.  **未來指引**: `FUTURE_ROADMAP_SATELLITE_DX.md`。

## 4. 下一步行動

即將啟動「衛星標準化工程」，首要目標是重構現有的 `membership` 與 `catalog` 衛星以符合最新 GDPS 與 GCCS 規範。

---
*Architect: Antigravity Sisyphus*
