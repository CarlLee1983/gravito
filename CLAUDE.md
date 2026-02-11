# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## 專案概述

Gravito 是一個模組化、高效能的 TypeScript 框架，基於 **Galaxy Architecture** 建構，包含：
- **PlanetCore**：微核心（hooks、IoC 容器、生命週期管理）
- **Orbits**：核心模組（Database、Auth、Event Bus）
- **Satellites**：業務領域外掛（Catalog、Membership、Commerce 等）

這是一個 **monorepo**，使用 Turbo、Bun、Biome 進行管理。

## 最常用命令

```bash
bun run build          # 全量構建
bun run typecheck      # TypeScript 類型檢查
bun run test           # 執行所有測試
bun run check          # Lint 和格式化檢查
bun run check:fix      # 自動修復 lint 和格式化問題
```

→ **完整命令參考**：[docs/claude/commands.md](docs/claude/commands.md)

## 專案結構

```
gravito-core-dx/
├── packages/              # 核心框架包（64 個）
│   ├── core/              # PlanetCore（微核心、hooks、container）
│   ├── photon/            # HTTP 引擎（基於 Hono）
│   ├── atlas/             # ORM（資料庫、遷移）
│   ├── signal/            # 事件總線
│   ├── stream/            # 流處理
│   └── ...
├── satellites/            # 業務領域外掛（15 個）
│   ├── catalog/           # 商品管理
│   ├── membership/        # 用戶與認證
│   ├── commerce/          # 訂單管理
│   └── ...
├── templates/             # 專案模板
├── examples/              # 使用範例
└── scripts/               # 工具腳本
```

→ **包功能速查表**：[docs/claude/packages.md](docs/claude/packages.md)

## 模型選擇策略（本專案）

**預設模型：Sonnet 4.5**（為確保實作品質）

此專案複雜性較高（64 個核心包 + 15 個 Satellite + Galaxy Architecture），使用 Sonnet 作為實作的預設模型，以確保：
- 跨包依賴的正確性
- 架構模式的一致性
- 代碼品質與整體規劃能力

**使用指南**：

| 場景 | 使用模型 | 原因 |
|------|--------|------|
| **實作新功能、修復 bug、重構代碼** | **Sonnet** | 預設選擇、代碼品質高 |
| **複雜架構決策、跨多個包的設計** | **Opus** | 深度推理、系統級決策 |
| **性能優化分析、架構缺陷診斷** | **Opus** | 需要深入理解整體設計 |
| 簡單文檔更新、輔助查詢 | Haiku（明確指定時） | 成本效益 |

**何時使用 Opus**：
- 涉及 Galaxy Architecture 核心設計決策
- 需要分析複雜的跨包依賴問題
- 性能優化需要深度系統分析
- 重構涉及 3 個以上核心包的架構

## 關鍵約束（必須遵守）

1. **TypeScript 嚴格模式**：啟用 `noUnusedLocals` 和 `noUnusedParameters`，所有變數都必須使用
2. **禁止 @ts-ignore**：除非附加說明註解，否則禁止使用
3. **Satellite 隔離原則**：Satellite 間禁止直接導入，必須透過事件通訊
4. **避免循環依賴**：Pre-push hook 會檢查，事先避免可以節省時間
5. **代碼風格**：100 字元寬、2 空格縮排、單引號、無分號、ES5 尾隨逗號
6. **Commit Message**：使用英文描述 (例：`feat: [core] Add new feature`)

→ **詳細配置**：[docs/claude/config.md](docs/claude/config.md)
→ **架構設計**：[docs/claude/design.md](docs/claude/design.md)
→ **架構約束**：[docs/claude/constraints.md](docs/claude/constraints.md)

## 常見開發任務

### 向核心包添加新功能

1. 在 `packages/<name>/src` 中創建實作
2. 在 `packages/<name>/tests` 中添加測試（目標覆蓋率 75%+）
3. 執行 `bun run typecheck && bun test`
4. 驗證其他依賴此包的包仍可正常構建

### 添加新 Satellite

1. 在 `satellites/<domain>/` 中創建 package（參考現有 satellite 結構）
2. 配置 `package.json`（workspace 依賴）
3. 實作領域邏輯
4. 在 `gravito.config.ts` 中註冊

### 修改跨包依賴

修改 `packages/*/package.json` 中的 workspace 依賴，然後執行：

```bash
bun install
bun run typecheck  # 驗證所有依賴解析正確
bun run build      # 驗證構建
```

→ **完整工作流程**：[docs/claude/development.md](docs/claude/development.md)

## 問題快速診斷

| 問題 | 快速解法 | 詳細指南 |
|---|---|---|
| 循環依賴 | `bun run scripts/generate-dependency-graph.ts` | [troubleshooting.md](docs/claude/troubleshooting.md#循環依賴) |
| 類型錯誤 | `bun run typecheck:full` | [troubleshooting.md](docs/claude/troubleshooting.md#類型錯誤) |
| 構建失敗 | `bun run check && bun run version:check` | [troubleshooting.md](docs/claude/troubleshooting.md#構建失敗) |
| 測試失敗 | `cd packages/<name> && bun test --verbose` | [troubleshooting.md](docs/claude/troubleshooting.md#測試失敗) |

→ **完整故障排除手冊**：[docs/claude/troubleshooting.md](docs/claude/troubleshooting.md)

## 深度參考索引

| 文件 | 用途 | 何時查閱 |
|---|---|---|
| **[commands.md](docs/claude/commands.md)** | 所有 CLI 命令參考 | 需要建構、測試、發佈、腳本命令時 |
| **[packages.md](docs/claude/packages.md)** | 包功能與依賴關係 | 需要了解某個包的職責或尋找合適的包時 |
| **[config.md](docs/claude/config.md)** | 工具配置詳情 | 需要修改 TypeScript / Biome / Turbo 配置時 |
| **[development.md](docs/claude/development.md)** | 完整開發流程 | 第一次提交代碼前、或需要完整工作流指引時 |
| **[design.md](docs/claude/design.md)** | Galaxy Architecture 設計原則 | 理解架構整體設計、評估包位置時 |
| **[constraints.md](docs/claude/constraints.md)** | Monorepo 約束與規範 | 檢查包邊界、循環依賴、版本一致性時 |
| **[patterns.md](docs/claude/patterns.md)** | 架構模式與最佳實踐 | 實戰開發、設計特性、解決架構問題時 |
| **[troubleshooting.md](docs/claude/troubleshooting.md)** | 故障排除手冊 | 遇到構建、測試、類型或依賴問題時 |

## 相關文檔與資源

- **[README.md](./README.md)**：專案概述與快速開始
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**：貢獻指南
- **[WHITEPAPER_ZH_TW.md](./WHITEPAPER_ZH_TW.md)**：Galaxy Architecture 設計白皮書
- **[GRAVITO_AGENT_GUIDE.md](./GRAVITO_AGENT_GUIDE.md)**：AI Agent 開發指南
- **[docs/operations/](./docs/operations/)**：詳細操作指南
