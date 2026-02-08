# 第二階段：大型測試檔案拆分實施指南

**優先度**: 高 | **複雜度**: 中等 | **預期改善**: 額外 10-20% CI 時間節省

---

## 📋 目標

將 3 個大型測試檔案（>900 行）拆分成多個小型檔案（100-200 行），進一步提升 CI 並行度。

---

## 🎯 拆分目標檔案

### 1. query-builder-complete.integration.test.ts（1,038 行）

**位置**: `packages/dark-matter/tests/query-builder-complete.integration.test.ts`
**優先度**: 最高
**難度**: 中等

#### 結構分析：
```
行數 1-141:    共用 Mock Collection Factory
行數 143-152:  模組導入和 beforeAll
行數 156-859:  describe('MongoQueryBuilder 完整 Mock 測試')
行數 860-1038: describe('MongoAggregateBuilder 完整 Mock 測試')
```

#### 拆分策略：

**Step 1: 提取共用部分** → `__shared__/mock-collection.ts`
```typescript
// 包含：
// - CapturedCalls interface
// - createMockCollection() function
```

**Step 2: 拆分 describe 區塊**

```
packages/dark-matter/tests/query-builder-complete/
├── __shared__/
│   ├── mock-collection.ts
│   ├── fixtures.ts
│   └── index.ts
├── mongo-query-builder.integration.test.ts  (704 行 → 350 行)
├── mongo-aggregate-builder.integration.test.ts (178 行 → 89 行)
└── README.md
```

#### 實施步驟：

1. **建立目錄結構**
```bash
mkdir -p packages/dark-matter/tests/query-builder-complete/__shared__
```

2. **提取 Mock Collection Factory**
```bash
# 新建 __shared__/mock-collection.ts
# 複製行數 1-141（Mock Collection 相關代碼）
# 新增導出
```

3. **拆分 describe 區塊**
```bash
# mongo-query-builder.integration.test.ts
# - 複製行數 1-154（導入和 beforeAll）
# - 複製行數 156-859（第一個 describe）
# - 更新導入路徑

# mongo-aggregate-builder.integration.test.ts
# - 複製行數 1-154（導入和 beforeAll）
# - 複製行數 860-1038（第二個 describe）
# - 更新導入路徑
```

4. **更新導入語句**
```typescript
// 原始
import { createMockCollection } from '../query-builder-complete.integration.test.ts'

// 修改為
import { createMockCollection } from './__shared__/mock-collection'
```

5. **刪除原始檔案**
```bash
rm packages/dark-matter/tests/query-builder-complete.integration.test.ts
```

6. **驗證**
```bash
cd packages/dark-matter
bun run test:integration
```

### 2. valibot-form-request.test.ts（1,077 行）

**位置**: `packages/impulse/tests/valibot-form-request.test.ts`
**優先度**: 高
**難度**: 中等

#### 結構分析：
```
行數 1-67:     Mock exceptions
行數 69-107:   createMockContext helper
行數 113-213:  describe('基本驗證')
行數 214-366:  describe('Authorization')
行數 367-461:  describe('Transform')
行數 462-595:  describe('Partial Validation')
行數 596-709:  describe('Exception 處理')
行數 710-759:  describe('getBlueprint')
行數 760-825:  describe('Custom Messages')
行數 826-897:  describe('DataSource')
行數 898-1021: describe('複雜 Schema')
行數 1022-1077: describe('邊界情況')
```

#### 拆分策略：

```
packages/impulse/tests/valibot-form-request/
├── __shared__/
│   ├── fixtures.ts              # Mock exceptions
│   ├── test-utils.ts            # createMockContext
│   └── index.ts
├── basic-validation.test.ts
├── authorization.test.ts
├── transform.test.ts
├── partial-validation.test.ts
├── exception-handling.test.ts
├── get-blueprint.test.ts
├── custom-messages.test.ts
├── data-source.test.ts
├── complex-schema.test.ts
├── edge-cases.test.ts
└── README.md
```

#### 共用部分（__shared__）：

**fixtures.ts**
```typescript
// Mock Gravito Core exceptions（行 17-59）
export class GravitoException extends Error { ... }
export class AuthorizationException extends GravitoException { ... }
export class ValidationException extends GravitoException { ... }

// Mock module setup（行 55-59）
export function setupMocks() { ... }
```

**test-utils.ts**
```typescript
// createMockContext helper（行 69-107）
export function createMockContext(options: { ... }): Context { ... }
```

**index.ts**
```typescript
export * from './fixtures'
export * from './test-utils'
```

#### 實施步驟：

1. **建立目錄和共用模組**
```bash
mkdir -p packages/impulse/tests/valibot-form-request/__shared__

# 複製並編輯 fixtures.ts, test-utils.ts, index.ts
```

2. **為每個 describe 區塊創建測試檔案**
```bash
# basic-validation.test.ts （行 113-213）
# authorization.test.ts （行 214-366）
# ... 以此類推
```

3. **更新導入**
```typescript
// 新增
import { GravitoException, AuthorizationException, ValidationException } from './__shared__'
import { createMockContext, MessageProvider } from './__shared__'
import * as v from 'valibot'
```

### 3. forge/index.test.ts（900 行）

**位置**: `packages/forge/tests/index.test.ts`
**優先度**: 中等
**難度**: 高

