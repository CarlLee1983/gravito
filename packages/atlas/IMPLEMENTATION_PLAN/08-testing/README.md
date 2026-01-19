# 測試策略與回歸清單

## 📋 總覽

本文件提供 `@gravito/atlas` 的完整測試策略、執行指南與回歸測試流程。

**測試目標：**
- 測試覆蓋率 ≥ 80%
- 所有回歸測試項目通過
- 性能基準測試驗證優化效果
- 類型安全檢查通過

---

## 🧪 測試策略

### 1. 單元測試

**目的：** 測試各個模組的獨立功能

**執行方式：**
```bash
# 執行所有單元測試
bun test

# 執行特定測試文件
bun test tests/Model-extra.test.ts

# 執行特定測試套件
bun test --grep "DirtyTracker"

# 覆蓋率報告
bun test --coverage

# 強制最低覆蓋率（目標 80%）
bun test --coverage --coverage-threshold=80

# CI 模式（覆蓋率 + 閾值）
bun run test:ci
```

**測試文件組織：**
- `tests/*.test.ts` - 核心功能測試
- `tests/*-extra.test.ts` - 額外覆蓋測試
- `tests/integration/*.test.ts` - 整合測試
- `tests/grammar/*.test.ts` - Grammar 相關測試

**當前狀態：**
- ✅ 39 個測試文件
- ✅ 528+ 個測試用例
- ⚠️ 覆蓋率目標：80%（當前需驗證）

---

### 2. 性能測試

**目的：** 驗證優化效果，防止性能回歸

**執行方式：**
```bash
# 執行所有性能基準測試
bun test tests/performance/

# 執行特定基準測試
bun test tests/performance/Model.bench.ts
bun test tests/performance/DirtyTracker.bench.ts
bun test tests/performance/QueryBuilder.bench.ts
```

**基準測試文件：**
- `tests/performance/Model.bench.ts` - Model hydration 性能
- `tests/performance/DirtyTracker.bench.ts` - DirtyTracker 操作性能
- `tests/performance/QueryBuilder.bench.ts` - QueryBuilder clone 性能

**基準線文件：**
- `tests/performance/baseline-2026-01-17.json` - JSON 格式基準數據
- `tests/performance/baseline-2026-01-17.md` - 人類可讀基準報告

**性能驗證流程：**
```bash
# 1. 建立基準線（在優化前）
bun test tests/performance/ > baseline-$(date +%Y-%m-%d).txt

# 2. 執行優化後測試
bun test tests/performance/ > optimized-$(date +%Y-%m-%d).txt

# 3. 比較結果
diff baseline-*.txt optimized-*.txt

# 或使用 JSON 格式進行更精確的比較
node scripts/compare-benchmarks.js baseline.json optimized.json
```

**性能目標：**
- Model hydration: ↑300-500%
- DirtyTracker 操作: ↑50x
- QueryBuilder clone: ↑100-200x
- 記憶體使用（大型資料集）: ↓40-60%

---

### 3. 整合測試

**目的：** 測試完整功能流程與模組間協作

**執行方式：**
```bash
# 執行整合測試
bun test tests/integration.test.ts

# 執行特定整合測試
bun test tests/integration/Transaction.test.ts
bun test tests/integration/Prepared.test.ts
```

**整合測試涵蓋：**
- ✅ CRUD 操作
- ✅ Eager Loading
- ✅ Pagination
- ✅ Attribute Casting
- ✅ Dirty Tracking
- ✅ QueryBuilder 組合查詢
- ✅ Transactions（含 Nested Transactions）
- ✅ Prepared Statements
- ✅ Error Handling

---

### 4. 類型檢查

**目的：** 確保 TypeScript 類型安全

**執行方式：**
```bash
# TypeScript 類型檢查
bun run typecheck

# 或直接使用 tsc
bun tsc -p tsconfig.json --noEmit --skipLibCheck
```

**類型安全目標：**
- ✅ `any` 類型數量 < 10（Phase 1 目標）
- ✅ 類型覆蓋率 > 95%
- ✅ strict mode 通過

---

### 5. 回歸測試

**目的：** 確保優化不會破壞現有功能

**執行流程：**

#### 5.1 每個 Phase 前的回歸測試

```bash
# 1. 建立功能基準線
bun test > regression-baseline-$(date +%Y-%m-%d).txt

# 2. 建立性能基準線
bun test tests/performance/ > performance-baseline-$(date +%Y-%m-%d).txt

# 3. 執行優化

# 4. 執行回歸測試
bun test > regression-after-$(date +%Y-%m-%d).txt

# 5. 比較結果
diff regression-baseline-*.txt regression-after-*.txt
```

#### 5.2 回歸測試清單驗證

使用回歸測試清單（[regression-checklist.md](./regression-checklist.md)）逐一驗證：

```bash
# 手動執行或使用測試腳本
bun run test:regression
```

