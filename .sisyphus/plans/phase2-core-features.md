# Phase 2: Core Functionality Completion 執行計畫

## Context

### 原始需求
Gravito Core 改進路線圖的第二階段，專注於填補核心功能缺口：
1. **Core CommandKernel** - 讓 CLI 指令能重用 Web 應用的 Container/Providers
2. **Monolith Search** - ContentManager 的記憶體內全文搜尋
3. **Ripple Binary Support** - WebSocket 二進位資料傳輸支援

---

## 工作目標

### 核心目標
為 Gravito Framework 補齊三項基礎功能，使其具備完整的 CLI 整合、內容搜尋、與即時二進位通訊能力。

### 具體交付物
1. `packages/core/src/CommandKernel.ts` - CLI 命令核心
2. `packages/monolith/src/ContentManager.ts` - 新增 `search()` 方法
3. `packages/ripple/src/types.ts` - 擴展二進位訊息類型
4. `packages/ripple/src/RippleServer.ts` - 處理二進位訊息
5. `packages/ripple-client/src/types.ts` - 客戶端二進位類型
6. `packages/ripple-client/src/RippleClient.ts` - 處理 ArrayBuffer

### 完成定義
- [ ] `CommandKernel.handle(argv)` 可正確解析並執行命令
- [ ] `contentManager.search('query')` 回傳匹配的 ContentItem[]
- [ ] 可透過 WebSocket 傳送/接收 ArrayBuffer 資料

---

## 驗證策略

### 測試決策
- **基礎設施存在**: YES (`bun test`)
- **需要測試**: YES (Tests-after)
- **框架**: `bun test`

---

## TODOs

### Sub-project 1: Core CommandKernel

- [ ] 1.1 定義 CommandKernel 類型介面
  - **File**: `packages/core/src/CommandKernel.ts`
  - **Action**: 定義 `CommandHandler` 類型與 `CommandKernelOptions` 介面。

- [ ] 1.2 實作 CommandKernel 類別
  - **File**: `packages/core/src/CommandKernel.ts`
  - **Action**: 實作 `register` 與 `handle` 方法。

- [ ] 1.3 匯出 CommandKernel
  - **File**: `packages/core/src/index.ts`
  - **Action**: 匯出類別與型別。

### Sub-project 2: Monolith Search

- [ ] 2.1 建立搜尋索引結構
  - **File**: `packages/monolith/src/ContentManager.ts`
  - **Action**: 新增 `searchIndex` 屬性與 `buildSearchIndex` 方法。

- [ ] 2.2 實作 search() 方法
  - **File**: `packages/monolith/src/ContentManager.ts`
  - **Action**: 實作 `search` 方法，支援基本關鍵字過濾。

### Sub-project 3: Ripple Binary Support

- [ ] 3.1 擴展 Server 訊息類型
  - **File**: `packages/ripple/src/types.ts`
  - **Action**: 新增 `binary` 訊息類型定義。

- [ ] 3.2 更新 RippleServer 處理邏輯
  - **File**: `packages/ripple/src/RippleServer.ts`
  - **Action**: 修改 `handleMessage` 判斷 Buffer/ArrayBuffer。

- [ ] 3.3 更新 RippleClient 支援二進位
  - **File**: `packages/ripple-client/src/RippleClient.ts`, `packages/ripple-client/src/types.ts`
  - **Action**: 同步訊息類型，實作 `onmessage` 的 ArrayBuffer 處理。

---

## Success Criteria
- `bun test` 通過所有新增測試。
- `bun run typecheck` 無錯誤。
