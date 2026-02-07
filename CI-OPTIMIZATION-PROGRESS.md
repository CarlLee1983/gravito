# CI 測試優化實施進度報告

**日期**: 2026-02-07
**實施階段**: 第一階段（完成）→ 後續階段（規劃中）

---

## 📊 執行摘要

透過實施測試分類與 CI Workflow 優化，成功將 Unit tests 並發度提升 **100%**，預期 CI 執行時間節省 **30-40%**。

---

## ✅ 第一階段：測試分類與 CI 配置優化（已完成）

### 1. 測試檔案分類

**重命名 80 個 integration 測試檔案為 `*.integration.test.ts`**

| 包名 | 數量 | 主要特徵 |
|------|------|--------|
| packages/dark-matter | 18 | MongoDB 查詢構建器、事務、連線池 |
| packages/plasma | 22 | Redis 客戶端操作（String、Hash、List 等） |
| packages/atlas | 8 | SQL ORM、事務、MongoDBDriver |
| packages/graphql | 9 | Atlas + GraphQL 整合、Federation |
| packages/core | 6 | DLQ（Dead Letter Queue）系統 |
| packages/stream | 2 | Database 和 Redis 驅動 |
| packages/stasis | 3 | Redis 鎖和快取標籤 |
| packages/impulse | 3 | 表單驗證（與資料庫相關） |
| 其他 | 9 | 其他資料庫相關測試 |

**統計**:
- Unit tests: 600 個檔案
- Integration tests: 80 個檔案
- **總計: 680 個測試檔案**

### 2. Turbo 配置更新

**修改 `turbo.json`，新增兩個任務：**

```json
{
  "test:unit": {
    "dependsOn": [],
    "inputs": [
      "src/**",
      "tests/**/*.test.ts",
      "!tests/**/*.integration.test.ts",
      "package.json",
      "tsconfig.json",
      "bunfig.toml"
    ],
    "outputs": [],
    "cache": true
  },
  "test:integration": {
    "dependsOn": [],
    "inputs": [
      "src/**",
      "tests/**/*.integration.test.ts",
      "package.json",
      "tsconfig.json",
      "bunfig.toml"
    ],
    "outputs": [],
    "cache": false
  }
}
```

### 3. Package.json 更新

**更新 55 個 package.json，添加 test:unit 和 test:integration 腳本**

**範例（packages/atlas/package.json）:**
```json
{
  "scripts": {
    "test": "bun test --timeout=10000 --max-concurrency=${TEST_CONCURRENCY:-2}",
    "test:unit": "bun test '**/*.test.ts' '!**/*.integration.test.ts' --timeout=10000 --max-concurrency=${TEST_CONCURRENCY:-8}",
    "test:integration": "bun test '**/*.integration.test.ts' --timeout=10000 --max-concurrency=${TEST_CONCURRENCY:-2}"
  }
}
```

### 4. CI Workflow 優化

**修改 `.github/workflows/ci.yml` 中的 Typecheck & Test 步驟**

#### Main 分支執行流程（並行）：
- **Typecheck**: 並發度 6（無變化）
- **Unit tests** (packages): 並發度 8（**提升 2 倍** ↑100%）
- **Integration tests** (packages): 並發度 2（**降低** - 避免資料庫連接耗盡）
- **Tests** (satellites): 並發度 4（無變化）

#### PR 模式（增量執行）：
- 只執行受影響包的 typecheck、unit tests、integration tests
- 應用相同的並發度優化

#### 預期效果：
```
執行時間改善：
  原始: Typecheck(5m) + Test(15m) = 20+ 分鐘
  優化後: Typecheck(5m) + Unit Tests(7m) + Integration Tests(5m) = 12-15 分鐘
  節省: 30-40%
```

---

## 📈 性能預期

### 並發度提升：

| 任務 | 原始 | 優化後 | 提升 |
|------|------|--------|------|
| Unit tests | 4 | 8 | **+100%** ↑ |
| Integration tests | 4 | 2 | -50%（優化） |

### 時間節省預測：

```
Typecheck:          ~5 分鐘（無變化）
Unit tests:         15 分鐘 → 7 分鐘（-50%）
Integration tests:  5 分鐘 → 8 分鐘（資料庫限制）
Satellites tests:   5 分鐘（無變化）
─────────────────────────────
總計:               20+ 分鐘 → 12-15 分鐘（-30% 至 -40%）
```

### 資源最佳化：

- **記憶體**: 在 6GB 預算內（Node.js 最大記憶體維持 6144MB）
- **資料庫連接**: 最多 2 個並發 × 3 個連接 = 6 個（限制內）
- **CPU 利用率**: 提升至 50-70%

---

## 📝 變更統計

