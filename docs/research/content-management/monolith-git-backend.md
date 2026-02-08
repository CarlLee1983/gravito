# Monolith Git Backend 技術研究報告

## 1. 背景 (Background)
目前的 `@gravito/monolith` 僅支援本地檔案系統 (`node:fs`)。對於雲原生應用或 Serverless 環境，維護本地檔案較為困難。本研究旨在探討如何實作 Git 型態的內容後端，允許 `ContentManager` 直接從遠端 Git 倉庫（如 GitHub, GitLab）讀取 Markdown 內容。

## 2. 方案分析 (Proposed Solutions)

### 方案 A: 使用 GitHub/GitLab Content API
- **優點**: 無需 clone 整個倉庫，按需抓取。
- **缺點**: 受 API Rate Limit 限制，且需要處理 API Authentication。
- **實作方式**: 封裝 `fetch` 呼叫遠端 REST API。

### 方案 B: Git Sparse Checkout (本地快取)
- **優點**: 讀取效能接近本地檔案。
- **缺點**: 需要底層 Git 工具支援，且佔用伺服器空間。
- **實作方式**: 在啟動時執行 `git clone --sparse`。

### 方案 C: 自定義 ContentDriver 抽象層 (推薦)
將 `ContentManager` 的讀取邏輯抽象化，支援多種驅動。
```typescript
interface ContentDriver {
  read(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  list(dir: string): Promise<string[]>;
}
```

## 3. 介面變動提議 (Interface Changes)

為了支援 Git Backend，`ContentManager` 的構造函數應改為接受一個 `ContentDriver` 實例：

```typescript
// 現有
constructor(public readonly rootDir: string)

// 提議
constructor(private driver: ContentDriver)
```

## 4. 下一步規劃 (Roadmap)
1.  **Refactor**: 將現有的 `fs` 邏輯提取到 `LocalDriver`。
2.  **Implementation**: 實作 `GitHubDriver` (使用 `@octokit/rest`)。
3.  **Integration**: 在 `ContentConfig` 中加入 `driver` 選項。

---
*Created by Gravito Architect.*
