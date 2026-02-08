# 開發工作流程

> **用途**：完整的開發流程指引和常見工作任務
> **何時查閱**：第一次提交代碼前、或需要完整工作流指引時
> **返回**：[CLAUDE.md](../../CLAUDE.md)

---

## 日常開發循環

### 1. 修改代碼

在 `packages/<name>/src` 或 `satellites/<name>/src` 中修改 TypeScript 代碼。

```bash
# 編輯代碼
nano packages/core/src/application.ts

# 或多個文件修改
# packages/<name>/src/application.ts
# packages/<name>/src/config.ts
# packages/<name>/tests/application.test.ts
```

### 2. 本地驗證（修改後立即檢查）

```bash
# 快速檢查（~10 秒）
bun run typecheck && bun run check

# 單一包測試（~1-5 秒）
cd packages/<modified-package>
bun test

# 完整驗證（推送前）
bun run typecheck && bun run check && bun run test
```

### 3. Git Hooks（自動執行，不需手動干預）

**Pre-commit Hook** 在 `git commit` 時自動執行：
- `lint-staged` 對修改的文件執行
- `biome check --write` 自動修復格式和部分 lint 問題

**Pre-push Hook** 在 `git push` 時自動執行：
- `validate-affected-packages.ts` 驗證受影響包的完整構建