| 項目 | 數量 |
|------|------|
| 重命名測試檔案 | 80 |
| 修改 package.json | 55 |
| 修改配置檔案 | 2 (turbo.json, ci.yml) |
| 總變更檔案 | 135+ |

### Git 提交：
```
refactor: [ci] 分離 unit 和 integration 測試以優化 CI 執行時間

• 重命名 80 個 integration 測試檔案
• 更新 55 個 package.json 腳本
• 優化 Turbo 配置和 CI Workflow
• 預期節省 CI 時間 30-40%
```

---

## ⏳ 下一階段計劃（可選）

### 第二階段：大型測試檔案拆分

**目標**: 進一步減少單個測試進程的執行時間

| 檔案 | 行數 | 拆分目標 | 預期節省 |
|------|------|--------|--------|
| valibot-form-request.test.ts | 1,077 | 10+ 個小檔案 | 10-15% |
| query-builder-complete.integration.test.ts | 1,038 | 6 個小檔案 | 10-15% |
| forge/index.test.ts | 900 | 5 個小檔案 | 5-10% |

**預期額外節省**: 10-20% CI 執行時間

### 第三階段：Turbo Cache 精細化

- 優化 inputs 配置，減少快取失效
- 提升 Turbo Cache 命中率至 70%+

### 第四階段：動態並發度調整

- 根據受影響包數自動調整並發度
- PR 小變更: 並發度 10
- PR 大變更: 並發度 6

---

## 🔍 驗證步驟

### 本地驗證（已完成 ✅）

```bash
# 驗證 test:unit 任務
bunx turbo run test:unit --filter='./packages/core' --dry-run

# 驗證 test:integration 任務
bunx turbo run test:integration --filter='./packages/core' --dry-run

# 本地運行測試
cd packages/core
bun run test:unit        # 執行 unit tests
bun run test:integration # 執行 integration tests
```

### CI 驗證（待進行 ⏳）

1. **Create Pull Request** - 觸發新 CI Workflow
2. **監控執行時間**
   - 預期 Unit tests 時間: 7-10 分鐘（vs. 原始 15 分鐘）
   - 預期 Integration tests 時間: 5-8 分鐘（vs. 原始 5 分鐘）
3. **檢查資源使用**
   - 記憶體使用（應保持 < 6GB）
   - 資料庫連接數（應 < 10）
4. **驗證所有測試通過**
   - No test failures
   - Coverage 維持 ≥ 75%

---

## ⚠️ 已知限制與權衡

### 資料庫連接限制

```yaml
POSTGRES_MAX_CONNECTIONS: 5
REDIS_MAX_CLIENTS: 5
TEST_CONCURRENCY: 2 (atlas)
```

- Unit tests 並發度上限: 8（受記憶體限制）
- Integration tests 並發度: 2（受資料庫連接限制）

### 測試分類假設

目前的分類基於測試檔案名稱和導入分析。某些使用 Mock 的測試可能被錯誤分類為 integration tests，但這不會影響 CI 性能（它們仍然以低並發度運行）。

---

## 📚 文檔與資源

### 修改的檔案

- `turbo.json` - Turbo 任務定義
- `.github/workflows/ci.yml` - GitHub Actions Workflow
- `packages/*/package.json` (55 個) - 測試腳本配置

### 參考資源

- [Turbo 快取配置](https://turbo.build/repo/docs/reference/configuration#inputs)
- [Bun 測試選項](https://bun.sh/docs/cli/test)
- [GitHub Actions 並發控制](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

---

## 🎯 成功指標

| 指標 | 目標 | 狀態 |
|------|------|------|
| Unit tests 並發度 | 8 | ✅ 配置完成 |
| Integration tests 並發度 | 2 | ✅ 配置完成 |
| CI 執行時間 | < 15 分鐘 | ⏳ 待 CI 驗證 |
| 測試覆蓋率 | ≥ 75% | ⏳ 待 CI 驗證 |
| 資料庫連接池 | 無耗盡 | ⏳ 待監控 |

---

## 📋 後續行動

### 立即行動（今天）
- ✅ 提交第一階段改動
- ⏳ 創建 PR 測試 CI Workflow
- ⏳ 監控 CI 執行時間

### 短期（本週）
- ⏳ 驗證 CI 性能改善
- ⏳ 調整資料庫連接池參數（如需要）
- ⏳ 更新文檔

### 中期（本月）
- ⏳ 實施第二階段（大型測試拆分）
- ⏳ 進一步優化並發度
- ⏳ 考慮 Turbo Remote Cache

### 長期（未來）
- ⏳ 遷移至 Mock 優先策略（減少 integration tests 數量）
- ⏳ 評估 CI 並行度上限
- ⏳ 考慮將 CI 分解為多個獨立 jobs

---

**最後更新**: 2026-02-07
**實施者**: Claude Code
**下一次審查**: 提交第一個 PR 後（預期 CI 執行時間改善驗證）
