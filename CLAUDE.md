# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

Gravito 是一個模組化、高效能的 TypeScript 框架，基於 **Galaxy Architecture** 建構，包含：
- **PlanetCore**：微核心（hooks、IoC 容器、生命週期管理）
- **Orbits**：核心模組（Database、Auth、Event Bus）
- **Satellites**：業務領域外掛（Catalog、Membership、Commerce 等）

這是一個 **monorepo**，使用 Turbo、Bun、Biome 進行管理。

## 快速命令

### 建構與發佈

```bash
# 全量構建
bun run build

# 個別包構建
cd packages/<package-name>
bun run build

# 類型檢查
bun run typecheck

# 完整類型檢查（強制）
bun run typecheck:full
```

### 測試

```bash
# 執行所有測試
bun run test

# 執行測試覆蓋率報告
bun run test:coverage

# CI 模式測試
bun run test:ci

# 執行單一測試檔案
cd packages/<package-name>
bun test tests/specific.test.ts
```

### 程式碼品質

```bash
# Lint 檢查
bun run lint

# 修復 lint 問題
bun run check:fix

# 格式化代碼
bun run format

# 完整檢查（含格式化檢查）
bun run check
```

### 版本管理與發佈

```bash
# 檢查版本一致性
bun run version:check

# 驗證文檔
bun run docs:validate

# 變更集管理
bun run changeset

# CI 模式版本更新
bun run ci:version

# 發佈（CI 模式）
bun run ci:publish

# Beta 發佈
bun run pub:beta

# Snapshot 發佈
bun run pub:snapshot
```

## 專案結構

### Monorepo 組織

```
gravito-core-ci-fix/
├── packages/              # 核心框架包
│   ├── core/              # PlanetCore（微核心、hooks、container）
│   ├── photon/            # HTTP 引擎（基於 Hono）
│   ├── atlas/             # ORM（資料庫、遷移）
│   ├── signal/            # 事件總線
│   ├── stream/            # 流處理
│   ├── astral/            # 高級功能
│   ├── monolith/          # 整合層
│   └── ... 約 50+ 個核心包
├── satellites/            # 業務領域外掛
│   ├── catalog/           # 商品管理
│   ├── membership/        # 用戶與認證
│   ├── commerce/          # 訂單管理
│   ├── payment/           # 支付
│   ├── analytics/         # 分析
│   └── ... 約 13 個 satellite
├── templates/             # 專案模板
├── examples/              # 使用範例
└── scripts/               # 工具腳本
```

### 核心包依賴關係

**Foundation Layer（基礎層）**：
- `@gravito/core` ← PlanetCore（所有包的基礎）
- `@gravito/photon` ← HTTP 引擎（基於 Hono）
- `@gravito/atlas` ← ORM + 資料庫遷移
- `@gravito/signal` ← 事件總線

**Advanced Packages（進階包）**：
- `@gravito/stream` ← 流處理與優化
- `@gravito/astral` ← 高級特性（v1.1 最佳化）
- `@gravito/enterprise` ← 企業級功能
- `@gravito/monolith` ← 整合層

**Satellites（業務層）**：
- 每個 satellite 都依賴 `core`、`atlas`、`signal` 等核心包

### 包命名約定

- `@gravito/<name>` = npm 發佈的核心包
- `@gravito/satellite-<domain>` = 業務領域外掛（不透過 npm，workspace 依賴）
- `@gravito/admin-ui-*` = 後台管理 UI（React）

## TypeScript 配置

### 路徑別名（tsconfig.base.json）

```typescript
"paths": {
  "@gravito/core": ["packages/core/src/index.ts"],
  "@gravito/core/*": ["packages/core/src/*"],
  "@gravito/atlas": ["packages/atlas/src/index.ts"],
  // ... 每個主要包都有對應的別名
}
```

### 嚴格檢查設定

- `noUnusedLocals: true` - 禁止未使用的局部變數
- `noUnusedParameters: true` - 禁止未使用的參數
- `noImplicitReturns: true` - 要求顯式 return
- `noFallthroughCasesInSwitch: true` - switch 必須有 break

## 程式碼品質工具

### Biome（格式化與 Lint）

- **線寬**：100 字元
- **縮排**：2 個空格
- **分號**：不需要（asNeeded）
- **引號**：單引號（除 JSX 用雙引號）
- **尾隨逗號**：ES5 風格

**特殊規則**：
- GraphQL 包：強制 `noExplicitAny: error`
- HTML/CSS 檔案：禁用 lint
- Vue/Svelte：允許未使用變數

### Turbo 快取策略

```json
{
  "build": { "dependsOn": ["^build"], "inputs": ["src/**", "package.json", "tsconfig.json"] },
  "test": { "dependsOn": [], "inputs": ["src/**", "tests/**", "package.json", "tsconfig.json"] },
  "typecheck": { "dependsOn": ["^build"] }
}
```

