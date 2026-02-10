# Gravito 技術亮點：為下一代企業級應用而生
# Gravito Technical Highlights: Built for Next-Gen Enterprise Applications

Gravito 不僅是一個框架，它是一套針對「業務成長性」與「極限效能」設計的生態系統。以下是 Gravito 的核心技術亮點：

---

### 🌌 1. 演進式星系架構 (Evolutionary Galaxy Architecture)
**核心價值：開發時保有單體的簡單，運行時擁有分佈式的強大。**

- **無痛擴張路徑**：支持專案從 **Stage 1 (MVC)** 到 **Stage 2 (Modular/DDD)** 再到 **Stage 3 (Distributed Satellites)** 的平滑演進。你不需要在專案初期就決定是否使用微服務，系統能隨流量自動分裂。
- **衛星設計 (Satellites)**：業務邏輯被封裝在自洽的「衛星」中，具備自我治理能力，且能透過 `Launchpad` 一鍵實現物理拆分與部署。
- **行星核心 (PlanetCore)**：極致輕量化的微內核，負責生命週期、Hooks 與 IoC 容器，確保全系統的規範統一。

### ⚡ 2. 高併發與極限效能 (High-Performance Infrastructure)
**核心價值：支撐秒殺級流量的「抗壓性」。**

- **分層快取策略 (Tiered Cache)**：
    - **L1 (In-Memory)**：本地記憶體快取，讀取延遲趨近於 0，消除 90% 的重複網絡開銷。
    - **L2 (Redis)**：分佈式快取，確保多實例環境下的全局狀態一致性。
- **分佈式原子鎖 (Plasma Lock)**：基於 Redis 的高性能鎖機制，徹底解決高併發下的「超賣」與競爭問題。
- **非同步削峰 (Quasar Queue)**：基於 BullMQ 的高性能隊列，將流量衝擊轉化為平穩的背景處理。
- **異步事件驅動 (Signal Signal)**：全系統事件總線，實現衛星之間的解耦通訊與最終一致性。

### 🛠️ 3. 卓越的開發體驗 (Unmatched Developer Experience)
**核心價值：讓複雜的架構變得「觸手可及」。**

- **ADR 模式實踐**：預設採用 Action-Domain-Responder 模式，解決傳統 Controller 肥大問題，讓程式碼更具備可讀性與測試性。
- **型別安全 (Type Safety)**：全鏈路 TypeScript 支持，從路由、配置到資料庫模型，提供極致的開發補完。
- **適配器設計 (Agnostic Adapters)**：通訊層與存取層完全解耦，你可以無縫切換 `Photon (Bun)` 或 `Express (Node)`。
- **一鍵腳手架**：透過 `create-gravito-app` 與 CLI，快速生成符合 Clean Architecture 規範的衛星代碼。

### 🛡️ 4. 企業級穩定性 (Production Readiness)
**核心價值：開箱即用的「可觀測性」與「安全性」。**

- **原生追蹤 (OpenTelemetry)**：內建 OTel 支援，開箱即得全鏈路追蹤、指標監測與日誌。
- **嚴謹的領域邊界**：透過 ServiceProvider 與 Container 管理，強制執行「領域隔離」，防止代碼陷入硬耦合泥潭。
- **自動化遷移與版本控制**：`OrbitAtlas` 提供完善的資料庫遷移與聯邦管理工具。

---

## 總結
Gravito 的核心優勢在於 **「架構的自由度」**。它讓開發者在 Day 1 享有單體開發的快感，在 Day 100 擁有支撐百萬級流量的底氣。

> **Gravito：讓你的架構跟得上你的野心。**
