# Changelog

## 0.2.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

本專案的所有重要變更都會記錄在此文件中。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### 待實作功能

- 虛擬滾動優化（支援 10000+ 訊息）
- 離線訊息同步
- 跨 Tab 狀態同步
- E2E 測試套件
- React 記憶化優化
- 完整的單元測試覆蓋（目標 80%+）

## [0.2.0] - 2026-01-27

### Added - 新增功能

#### Phase 1: 核心功能完成

- ✅ **完整的 TypeScript 類型定義系統**

  - 50+ 個類型和介面定義
  - 無任何 `any` 類型
  - 完整的 JSDoc 註解（繁體中文）

- ✅ **API 整合層** (`src/api/supportApi.ts`)

  - 會話管理（建立、取得）
  - 訊息發送與接收
  - 分頁載入歷史訊息
  - 完整的錯誤處理
  - 12 個單元測試，全部通過

- ✅ **WebSocket 實時通信** (`src/hooks/useWebSocket.ts`)

  - 整合 `@gravito/ripple-client`
  - 連線狀態管理
  - 頻道訂閱與監聽
  - 自動重連機制（指數退避）
  - 組件卸載時自動清理

- ✅ **訊息管理 Hook** (`src/hooks/useMessages.ts`)

  - 樂觀更新（Optimistic UI）
  - 分頁載入
  - 錯誤處理與重試
  - 發送失敗時本地標記

- ✅ **錯誤處理機制**
  - `useErrorHandler` Hook
  - `ErrorBoundary` 組件
  - 統一的錯誤處理和恢復

#### Phase 2: 程式碼品質提升

- ✅ **組件拆分**（9 個獨立組件）

  - `ChatWidget` - 主容器
  - `ChatHeader` - 標題列
  - `ChatMessages` - 訊息列表
  - `ChatMessage` - 單一訊息氣泡
  - `ChatInput` - 輸入區域
  - `ChatTrigger` - 觸發按鈕
  - `ContextBanner` - 上下文橫幅
  - `ConnectionStatus` - 連線狀態指示
  - `ErrorBoundary` - 錯誤邊界

- ✅ **安全性強化**

  - 輸入驗證（使用 Zod）
  - XSS 防護（HTML 清理）
  - 安全的 localStorage 封裝
  - URL 清理

- ✅ **工具函數**
  - `cn` - className 合併工具（7 個測試）
  - `secureStorage` - 安全存儲（12 個測試）
  - `validateMessageContent` - 訊息驗證
  - `sanitizeHtml` - HTML 清理

### Changed - 變更

- 重構原有的單一檔案實作為模組化架構
- 採用 immutability 原則（無直接 mutation）
- 使用 TypeScript strict mode

### Fixed - 修復

- 修復原有的 `any` 類型問題
- 修復 WebSocket 連線未使用的問題
- 修復 API 端點未呼叫的問題

### Dependencies - 依賴變更

#### Added

- `zod` ^3.23.0 - 輸入驗證
- `@testing-library/react` ^16.0.1 - React 測試
- `@testing-library/jest-dom` ^6.6.3 - Jest DOM 匹配器
- `@vitest/coverage-v8` ^2.1.8 - 測試覆蓋率
- `vitest` ^2.1.8 - 測試執行器
- `happy-dom` ^15.11.6 - DOM 環境

## [0.1.0] - 2026-01-XX

### Added

- 基本 UI 實現
- 本地狀態管理
- 基礎樣式（Tailwind CSS）
- Lucide React 圖標

### Known Issues - 已知問題

- WebSocket 未實現
- API 未整合
- 訊息不持久化
- 無測試覆蓋

---

## 版本規範

- **Major (X.0.0)** - 不相容的 API 變更
- **Minor (0.X.0)** - 向下相容的功能新增
- **Patch (0.0.X)** - 向下相容的問題修復

## 連結

- [主專案](https://github.com/gravito-framework/gravito)
- [問題追蹤](https://github.com/gravito-framework/gravito/issues)
