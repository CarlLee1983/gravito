# Phase 3 路線圖 - 高級功能與增強

**Status**: 🚀 Planning
**Date**: 2026-03-10
**Previous Phases**: Phase 2a ✅ | Phase 2b ✅ | Phase 2c ✅

---

## 📋 目錄

1. [概述](#概述)
2. [Phase 3 的三個部分](#phase-3-的三個部分)
3. [詳細規劃](#詳細規劃)
4. [里程碑](#里程碑)
5. [下一步](#下一步)

---

## 概述

Phase 3 將 Gravito DDD 框架從 **核心功能** 升級到 **企業級高級特性**。包括：

- **模組生成工具**：在現有項目中動態生成新的 DDD 模組
- **事件管理工具**：事件重放、版本控制、一致性驗證
- **高級配置系統**：自定義範本、預設組態、多模組協調

---

## Phase 3 的三個部分

### 🎯 Part 1：模組生成命令 (2-3 天)
**目標**: 在現有項目中快速生成新的 DDD 模組

**核心功能**:
- `gravito module generate` 命令
- 支援三種模組類型（simple/advanced/cqrs-query）
- 自動整合到現有項目結構
- 自動更新路由和依賴注入

**預期成果**:
- ✅ 新命令實現
- ✅ 模組整合邏輯
- ✅ 路由自動註冊
- ✅ 完整文檔和範例

---

### 🔄 Part 2：事件管理工具 (3-4 天)
**目標**: 提供事件溯源的高級工具

**核心功能**:
- 事件重放工具（時間旅行調試）
- 投影版本管理
- 事件一致性檢查
- 事件遷移工具

**預期成果**:
- ✅ 事件重放引擎
- ✅ 投影版本控制
- ✅ 一致性驗證器
- ✅ CLI 命令集

---

### ⚙️ Part 3：高級配置系統 (2-3 天)
**目標**: 支援複雜的多模組項目

**核心功能**:
- 自定義範本系統
- 多模組預設配置
- 跨模組事件映射
- 模組依賴解析

**預期成果**:
- ✅ 配置 DSL
- ✅ 範本擴展機制
- ✅ 依賴圖分析
- ✅ 配置驗證

---

## 詳細規劃

### Part 1：模組生成命令

#### 1.1 核心實現

**文件**: `packages/cli/src/commands/module.ts`

```typescript
// gravito module generate <name> [type] [options]
// 例子:
// gravito module generate Payment --ddd-type advanced
// gravito module generate Analytics --ddd-type cqrs-query
```

**功能**:
- 交互式或 flag 驅動的模組生成
- 自動檢測現有項目結構
- 遵循現有的命名和架構約定
- 自動集成到路由系統

#### 1.2 模組範本

**文件**: `packages/scaffold/src/generators/ModuleGenerator.ts`

```typescript
interface ModuleGenerationOptions {
  name: string                    // 模組名稱 (e.g., "Payment")
  type: 'simple' | 'advanced' | 'cqrs-query'
  targetDir: string              // 既有專案目錄
  dependsOn?: string[]           // 模組依賴
  eventSubscriptions?: string[]  // 要訂閱的事件
}
```

#### 1.3 自動整合

**功能清單**:
- [ ] 在 src/Modules 下建立模組目錄
- [ ] 生成 Domain 層結構
- [ ] 生成 Application 層結構
- [ ] 生成 Presentation 層結構
- [ ] 生成 Infrastructure 層結構
- [ ] 生成 index.ts 導出
- [ ] 更新 src/routes.ts 註冊新路由
- [ ] 更新 package.json（如果需要新依賴）
- [ ] 生成 README.md

#### 1.4 測試計畫

**單元測試**:
- [ ] ModuleGenerator 可正確建立各層
- [ ] 自動路由註冊
- [ ] 依賴解析

**集成測試**:
- [ ] 生成後項目可編譯
- [ ] 新模組可訪問
- [ ] 新模組與現有系統集成

**E2E 測試**:
- [ ] 在真實項目上測試
- [ ] 驗證 API 端點
- [ ] 驗證資料庫操作

---

### Part 2：事件管理工具

#### 2.1 事件重放引擎

**文件**: `packages/scaffold/src/tools/EventReplayEngine.ts`

```typescript
interface EventReplayOptions {
  projectDir: string
  aggregateId: string
  fromTimestamp?: Date
  toTimestamp?: Date
  dryRun?: boolean
}

class EventReplayEngine {
  async replay(options: EventReplayOptions): Promise<void>
  async rollback(options: EventReplayOptions): Promise<void>
  async analyzeTimeline(aggregateId: string): Promise<EventTimeline>
}
```

**功能**:
- 時間旅行：觀看特定時點的狀態
- 重放調試：找出何時何處引入了錯誤
- 狀態驗證：確認重放後的狀態正確

#### 2.2 投影版本管理

**文件**: `packages/scaffold/src/tools/ProjectionVersionControl.ts`

```typescript
interface ProjectionVersion {
  version: number
  name: string
  hash: string
  createdAt: Date
  description: string
  migration?: (oldProjection: any) => any
}

class ProjectionVersionManager {
  async createVersion(projection: ReadModel): Promise<ProjectionVersion>
  async migrateProjection(fromVersion: number, toVersion: number): Promise<void>
  async validateVersion(version: number): Promise<ValidationResult>
}
```

**功能**:
- 版本化投影
- 自動遷移
- 版本驗證

#### 2.3 一致性檢查

**文件**: `packages/scaffold/src/tools/ConsistencyChecker.ts`

```typescript
interface ConsistencyReport {
  aggregateId: string
  issues: ConsistencyIssue[]
  suggestedFixes: Fix[]
}

class ConsistencyChecker {
  async checkAggregate(aggregateId: string): Promise<ConsistencyReport>
  async checkProjections(): Promise<ProjectionConsistency>
  async validateEventStream(): Promise<EventStreamValidation>
}
```

**功能**:
- 檢驗聚合根狀態
- 檢驗投影一致性
- 檢驗事件流完整性

#### 2.4 CLI 命令

```bash
# 事件重放
gravito event replay --aggregate-id <id> --from <date> --to <date>

# 投影版本
gravito projection version create --name "v2" --description "Added new fields"
gravito projection migrate --from 1 --to 2

# 一致性檢查
gravito consistency check --aggregate-id <id>
gravito consistency validate-all
```

---

### Part 3：高級配置系統

#### 3.1 配置 DSL

**文件**: `gravito.config.ts`

```typescript
// 示例配置
export const grvConfig = {
  project: {
    name: 'my-system',
    modules: [
      {
        name: 'Payment',
        type: 'advanced',
        events: ['PaymentRequested', 'PaymentCompleted'],
      },
      {
        name: 'Analytics',
        type: 'cqrs-query',
        subscribes: ['PaymentCompleted', 'OrderCreated'],
      },
    ],
    eventBus: {
      type: 'local' | 'redis' | 'kafka',
      config: {},
    },
  },
}
```

#### 3.2 自定義範本

**文件**: `.gravito/templates/`

```
.gravito/templates/
├── module/
│   ├── domain/
│   │   ├── Aggregate.ts.template
│   │   ├── ValueObject.ts.template
│   │   └── Event.ts.template
│   ├── application/
│   └── presentation/
└── event/
    ├── DomainEvent.ts.template
    └── EventHandler.ts.template
```

**功能**:
- 自定義 Handlebars 範本
- 變數替換和條件邏輯
- 多個範本預設

#### 3.3 模組依賴系統

**功能**:
- 分析模組間依賴
- 檢測循環依賴
- 自動排序初始化順序
- 生成依賴圖

---

## 里程碑

### Milestone 1：模組生成（第 1-2 週）
**目標**: 生成命令完全可用

```
Week 1:
  - Day 1-2: 核心 ModuleGenerator 實現
  - Day 3-4: 自動路由整合
  - Day 5: 單元測試

Week 2:
  - Day 1-2: 集成測試
  - Day 3: 文檔
  - Day 4-5: 打磨和 bug 修復
```

**成功指標**:
- [ ] 可生成所有三種模組類型
- [ ] 生成後項目可編譯
- [ ] 新模組可訪問（測試 API）
- [ ] 所有測試通過（>80% 覆蓋率）

---

### Milestone 2：事件管理（第 3-4 週）
**目標**: 完整的事件工具鏈

```
Week 3:
  - Day 1-2: 事件重放引擎
  - Day 3-4: 投影版本管理
  - Day 5: 集成測試

Week 4:
  - Day 1-2: 一致性檢查器
  - Day 3: CLI 命令
  - Day 4-5: 文檔和範例
```

**成功指標**:
- [ ] 可重放特定時間範圍的事件
- [ ] 可管理投影版本並遷移
- [ ] 一致性檢查可檢測問題
- [ ] 所有工具可通過 CLI 訪問

---

### Milestone 3：高級配置（第 5-6 週）
**目標**: 企業級配置系統

```
Week 5:
  - Day 1-2: 配置 DSL 和驗證
  - Day 3-4: 自定義範本系統
  - Day 5: 依賴分析

Week 6:
  - Day 1-2: 整合和測試
  - Day 3-4: 文檔
  - Day 5: 最終打磨
```

**成功指標**:
- [ ] 支援 gravito.config.ts 配置
- [ ] 自定義範本可正常運作
- [ ] 依賴圖可正確生成
- [ ] 配置驗證全面

---

## 📊 預期成果

### 代碼統計
- **新文件**: 15-20 個
- **新行數**: 3,000-4,000 行代碼
- **新測試**: 30-40 個測試
- **新文檔**: 1,500+ 行

### 功能數量
- **新 CLI 命令**: 8-10 個
- **新 API 類**: 10-15 個
- **新工具類**: 5-8 個

### 文檔
- **技術文檔**: 5-8 份
- **使用指南**: 3-5 份
- **API 文檔**: 完整 JSDoc

---

## 🎯 Phase 3 的成功定義

✅ **完成條件**:
1. 模組生成命令完全可用和經過測試
2. 事件管理工具鏈完整
3. 高級配置系統可支持複雜項目
4. 所有功能都有完整文檔
5. 集成測試通過率 > 95%
6. 代碼覆蓋率 > 80%

✅ **質量指標**:
- 零 TypeScript 錯誤
- Biome linting 通過
- 代碼風格一致
- 向後相容性保持

---

## 🚀 下一步

### 立即行動
1. 決定 Part 1、2、3 的優先級
2. 確認資源和時間表
3. 設置開發環境

### 開發流程
1. 每個 Part 都遵循 TDD 方法（測試優先）
2. 定期文檔更新
3. 每日進度報告
4. 每個 Part 完成後進行 code review

### 預期時間
- **Total Duration**: 5-6 週
- **Effort**: 150-200 小時
- **Team Size**: 1-2 人

---

## 📚 參考資源

- Phase 2c 文檔
- Gravito 架構設計文檔
- DDD Event Sourcing 最佳實踐
- 現有項目代碼示例

---

## 🔗 相關文檔

- [PHASE2C_PROGRESS.md](./PHASE2C_PROGRESS.md) - Phase 2c 完成情況
- [DDD_MODULE_TYPE_SELECTION.md](./packages/cli/docs/DDD_MODULE_TYPE_SELECTION.md) - CLI 選項詳解
- [CLI_USAGE_EXAMPLES.md](./packages/cli/docs/CLI_USAGE_EXAMPLES.md) - 使用範例

---

**Status**: Ready for Planning ✅
**Next**: Detailed design for Part 1 (Module Generation)

Built with ❤️ using Gravito Framework + Claude Code