> ⚠️ 如果 hook 失敗，參考 [troubleshooting.md](./troubleshooting.md#git-hook-問題)

### 4. Commit Message 格式

遵循 **英文** conventional commits 格式：

```bash
# 格式
<type>: [<scope>] <subject>

# 類型（type）
feat       # 新增功能
fix        # 修復 bug
refactor   # 重構（不改變功能）
docs       # 文檔改變
style      # 代碼風格（不影響邏輯）
test       # 增加測試
chore      # 構建或工具變動
perf       # 性能優化

# 範例
feat: [core] Add hook lifecycle management
fix: [atlas] Fix N+1 query in migration
refactor: [stream] Simplify event processing
docs: Update packages.md with new dependencies
test: [events] Add backpressure integration tests
```

---

## 常見開發任務

### 向核心包添加新功能

**場景**：需要為 `@gravito/core` 或其他核心包添加新功能

```bash
# 1. 在包的 src/ 中創建實作
cd packages/core
# 編輯 src/NewFeature.ts
# 編輯 src/index.ts（匯出新功能）

# 2. 在 tests/ 中添加測試（TDD 優先）
# 編輯 tests/NewFeature.test.ts

# 3. 本地驗證
bun run typecheck
bun test

# 4. 完整驗證（檢查是否影響其他包）
cd ../..
bun run typecheck:full
bun run test
bun run scripts/validate-affected-packages.ts

# 5. Commit
git add packages/core
git commit -m "feat: [core] Add NewFeature functionality"
```

**檢查清單**
- [ ] 代碼已添加到 `packages/<name>/src`
- [ ] 對應的測試已添加到 `tests/`
- [ ] 新功能已在 `src/index.ts` 中匯出
- [ ] 單一包測試通過：`cd packages/<name> && bun test`
- [ ] 完整類型檢查通過：`bun run typecheck:full`
- [ ] 相關包的構建仍然成功
- [ ] 測試覆蓋率達到要求（75%+）

### 添加新 Satellite（業務外掛）

**場景**：需要添加新的業務模組，例如 `@gravito/satellite-notifications`

```bash
# 1. 創建 Satellite 目錄和基本結構
mkdir satellites/notifications
cd satellites/notifications

# 2. 創建 package.json
cat > package.json << 'EOF'
{
  "name": "@gravito/satellite-notifications",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@gravito/core": "workspace:*",
    "@gravito/atlas": "workspace:*",
    "@gravito/signal": "workspace:*"
  },
  "devDependencies": {
    "typescript": "workspace:*"
  }
}
EOF

# 3. 創建目錄結構
mkdir -p src/{models,use-cases,controllers,repositories,events}
touch src/index.ts

# 4. 創建 tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
EOF

# 5. 實作 Satellite
# 編輯 src/models/Notification.ts
# 編輯 src/use-cases/SendNotification.ts
# 編輯 src/index.ts

# 6. 在 gravito.config.ts 中註冊
# 找到 modules 陣列，添加：
# NotificationModule,

# 7. 在根目錄安裝和驗證
cd ../..
bun install
bun run typecheck
bun run test

# 8. Commit
git add satellites/notifications gravito.config.ts
git commit -m "feat: [notifications] Add notification satellite module"
```

**目錄結構參考**
```
satellites/notifications/
├── src/
│   ├── models/
│   │   └── Notification.ts
│   ├── use-cases/
│   │   └── SendNotification.ts
│   ├── controllers/
│   │   └── NotificationController.ts
│   ├── repositories/
│   │   └── NotificationRepository.ts
│   ├── events/
│   │   └── NotificationSentEvent.ts
│   └── index.ts
├── tests/
│   ├── use-cases/
│   │   └── SendNotification.test.ts
│   └── integration.test.ts
├── package.json
└── tsconfig.json
```

### 修改跨包依賴

**場景**：需要添加、更新或移除包依賴

```bash
# 1. 修改 package.json 中的依賴
cd packages/<my-package>
# 編輯 package.json，修改 dependencies 或 devDependencies

# 2. 重新安裝依賴
cd ../..
bun install

# 3. 驗證依賴解析正確
bun run typecheck  # 驗證型別

# 4. 驗證構建
bun run build      # 驗證構建

# 5. 如果修改了版本或依賴鏈，檢查一致性
bun run version:check
bun run scripts/validate-affected-packages.ts

# 6. Commit
git add packages/<my-package>/package.json bun.lockb
git commit -m "chore: [my-package] Update dependencies"
```

> ⚠️ 避免循環依賴！使用 `bun run scripts/generate-dependency-graph.ts` 檢查

---

## 測試規範

### Bun Test 約定

```bash
# 測試檔案位置
packages/<name>/tests/          # 単一包測試
satellites/<name>/tests/        # Satellite 測試

# 測試檔案命名
*.test.ts                       # 推薦格式
*.spec.ts                       # 替代格式
```

### 執行測試

```bash
# 單一包
cd packages/<name>
bun test

# 特定測試檔案
bun test tests/feature.test.ts

# 含覆蓋率
bun test --coverage

# 詳細輸出（除錯失敗的測試）
bun test --verbose
```

### 覆蓋率要求

| 包類別 | 要求 |
|---|---|
| 大多數包 | 75%+ |
| 核心框架包 | 80%+ |
| Satellite | 70%+ |

```bash
# 檢查覆蓋率
bun test --coverage

# 設置閾值
bun test --coverage --coverage-threshold=75
```

---

## 包發佈工作流程

### 使用 Changesets 的步驟

#### 步驟 1：修改代碼

```bash
# 在相應的包中修改代碼
nano packages/core/src/feature.ts
nano packages/core/tests/feature.test.ts
```

#### 步驟 2：驗證修改

```bash
# 本地驗證
bun run typecheck && bun run check && bun run test

# 完整驗證
bun run scripts/validate-affected-packages.ts
```

#### 步驟 3：創建 Changeset

```bash
# 交互式創建
bun run changeset

# 選項說明：
# - 選擇受影響的包（使用空格選擇，Enter 確認）
# - 選擇版本號（major / minor / patch）
# - 輸入 changeset 描述
```

Changeset 示例：
```markdown
---
"@gravito/core": minor
"@gravito/atlas": patch
---

Add new hook lifecycle management for improved extensibility.
Fixes N+1 query issues in database migrations.
```

#### 步驟 4：提交和推送

```bash
# 提交 changeset
git add .changeset
git commit -m "chore: Add changeset for v1.2.0"

# 推送到遠程
git push
```

#### 步驟 5：CI 自動發佈

> 無需手動操作！当 PR merge 到 main 分支後，GitHub Actions 會自動：
> 1. 執行 `bun run ci:version` 更新版本號和 CHANGELOG
> 2. 執行 `bun run ci:publish` 發佈到 npm

### 版本號策略（語義化版本）

| 類型 | 版本號變化 | 何時使用 |
|---|---|---|
| **Major** | 1.0.0 → 2.0.0 | 破壞性 API 更改 |
| **Minor** | 1.0.0 → 1.1.0 | 新功能（向後相容） |
| **Patch** | 1.0.0 → 1.0.1 | 錯誤修復 |

### Beta / Snapshot 發佈

```bash
# Beta 版本
bun run pub:beta      # 發佈 beta 版到 npm

# Snapshot 版本（開發快照，不需要版本號）
bun run pub:snapshot  # 快速發佈用於測試
```

---

## 開發環境初始化

新開發者第一次設置環境：

```bash
# 1. Clone 倉庫
git clone <repository-url>
cd gravito-core-dx

# 2. 安裝依賴
bun install

# 3. 全量構建
bun run build

# 4. 執行測試確保環境正常
bun run test

# 5. 本地驗證（應全部通過）
bun run typecheck
bun run check
```

---

## 常用命令組合

### 快速驗證（每次編輯後）
```bash
bun run typecheck && bun run check && bun test
```

### 推送前完整檢查
```bash
bun run typecheck:full && \
bun run check && \
bun run test && \
bun run scripts/validate-affected-packages.ts
```

### 疑難排解
```bash
# 清除快取重新檢查
bun run typecheck:full

# 查看受影響的包
bun run ci:affected

# 生成依賴圖
bun run scripts/generate-dependency-graph.ts
```

---

## 相關文件

- [返回 CLAUDE.md](../../CLAUDE.md)
- [所有命令參考](./commands.md)
- [故障排除指南](./troubleshooting.md)
- [工具配置詳情](./config.md)
- [包功能速查表](./packages.md)
- [docs/operations/DEVELOPMENT_GUIDE.md](../operations/DEVELOPMENT_GUIDE.md) - 更詳細的開發指南
- [docs/operations/CHANGESETS_INTEGRATION_GUIDE.md](../operations/CHANGESETS_INTEGRATION_GUIDE.md) - Changesets 詳細指南
