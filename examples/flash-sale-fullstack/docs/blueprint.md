# Gravito 架構演進藍圖：全生命週期實戰手冊
# Evolutionary Architecture Blueprint: The Full Lifecycle Guide

> **「架構是為了演進，而非一次性定型。」**
> Gravito 框架不只是提供工具，更提供了一套陪著你的專案從 0 成長到 1,000 萬使用者的路徑圖。

---

## 1. 演進三部曲 (The Evolution Path)

本範例 `flash-sale-fullstack` 展示了從傳統開發到極限併發的三個關鍵轉折點：

### 🟢 階段一：快速交付 (Enterprise 3-Tier MVC)
- **核心概念**: 傳統三層式架構，遵循 Laravel / Spring Boot 開發直覺。
- **關鍵組件**: `Controller` + `Service` + `Repository`。
- **目標**: 最小化 Time-to-Market，適合產品初期快速驗證。
- **[👉 閱讀詳細說明：標準 MVC 實作](./evolution/stage-1-mvc.md)**

### 🟡 階段二：維護性優化 (Clean Architecture & ADR)
- **核心概念**: 引入領域驅動設計 (DDD)，將技術分層升級為「業務領域分層」。
- **關鍵組件**: 
    - **ADR 模式**: 拆解肥大控制器為單一職責的 `Action` 與獨立的 `Responder`。
    - **領域核心**: 利用 `Aggregate` (聚合) 與 `Policy` (政策) 模式拆解非線性業務邏輯。
    - **依賴倒置**: 透過 `ServiceProvider` 與容器管理，實現領域與基礎設施的完全解耦。
- **目標**: 解決邏輯僵化問題，確保系統具備長期應對複雜業務變化的能力。
- **[👉 閱讀詳細說明：模組化與 DDD 轉型](./evolution/stage-2-modular.md)**

### 🔴 階段三：高併發擴展 (Distributed Satellite Architecture)
- **核心概念**: 從「模組化單體」演進為「分佈式衛星」，利用物理拆分與分佈式組件武裝系統。
- **關鍵組件**: 
    - **Launchpad**: 將領域模組物理分裂為獨立運行的 `Satellite` (衛星) 服務。
    - **分層快取 (Tiered Cache)**: 結合 **L1 (本地記憶體)** 與 **L2 (Redis)**，兼顧極速與一致性。
    - **併發控制**: 利用 `Plasma` 分佈式鎖防止超賣，透過 `Quasar` 隊列與 `Signal` 事件實現異步削峰。
- **目標**: 支撐秒殺級（10,000+ RPS）併發，實現系統的水平無限擴展與高可用。
- **[👉 閱讀詳細說明：分佈式星系架構](./evolution/stage-3-galactic.md)**

---

## 2. 核心技術規格 (Technical Specs)

- **Runtime**: Bun / Node.js (極速執行環境)
- **Adapter**: Photon / Express (無感切換通訊適配器)
- **Data Layer**: OrbitAtlas (支援多數據庫聯邦與讀寫分離)
- **Observability**: OpenTelemetry + Tracing (全鏈路追蹤與性能監測)
- **Messaging**: Quasar + Signal (基於 Redis/BullMQ 的事件與隊列系統)

---

## 3. 行銷與價值主張 (Value Proposition)

- **不浪費**: Day 1 不需要為昂貴的微服務架構付費，代碼能隨著業務成長自動適配物理形態。
- **低門檻**: 熟悉 MVC 的工程師能在 5 分鐘內上手，並在過程中逐步學會 Clean Architecture。
- **高擴展**: 當秒殺流量來襲時，不需要大規模重構邏輯，只需透過配置即可完成物理拆分與擴展。

---
**Gravito：讓你的架構跟得上你的野心。**