**回歸測試項目：**
- Core Model（CRUD、DirtyTracker、Casting、Accessor/Mutator）
- QueryBuilder（查詢組合、clone、paginate、cache）
- Relationships & Eager Loading
- Grammar & Caching
- Connection & Transactions
- Error & Debug

詳見 [回歸測試清單](./regression-checklist.md)

---

## 📊 測試覆蓋率報告

### 生成覆蓋率報告

```bash
# 生成覆蓋率報告
bun test --coverage

# 覆蓋率報告會顯示：
# - 行覆蓋率（Line Coverage）
# - 函數覆蓋率（Function Coverage）
# - 分支覆蓋率（Branch Coverage）
# - 語句覆蓋率（Statement Coverage）
```

### 覆蓋率目標

| 模組 | 目標覆蓋率 | 當前狀態 |
|------|-----------|---------|
| Core Model | ≥ 85% | 需驗證 |
| QueryBuilder | ≥ 80% | 需驗證 |
| Grammar | ≥ 75% | 需驗證 |
| Relationships | ≥ 80% | 需驗證 |
| **整體** | **≥ 80%** | **需驗證** |

---

## 🔄 持續整合（CI）測試

### GitHub Actions 測試流程

```yaml
# .github/workflows/test.yml 應包含：
- 單元測試
- 類型檢查
- 覆蓋率報告
- 性能基準測試（可選）
```

### 本地 CI 模擬

```bash
# 執行完整的 CI 測試套件
bun run test:ci

# 等同於：
bun run typecheck && bun test --coverage --coverage-threshold=80
```

---

## 🎯 測試執行檢查清單

### 開發前檢查
- [ ] 執行所有現有測試，確保通過
- [ ] 建立性能基準線
- [ ] 檢查測試覆蓋率

### 開發中檢查
- [ ] 為新功能編寫單元測試
- [ ] 更新相關整合測試
- [ ] 確保類型檢查通過

### 開發後檢查
- [ ] 所有測試通過
- [ ] 覆蓋率不低於目標
- [ ] 性能測試驗證優化效果
- [ ] 回歸測試清單驗證
- [ ] 類型檢查通過

---

## 📝 測試文件撰寫指南

### 測試文件命名
- 單元測試：`<Module>.test.ts`
- 額外測試：`<Module>-extra.test.ts`
- 整合測試：`tests/integration/<Feature>.test.ts`
- 性能測試：`tests/performance/<Module>.bench.ts`

### 測試結構範例

```typescript
import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { Model, DB } from '../src'

describe('Feature Name', () => {
  beforeEach(() => {
    // 設置測試環境
  })

  afterEach(async () => {
    // 清理測試環境
    await DB._reset()
  })

  test('should do something', async () => {
    // Arrange
    const model = Model.make({ ... })
    
    // Act
    const result = await model.save()
    
    // Assert
    expect(result).toBeDefined()
  })
})
```

### 測試最佳實踐
1. **AAA 模式**：Arrange（準備）、Act（執行）、Assert（斷言）
2. **獨立性**：每個測試應該獨立，不依賴其他測試
3. **清理**：使用 `beforeEach`/`afterEach` 確保測試環境乾淨
4. **描述性命名**：測試名稱應該清楚描述測試內容
5. **單一職責**：每個測試只驗證一個行為

---

## 🚨 常見問題與解決方案

### 問題 1：測試覆蓋率不足

**解決方案：**
```bash
# 1. 查看覆蓋率報告，找出未覆蓋的程式碼
bun test --coverage

# 2. 針對未覆蓋的程式碼編寫測試
# 3. 重新執行覆蓋率檢查
```

### 問題 2：性能測試結果不一致

**解決方案：**
- 確保測試環境一致（CPU、記憶體、Bun 版本）
- 多次執行取平均值
- 使用基準線 JSON 格式進行精確比較

### 問題 3：整合測試失敗

**解決方案：**
```bash
# 1. 檢查資料庫連線設定
# 2. 確保測試資料庫已正確設置
# 3. 檢查測試清理邏輯是否正確
```

---

## 📚 相關文件

- [回歸測試清單](./regression-checklist.md) - 詳細的回歸測試項目
- [CI 檢查清單](./CI_CHECKLIST.md) - CI 配置檢查與驗證指南 ⚠️ **重要**
- [測試執行總結](./TEST_EXECUTION_SUMMARY.md) - 測試執行結果與修復記錄
- [Phase 狀態總覽](../PHASE_STATUS.md) - 各 Phase 實施狀態
- [性能基準測試](../../tests/performance/) - 性能測試文件

---

## 🔗 快速參考

```bash
# 快速測試命令
bun test                                    # 所有測試
bun test --coverage                         # 覆蓋率報告
bun test tests/performance/                 # 性能測試
bun test tests/integration.test.ts          # 整合測試
bun run typecheck                           # 類型檢查
bun run test:ci                             # CI 測試套件
```
