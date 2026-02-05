---
title: Flux Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Flux Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/flux` 的內部架構、狀態機實作以及 Saga 補償機制。

---

## 1. 核心哲學：Platform-Agnostic Workflow Engine

Flux 是 Gravito 的高效能工作流引擎，其設計目標是：
- **Pure State Machine**：核心邏輯不依賴任何特定 Runtime (Node/Bun/Deno)，僅使用 Web Standards API。
- **Saga Pattern**：內建分散式交易的補償機制 (Compensation)，確保系統最終一致性。
- **Durable Execution**：支援執行狀態的持久化，即使伺服器重啟也能從中斷點恢復。

---

## 2. 模組組件分析

### 2.1 FluxEngine (Orchestrator)
- **職責**：協調工作流的執行生命週期。
- **位置**：`src/engine/FluxEngine.ts`
- **機制**：
  - `execute()`: 啟動新工作流。
  - `resume()`: 從持久化狀態恢復執行。
  - `signal()`: 向掛起 (Suspended) 的工作流發送外部信號。
  - **Dependencies**：依賴 `WorkflowExecutor` 執行步驟，依賴 `RollbackManager` 處理失敗。

### 2.2 WorkflowBuilder (Definition DSL)
- **職責**：提供 Fluent API 定義工作流結構。
- **位置**：`src/builder/WorkflowBuilder.ts`
- **特性**：
  - **Type Safety**：利用 TypeScript Generics 確保 Input/Data 在步驟間的型別安全。
  - **Step Types**：
    - `step()`: 一般步驟，可定義 `compensate` 邏輯。
    - `commit()`: 提交步驟，不可回滾，通常是最後的副作用 (Side Effect)。

### 2.3 StateMachine (Lifecycle Guard)
- **職責**：管理工作流狀態轉換。
- **位置**：`src/core/StateMachine.ts`
- **狀態**：`pending` -> `running` -> `completed` / `failed` / `suspended`。
- **驗證**：嚴格限制合法的狀態流轉 (Transitions)，防止邏輯錯誤。

### 2.4 RollbackManager (Saga Engine)
- **職責**：處理失敗時的回滾邏輯。
- **位置**：`src/engine/RollbackManager.ts`
- **演算法**：
  - 當某步驟失敗時，從該步驟往回遍歷 (Reverse Traversal)。
  - 對每個已完成且定義了 `compensate` 的步驟，執行補償邏輯。
  - 狀態變更為 `rolling_back` -> `rolled_back` (成功) 或 `failed` (補償也失敗)。

---

## 3. 技術規格與設計決策

### 3.1 狀態持久化 (Persistence)
Flux 採用「快照式」持久化。
- **觸發點**：每個步驟完成後 (`step_complete`) 或掛起時 (`suspended`)。
- **儲存內容**：`WorkflowContext`，包含 `history` (執行紀錄)、`data` (共用資料)、`currentStep` (指標)。
- **Adapters**：
  - `MemoryStorage`: 測試用。
  - `BunSQLiteStorage`: 基於 Bun 的高效能 SQLite 實作。

### 3.2 暫停與信號 (Suspension & Signals)
Flux 支援長執行 (Long-Running) 流程，例如「等待人工審核」。
- **機制**：
  1. 步驟回傳 `Flux.wait('signal-name')`。
  2. 引擎將狀態設為 `suspended` 並釋放資源 (持久化到 DB)。
  3. 外部系統呼叫 `engine.signal(id, 'signal-name', payload)`。
  4. 引擎恢復狀態，將 Payload 注入該步驟的 Output，並繼續執行下一步。

### 3.3 執行追蹤 (Tracing)
為了視覺化與除錯，Flux 內建了 `TraceEmitter`。
- **Events**：`workflow:start`, `step:start`, `step:complete`, `signal:received` 等。
- **Sink**：支援將 Trace 寫入 JSON 檔案或自定義接收器 (如 OpenTelemetry)。

---

## 4. 潛在風險與效能評估

### 4.1 資料膨脹
若 `ctx.data` 累積大量資料，每次步驟後的持久化 (Serialization + I/O) 開銷會顯著增加。
- **建議**：`ctx.data` 僅儲存 ID 或輕量 Metadata，大物件應存於外部 Storage (如 S3/Redis) 並僅傳遞 Reference。

### 4.2 補償失敗
若 `compensate` 邏輯本身失敗，工作流會進入 `failed` 狀態，且無法自動恢復。
- **處理**：需人工介入 (Human Intervention)。建議補償邏輯必須是 Idempotent (冪等) 且盡可能簡單。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Parallel Steps**：支援 `stepParallel`，同時執行多個獨立任務。
2. **Cron Trigger**：內建基於時間的觸發器，支援排程工作流。

### 中期 (v1.2)
1. **PostgreSQL Adapter**：新增支援 PostgreSQL 的持久化層，支援 `jsonb` 查詢。
2. **Visualizer**：開發 CLI 工具或 Web UI，將 Workflow Definition 視覺化為流程圖 (Mermaid/ReactFlow)。

### 長期 (v2.0)
1. **Cluster Mode**：支援多節點執行，透過 Redis/DB 鎖定機制搶佔任務，實現高可用 (HA)。

---
*Created by Gravito Architect.*


## 快速開始

> 內容補齊中...


## 架構設計

> 內容補齊中...


## API 參考

> 內容補齊中...