#### 結構分析：
```
需要檢查 describe 區塊的數量和複雜度
```

#### 實施策略：

```bash
# 先執行以下命令分析結構
grep "^describe" packages/forge/tests/index.test.ts | head -20

# 確定拆分邊界後進行拆分
# （比 query-builder 和 valibot 複雜，可能有更複雜的依賴）
```

---

## 🛠️ 通用拆分步驟

### Step 1: 分析原始檔案

```bash
# 查看 describe 區塊
grep -n "^describe" <file>

# 計算行數
wc -l <file>

# 檢查共用輔助函數
grep -n "^function\|^const.*=" <file> | head -20
```

### Step 2: 識別共用部分

- Mock 定義和 setup
- Helper 函數
- 導入和類型定義
- beforeAll, afterAll hooks

### Step 3: 建立目錄結構

```bash
mkdir -p <package>/tests/<test-name>/__shared__
cd <package>/tests/<test-name>
```

### Step 4: 提取共用代碼

```bash
# 新建 __shared__/index.ts，導出所有共用部分
```

### Step 5: 建立單個測試檔案

**範本**:
```typescript
import { describe, it, expect, beforeAll, beforeEach } from 'bun:test'
import { <imports> } from './__shared__'

// 模組動態導入（如需要）
let YourClass: typeof import('../../src/YourClass').YourClass

beforeAll(async () => {
  YourClass = (await import('../../src/YourClass')).YourClass
})

// 從原始檔案複製單個 describe 區塊
describe('Your Test Group', () => {
  // ... test cases ...
})
```

### Step 6: 驗證

```bash
# 本地測試
cd packages/<name>
bun run test:integration

# 檢查覆蓋率
bun run test:coverage

# 檢查導入
bun check
```

### Step 7: 清理

```bash
# 刪除原始檔案（使用 git 以便回退）
git rm <original-file>

# 提交
git add packages/<name>/tests/<test-name>/
git commit -m "refactor: [<name>] 拆分大型測試檔案"
```

---

## ⚠️ 常見陷阱與解決方案

### Issue 1: 循環依賴

**症狀**: 提取的共用模組導入測試中的內容

**解決方案**:
- 確保 `__shared__` 只包含純 Mock 和 Helper
- 不應導入任何業務邏輯

### Issue 2: 導入路徑錯誤

**症狀**: `Cannot find module` 或 `Module not found`

**檢查**:
```bash
# 驗證相對路徑
ls -la ../__shared__/

# 檢查 TypeScript 配置
cat tsconfig.json | grep "paths"
```

### Issue 3: 測試隔離問題

**症狀**: 測試依賴執行順序，或全局狀態污染

**解決方案**:
- 確保每個 describe 區塊有 `beforeEach` 清理
- 避免全局變數（使用 let 局部變數）
- 使用 `afterEach` 清理 mocks

### Issue 4: Mock 配置分散

**症狀**: 各個測試檔案有重複的 mock setup

**解決方案**:
- 建立 `__shared__/setup.ts`，集中所有 mock 配置
- 在各測試檔案 `beforeAll` 中呼叫

---

## 📊 預期結果

| 檔案 | 原始 | 拆分後 | 預期時間節省 |
|------|------|--------|-----------|
| query-builder-complete.integration.test.ts | 1,038 | 2 個 ×520 行 | 15-25% |
| valibot-form-request.test.ts | 1,077 | 10 個 ×107 行 | 20-30% |
| forge/index.test.ts | 900 | 5 個 ×180 行 | 10-20% |

**總預期改善**: +10-20% CI 時間節省（疊加第一階段的 30-40%）

---

## 🔍 驗證清單

- [ ] 新建目錄結構
- [ ] 提取共用部分到 `__shared__/`
- [ ] 拆分各 describe 區塊
- [ ] 更新所有導入路徑
- [ ] 本地運行測試（確保全部通過）
- [ ] 檢查測試覆蓋率（≥ 75%）
- [ ] 刪除原始檔案
- [ ] 提交變更

---

## 🚀 建議時間表

| 階段 | 任務 | 時間估算 | 優先度 |
|------|------|--------|--------|
| 第 1 週 | query-builder-complete | 4 小時 | 最高 |
| 第 2 週 | valibot-form-request | 6 小時 | 高 |
| 第 3 週 | forge/index | 8 小時 | 中等 |
| 第 4 週 | 驗證和調整 | 2 小時 | 中等 |

**總計**: 20 小時工作量

---

## 📚 參考資源

### 相關文檔
- 第一階段完成報告：`CI-OPTIMIZATION-PROGRESS.md`
- Bun 測試文檔：https://bun.sh/docs/cli/test
- TypeScript 配置：`tsconfig.json`

### 推薦閱讀
- [測試檔案組織最佳實踐](https://testing-library.com/docs/queries/about/)
- [Mock 設計模式](https://en.wikipedia.org/wiki/Mock_object)

---

## 💬 注意事項

1. **不要跳過 beforeEach/afterEach**: 確保測試隔離
2. **保持檔案大小均衡**: 每個檔案 100-200 行最佳
3. **一次提交一個檔案**: 便於 git history 和回退
4. **定期驗證**: 每個檔案拆分後立即運行測試

---

**上次更新**: 2026-02-07
**準備者**: Claude Code
**下一步**: 根據 CI 驗證結果決定拆分優先度
