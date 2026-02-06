# CI 優化實現指南

## 概述

本文檔記錄 Gravito Core CI 執行時間優化的實現過程。目標是將 PR CI 執行時間從 **26 分鐘** 減少至 **6-10 分鐘**。

## CI 架構

### Job 結構

```
validate (Lint & Build)    ← 快速失敗閘門，無 DB 服務
    │
    ▼
test (Typecheck & Test)    ← 主要流水線，含 DB 服務
```

- **validate**：執行 Lint + Build，快速攔截語法和編譯錯誤
- **test**：依賴 validate 通過後執行 Typecheck 和 Test（並行），利用 turbo cache 跨 job 共享 build 成果

### PR vs Main 策略

| 行為 | PR | Main |
|------|-----|------|
| Lint | 增量（僅變更包） | 全量 |
| Build | 增量（僅變更包及依賴） | 全量 |
| Typecheck | 增量（僅變更包及依賴） | 全量 |
| Test | 增量（僅變更包，`test`） | 全量（`test:coverage` + `test`） |
| 整合測試 | 關閉（加速） | 開啟 |

---

## 核心優化策略

### 1. 增量化（PR 模式）

`scripts/get-affected-packages.ts` 偵測變更的包，建立反向依賴圖遞歸找出所有受影響的包。

```bash
# 查看受影響的包
bun run ci:affected --base origin/main

# 查看受影響的路徑（用於 lint）
bun run ci:affected:lint --base origin/main
```

### 2. 並行執行

Typecheck 和 Test 在同一步驟中以背景程序並行執行：

```bash
(bunx turbo run typecheck $FILTERS --concurrency=6) &
(bunx turbo run test $FILTERS --concurrency=4 --continue) &
wait ...
```

### 3. Turbo Cache 跨 Job 共享

validate job 的 build 結果透過 `actions/cache@v4` 存入 turbo cache，test job 還原後 build 步驟近乎即時完成。

### 4. 並發度配置

| 任務 | 並發度 | 說明 |
|------|--------|------|
| Build | 4 | 無 DB 依賴，可較高 |
| Typecheck | 6 | 以 I/O 為主，記憶體需求約 4.8GB |
| Test | 4 | 受 DB 連接池限制 |

資料庫連接池：`DB_POOL_SIZE=3`、`REDIS_MAX_CLIENTS=5`、`POSTGRES_MAX_CONNECTIONS=5`

---

## 預期效益（以修改 5 個包為例）

| 步驟 | 優化前 | 優化後（PR） | 節省 |
|------|--------|-------------|------|
| Lint | 3 min | 0.5 min | -83% |
| Build | 8 min | 2 min | -75% |
| Typecheck | 5 min | 0.5 min（增量+並行） | -90% |
| Test | 10 min | 2 min（增量+並行） | -80% |
| **總計** | **26 min** | **~6 min** | **~77%** |

Main 分支保持全量檢查，不享受增量化紅利。

---

## 風險評估與緩解

| 風險 | 概率 | 影響 | 緩解措施 |
|------|------|------|----------|
| 依賴圖計算錯誤 | 低 | 中 | Main 保持全量檢查 |
| 資料庫連接池耗盡 | 低 | 高 | 設定 POSTGRES_MAX_CONNECTIONS=5 |
| 記憶體不足 | 極低 | 中 | 總並發 ~10 tasks，6GB 預算足夠 |
| Test flaky failures | 中 | 低 | `--continue` flag，監控失敗率 |
| Turbo cache 跨 job 失效 | 低 | 低 | test job 保留完整 build 步驟作為回退 |

---

## 本地開發指南

```bash
# 查看受影響的包
bun run ci:affected --base origin/main

# 模擬增量 build
FILTERS=$(bun run ci:affected --base origin/main)
time bunx turbo run build $FILTERS

# 測試不同並發度
time bunx turbo run typecheck --concurrency=6 --filter='./packages/*'

# 完整 CI 模擬
bun run ci:test:optimize --base origin/main
```

---

## 故障排除

### 增量 build 遺漏某些包

1. 驗證依賴圖：`bun run ci:affected --base origin/main`
2. 檢查 package.json 依賴聲明是否正確
3. Main 分支全量 build 作為安全網

### 並發度提升後 test 失敗

1. 降低並發度：`bun test --concurrency=1`
2. 檢查是否有全域狀態污染
3. 檢查資料庫連接隔離

### 記憶體不足 (OOM)

1. 降低並發度（Typecheck: 6→4，Test: 4→2）
2. 檢查 `NODE_OPTIONS --max-old-space-size` 設定

---

## 相關檔案

- **CI 配置**：`.github/workflows/ci.yml`
- **受影響包偵測**：`scripts/get-affected-packages.ts`
- **本地測試工具**：`scripts/test-ci-optimization.ts`
- **Turbo 配置**：`turbo.json`

---

**最後更新**：2026-02-07
