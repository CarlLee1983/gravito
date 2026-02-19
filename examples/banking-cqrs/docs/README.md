# Banking CQRS Example Documentation

本文件庫包含了 Banking CQRS 範例專案的所有技術文件。

## 📚 快速開始 (Guides)

- **[快速入門 (Getting Started)](./guides/getting-started.md)**  
  5 分鐘快速上手，包含安裝、運行與 API 測試。

- **[開發工作流 (Development Workflow)](./guides/workflow.md)**  
  從需求分析、Event Storming 到程式碼實作的完整 DDD 開發流程。

- **[測試指南 (Testing Guide)](./guides/testing.md)**  
  包含單元測試、整合測試策略與測試覆蓋率報告。

## 🏗️ 核心概念 (Concepts & Architecture)

- **[架構總覽 (Architecture)](./concepts/architecture.md)**  
  專案結構、分層職責、Controller-Action 模式、Smart Validation 與 Query Caching 機制。

- **[DDD 概論 (DDD Overview)](./concepts/ddd-overview.md)**  
  深入解析 Aggregate Root, Entity, Value Object 等核心 DDD 概念。

- **[CQRS 實作 (CQRS Implementation)](./concepts/cqrs.md)**  
  命令查詢職責分離模式 (Command Query Responsibility Segregation) 的實作細節。

- **[戰略設計 (Strategic Design)](./concepts/strategic-design.md)**  
  Bounded Context (界限上下文) 與 Context Mapping (上下文映射)。

- **[戰術模式 (Tactical Patterns)](./concepts/tactical-patterns.md)**  
  詳細介紹 Aggregate, Entity, Value Object, Repository 與 Domain Event 的實作模式。

- **[事件風暴 (Event Storming)](./concepts/event-storming.md)**  
  如何透過 Event Storming 挖掘需求並轉化為領域模型。

- **[不變量 (Invariants)](./concepts/invariants.md)**  
  業務規則的守護者：如何在 Aggregate 中維護資料一致性。

## 📊 審查報告 (Reports)

- **[2026-02-17 架構審查](./reports/2026-02-17-architecture-review.md)**  
  針對 Banking CQRS 專案的全面架構審查報告，包含優缺點分析與改善建議。
