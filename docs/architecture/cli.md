---
title: Orbit Pulse (CLI) Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Orbit Pulse (CLI) Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/pulse` (CLI) 的內部架構、命令調度機制以及 Scaffolding 系統設計。

---

## 1. 核心哲學：Developer Experience (DX) First

Orbit Pulse 受到 Laravel Artisan 的啟發，旨在提供一個統一的命令列介面，管理 Gravito 專案的生命週期。其核心哲學：
- **統一入口**：所有開發、測試、部署任務皆透過 `gravito` 命令觸發。
- **模板驅動**：利用強大的模板引擎 (Stubs) 生成標準化程式碼。
- **交互式引導**：提供豐富的 TUI (Terminal UI) 體驗，降低新手門檻。

---

## 2. 模組組件分析

### 2.1 Entrypoint (Launcher)
- **職責**：啟動 CLI 應用，註冊全局錯誤處理。
- **位置**：`bin/gravito.mjs` -> `src/index.ts`
- **技術棧**：
  - `cac`：命令列參數解析與幫助文檔生成。
  - `@clack/prompts`：現代化的交互式提示組件。

### 2.2 Command Registry
- **職責**：註冊並分發子命令。
- **位置**：`src/index.ts`
- **主要命令組**：
  - **Scaffolding**: `make:controller`, `make:model` 等，由 `MakeCommand` 處理。
  - **Project Init**: `create`，負責專案初始化與模板下載。
  - **Database**: `migrate`, `db:seed`，整合 Atlas ORM。
  - **DevOps**: `doctor`, `upgrade`, `maintenance`。

### 2.3 MakeCommand (Scaffolding Engine)
- **職責**：基於 Stub 生成檔案。
- **位置**：`src/commands/MakeCommand.ts`
- **流程**：
  1. **Resolve Stub**：根據執行環境 (Dev/Prod) 尋找 `stubs/` 目錄。
  2. **Normalize Name**：將使用者輸入轉換為 PascalCase/camelCase。
  3. **Variable Replacement**：替換 Stub 中的 `Name` 佔位符。
  4. **Write File**：寫入目標路徑，防止覆蓋現有檔案。

### 2.4 Project Initialization (Create Command)
- **職責**：從遠端模板庫拉取專案骨架。
- **位置**：`src/index.ts` -> `create` action
- **機制**：
  - 使用 `giget` 下載 GitHub 倉庫模板。
  - **Skill Injection**：支援將特定功能模組 (Skills) 注入到 `src/` 或 `.skills/` 目錄。
  - **Profile Resolution**：根據選擇的 Profile (Core/Scale/Enterprise) 生成 `gravito.lock.json`。

---

## 3. 技術規格與設計決策

### 3.1 為什麼選擇 CAC 而非 Commander/Yargs？
- **輕量級**：CAC 體積極小，啟動速度快。
- **類型友善**：更好的 TypeScript 支援。
- **簡潔 API**：語法類似 Commander 但更現代。

### 3.2 Stub 系統設計
Orbit Pulse 採用基於文字替換的簡單模板系統，而非複雜的 EJS/Handlebars。
- **優點**：Stub 檔案本身就是合法的 TypeScript 代碼 (在大多數情況下)，易於維護與閱讀。
- **限制**：不支援複雜的條件邏輯 (Loops/Ifs)，這部分邏輯被移至 TypeScript 代碼 (`MakeCommand`) 中處理。

### 3.3 Skill Injection 機制
這是一個獨特的設計，允許在初始化時動態組合功能。
- **定義**：在 `TEMPLATE_SKILLS` 對應表中定義模板所需的 Skills。
- **來源**：優先查找本地 `.skills/` (Monorepo 開發模式)，否則從 GitHub 下載。
- **用途**：例如 `static-site-generator` skill 包含了 SSG 所需的額外腳本與配置。

---

## 4. 潛在風險與效能評估

### 4.1 模板版本同步 (Template Drift) ✅ 已處理
CLI 與 Templates 分開維護可能導致版本不一致。
- **風險**：新版 CLI 生成的專案依賴舊版 Core，或反之。
- **緩解 (已實作)**：`create` 命令在生成 `package.json` 時會自動移除 `^` 等動態版本前綴，強制鎖定 `@gravito/*` 的精確版本。

### 4.2 依賴解析複雜度 ✅ 已補強
`ProfileResolver` 負責根據 Profile 計算依賴樹，這部分邏輯較為隱晦。
- **風險**：若配置錯誤，可能導致生成的專案缺少關鍵依賴。
- **緩解 (已實作)**：整合 `DependencyValidator` 在生成過程中自動校對依賴完整性，若偵測缺失則主動提示安裝命令。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. [x] **外掛系統 (Plugin System)**：允許第三方開發者註冊自定義命令 (如 `gravito my-plugin:run`)。(v1.1 已實作)
2. [x] **Stub 自定義**：允許使用者在專案根目錄建立 `stubs/` 來覆蓋預設模板。(v1.1 已實作)

### 中期 (v1.2)
1. [x] **Interactive Make**：`make:*` 命令若缺少參數，自動進入交互模式詢問。(v1.2 已實作)

### 長期 (v2.0)
1. **GUI Dashboard**：提供基於 Web 的專案管理介面 (`gravito ui`)，可視化執行命令與監控狀態。

---
*Created by Gravito Architect.*