## 測試框架

### Bun Test

- 使用 Bun 內建測試框架（類似 Jest 語法）
- 測試檔案：`*.test.ts` 或 `*.spec.ts`
- 測試位置：`packages/<name>/tests/` 或 `satellites/<name>/tests/`

### 最低覆蓋率要求

- 大多數包：75% 覆蓋率
- 某些核心包：可能更高

### 執行特定測試

```bash
# 執行單一包的測試
cd packages/core
bun test

# 執行特定測試檔案
bun test tests/application.test.ts

# 含覆蓋率
bun test --coverage --coverage-threshold=75
```

## 開發工作流程

### 1. 修改代碼

在 `packages/<name>/src` 或 `satellites/<name>/src` 中修改 TypeScript 代碼。

### 2. 本地驗證

```bash
# 類型檢查
bun run typecheck

# 格式化檢查
bun run check

# 測試
cd packages/<modified-package>
bun test
```

### 3. Git Hooks（自動執行）

- **pre-commit**：`lint-staged` + `biome check --write`
- **pre-push**：`validate-affected-packages.ts`（驗證受影響包的構建）

### 4. Commit Message 格式

遵循 [CONTRIBUTING.md](./CONTRIBUTING.md) 的約定，使用繁體中文台灣用語：

```
feat: [模組名] 功能描述
fix: 修正 XXX 問題
refactor: 重構 XXX 模組
docs: 更新文檔
test: 增加 XXX 測試
```

## 特殊腳本

### 有用的工具腳本

```bash
# 驗證受影響包（避免循環依賴）
bun run scripts/validate-affected-packages.ts

# 檢查版本一致性
bun run scripts/check-versions.ts

# 生成依賴圖
bun run scripts/generate-dependency-graph.ts

# 驗證文檔
bun run scripts/validate-docs.ts

# 檢查 TypeScript 配置
bun run scripts/check-typecheck-config.ts
```

### CI 模擬（本地）

```bash
# 直接執行 CI 測試
bun run ci:test

# 使用 act（需要 Docker）
bun run ci:test:act
```

## 常見開發任務

### 向核心包添加新功能

1. 在 `packages/<name>/src` 中創建實作
2. 在 `packages/<name>/tests` 中添加測試
3. 執行 `bun run typecheck && bun test`
4. 驗證其他依賴此包的包仍可正常構建

### 添加新 Satellite（業務外掛）

1. 在 `satellites/<domain>/` 中創建 package
2. 配置 `package.json`（workspace 依賴）
3. 實作領域邏輯
4. 在 `gravito.config.ts` 中註冊

### 修改跨包依賴

修改 `packages/*/package.json` 中的 workspace 依賴，然後：

```bash
bun install
bun run typecheck  # 驗證所有依賴解析正確
bun run build      # 驗證構建
```

## 常見問題排查

### 循環依賴

使用 `bun run scripts/generate-dependency-graph.ts` 檢查，或查看 pre-push hook 的驗證結果。

### 類型錯誤

```bash
# 完整類型檢查（清除快取）
bun run typecheck:full

# 檢查特定包
cd packages/<name>
bun run typecheck
```

### 構建失敗

- 確認 TypeScript 編譯無誤：`bun run typecheck`
- 檢查 Biome lint：`bun run check`
- 檢查依賴版本：`bun run version:check`

### 測試失敗

```bash
# 單一包測試
cd packages/<name>
bun test

# 查看詳細輸出
bun test --verbose
```

## 包發佈工作流程

### 使用 Changesets

1. 修改代碼
2. 執行 `bun run changeset`
3. 選擇受影響包與版本號（遵循語義化版本）
4. 提交 PR
5. Merge 後，CI 會自動執行發佈

### 版本號策略

- **major**：破壞性更改
- **minor**：新功能（向後相容）
- **patch**：錯誤修復

## 特別注意事項

### Monorepo 最佳實踐

1. **不要跨越 satellite 邊界**：satellite 間應透過事件通訊，不直接導入
2. **保持包職責清楚**：每個包應有明確的責任範圍
3. **避免循環依賴**：工具會檢查，但最好事先避免

### TypeScript 嚴格性

- 啟用了 `noUnusedLocals` 與 `noUnusedParameters`：所有變數都要用到
- 禁止 `// @ts-ignore` 除非有特殊原因（需要加註解說明）

### Git Hooks

- **pre-commit**：自動修復格式問題
- **pre-push**：檢查受影響包的完整構建

如果 hook 出問題，檢查 `simple-git-hooks` 配置。

## 文檔與資源

- **README.md**：專案概述與快速開始
- **CONTRIBUTING.md**：貢獻指南
- **GRAVITO_AGENT_GUIDE.md**：進階開發指南
- **WHITEPAPER_ZH_TW.md**：架構與設計白皮書
