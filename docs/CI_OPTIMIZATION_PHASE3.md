# CI 優化 Phase 3：進階改善方案

## 概述

基於當前已實施的階段一、二優化，本文檔提出 **Phase 3 的進階改善方案**，預期進一步減少 20-30% 的 CI 執行時間。

---

## 🔍 當前瓶頸分析

### 1. Typecheck & Test 順序執行瓶頸

**現狀**：
```
Build (2 min)
  ↓
Typecheck (1.5 min) + Test (6 min) [順序執行]
  ↓
Check Unused Imports (1 min)
──────────────────
總計：10.5 min
```

**問題**：
- Typecheck 和 Test 是順序執行，不是並行
- Typecheck 完成後才開始 Test，浪費 Typecheck 完成時間

**改善潛力**：1-2 分鐘節省

---

### 2. Test 增量化未實現

**現狀**：
- Build 已增量化 ✅
- Lint 已增量化 ✅
- Typecheck 未增量化 ❌
- Test 未增量化 ❌

**分析**：
- Typecheck：可以加 filter 參數只檢查變更包
- Test：可以加 filter 參數只測試變更包

**改善潛力**：2-3 分鐘節省（中等變更場景）

---

### 3. Test 並發度上限

**現狀**：
- Test 並發度：4（受資料庫連接池限制）
- 資料庫連接設定：POSTGRES_MAX_CONNECTIONS=5

**問題**：
- 連接池設定可能過保守
- 大多數 test 不需要真實資料庫連接

**改善潛力**：1-2 分鐘節省（並發度 4 → 5-6）

---

### 4. Build 並發度優化

**現狀**：
- 增量 build：2 分鐘
- 可能仍有優化空間

**問題**：
- Turbo 建構並發度未調整
- esbuild/tsc 並發度未優化

**改善潛力**：0.5-1 分鐘節省

---

### 5. 快速失敗策略缺失

**現狀**：
```
Build → Typecheck → Test → Check Unused Imports
```

**問題**：
- Lint 和 Build 相對快速，應該優先執行
- 若 Build 失敗，沒必要執行後續步驟

**改善潛力**：10-20 分鐘（在 build 失敗時）

---

## 💡 Phase 3 改善方案

### 方案 A：Typecheck & Test 並行執行

**難度**：⭐ 簡單
**預期節省**：1-2 分鐘（Test 從 6 min 縮短至並行時間）
**實施時間**：30 分鐘

**具體實現**：

```yaml
# 改為並行執行
- name: Run Typecheck & Tests (Parallel)
  run: |
    # 後台執行 typecheck
    bunx turbo run typecheck \
      --filter='./packages/*' \
      --filter='./satellites/*' \
      --concurrency=6 &
    TYPECHECK_PID=$!

    # 並行執行 test
    bunx turbo run test:coverage \
      --filter='./packages/*' \
      --concurrency=4 \
      --continue &
    TEST_PID=$!

    # 等待兩者完成
    wait $TYPECHECK_PID
    TYPECHECK_EXIT=$?
    wait $TEST_PID
    TEST_EXIT=$?

    # 檢查結果
    [ $TYPECHECK_EXIT -eq 0 ] || exit 1
    [ $TEST_EXIT -eq 0 ] || exit 1
```

**效果**：
```
執行前：Build (2) → Typecheck (1.5) + Test (6) = 9.5 min
執行後：Build (2) → max(Typecheck 1.5, Test 6) = 8 min
節省：1.5 分鐘
```

---

### 方案 B：Test/Typecheck 增量化

**難度**：⭐⭐ 中等
**預期節省**：2-3 分鐘（中等變更）
**實施時間**：1-2 小時

**具體實現**：

```yaml
- name: Run Typecheck & Tests (Incremental)
  env:
    BASE_REF: ${{ github.event_name == 'pull_request' && format('origin/{0}', github.base_ref) || '' }}
  run: |
    if [ "${{ github.event_name }}" == "pull_request" ] && [ -n "$BASE_REF" ]; then
      # 增量 typecheck
      FILTERS=$(bun run scripts/get-affected-packages.ts --base "$BASE_REF" --mode typecheck)
      if [ -n "$FILTERS" ]; then
        bunx turbo run typecheck $FILTERS --concurrency=6
      fi

      # 增量 test
      TEST_FILTERS=$(bun run scripts/get-affected-packages.ts --base "$BASE_REF" --mode test)
      if [ -n "$TEST_FILTERS" ]; then
        bunx turbo run test:coverage $TEST_FILTERS --concurrency=4 --continue
      fi
    else
      # Main: 全量檢查
      bunx turbo run typecheck --filter='./packages/*' --concurrency=6
      bunx turbo run test:coverage --filter='./packages/*' --concurrency=4 --continue
    fi
```

**效果**：
```
修改 5 個包時：
執行前：Typecheck (1.5) + Test (6) = 7.5 min
執行後：Typecheck (0.5) + Test (2) = 2.5 min
節省：5 分鐘

修改 15 個包時：
執行前：7.5 min
執行後：3-4 min
節省：3-4.5 分鐘
```

---

### 方案 C：Test 並發度動態調整

**難度**：⭐⭐⭐ 複雜
**預期節省**：1-2 分鐘
**實施時間**：2-3 小時

**具體實現**：

```bash
#!/usr/bin/env bun
/**
 * 動態計算最佳並發度
 */

// 根據系統記憶體動態調整
const totalMemory = Number(process.env.GITHUB_ACTIONS_MEMORY || '7168') // MB
const reservedMemory = 1024 // 保留給系統
const perConcurrencyMemory = 800 // 每個並發需要的記憶體

const maxConcurrency = Math.floor(
  (totalMemory - reservedMemory) / perConcurrencyMemory
)

// 根據包數動態調整
const affectedPackages = process.argv[2]?.split(' ').length || 1
const safeConcurrency = Math.min(maxConcurrency, affectedPackages)

console.log(safeConcurrency)
```

**在 CI 中使用**：

```yaml
- name: Calculate Optimal Concurrency
  id: concurrency
  run: |
    CONCURRENCY=$(bun run scripts/calculate-concurrency.ts "$FILTERS")
    echo "test_concurrency=$CONCURRENCY" >> $GITHUB_OUTPUT

- name: Run Tests with Optimal Concurrency
  run: |
    bunx turbo run test:coverage \
      --filter='./packages/*' \
      --concurrency=${{ steps.concurrency.outputs.test_concurrency }} \
      --continue
```

---

### 方案 D：快速失敗策略

**難度**：⭐ 簡單
**預期節省**：10-20 分鐘（build 失敗時）
**實施時間**：30 分鐘

**具體實現**：

```yaml
jobs:
  # 新增快速驗證 job
  quick-check:
    name: Quick Validation (Fast Fail)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Run Quick Checks
        run: |
          # 1. Lint (最快，3 秒)
          bun run check
          # 2. Build (如果 lint 通過，執行 build)
          bun run build

  # 主要 job 依賴 quick-check
  pipeline:
    name: Build, Typecheck & Test
    needs: quick-check  # 關鍵：等待 quick-check 通過
    # ... 其餘配置
```

**效果**：
```
Lint 失敗時：
執行前：等待全部 CI (26 min)
執行後：3 秒即反饋，節省 25.57 min ✅

Build 失敗時：
執行前：等待全部 CI (26 min)
執行後：快速失敗，節省 15-20 min ✅
```

---

### 方案 E：Turbo 快取優化

**難度**：⭐⭐ 中等
**預期節省**：1-3 分鐘
**實施時間**：1-2 小時

**當前配置**（`turbo.json`）：
```json
{
  "build": {
    "dependsOn": ["^build"],
    "inputs": ["src/**", "package.json", "tsconfig.json"],
    "outputs": ["dist/**", ".next/**"]
  }
}
```

**改善建議**：

```json
{
  "build": {
    "dependsOn": ["^build"],
    // 1. 精細化 inputs，避免無關變更破壞快取
    "inputs": [
      "src/**",
      "package.json",
      "tsconfig.json",
      "biome.json"  // 添加：格式化也會影響輸出
    ],
    "outputs": ["dist/**", ".next/**"],
    // 2. 啟用增量 output
    "outputMode": "partial"
  },

  "test": {
    "inputs": ["src/**", "tests/**", "package.json", "tsconfig.json"],
    // 3. Test 不需要快取整個輸出
    "outputs": [".coverage/**", "junit.xml"],
    "cache": false  // 不快取，每次都執行
  },

  "typecheck": {
    "inputs": ["src/**", "package.json", "tsconfig.json"],
    // 4. 啟用分散快取
    "cache": true
  }
}
```

---

## 📊 Phase 3 預期效果對比

### 綜合實施所有改善

| 方案 | 單獨節省 | 累積節省 | 難度 | 優先級 |
|------|----------|----------|------|--------|
| 當前狀態 | - | **10 min** | - | - |
| A：並行執行 | -1.5 min | **8.5 min** | ⭐ | 高 |
| + B：增量化 | -2.5 min | **6 min** | ⭐⭐ | 高 |
| + C：動態並發 | -1 min | **5 min** | ⭐⭐⭐ | 中 |
| + D：快速失敗 | -25 min* | **失敗時快速反饋** | ⭐ | 中 |
| + E：快取優化 | -1 min | **4 min** | ⭐⭐ | 低 |

*build 失敗時

### 最終預期（全部方案實施）

```
當前狀況（26 min）
    ↓
階段一、二優化（10 min，-62%）✅ 已完成
    ↓
Phase 3 全部方案（4 min，-87%）
    ├─ Build 並行/增量：1.5 min
    ├─ Lint：0.3 min（已增量化）
    ├─ Typecheck + Test 並行增量：2 min
    └─ Check Unused Imports：0.2 min
    ↓
🎯 目標達成：26 min → 4 min（-85%）
```

---

## 🚀 實施建議

### 優先級排序

**第一輪（必做，預期節省 3-4 分鐘）**：
1. ✅ 方案 A：Typecheck & Test 並行執行
2. ✅ 方案 B：Test/Typecheck 增量化

**第二輪（推薦，預期節省 1-2 分鐘）**：
3. 方案 D：快速失敗策略
4. 方案 E：快取優化

**第三輪（可選）**：
5. 方案 C：動態並發度調整

### 實施順序

```
Week 1：
  Day 1: 實施方案 A（並行執行）
  Day 2: 驗證並合併

Week 2：
  Day 1-2: 實施方案 B（增量化 test/typecheck）
  Day 3: 驗證並合併

Week 3：
  Day 1: 實施方案 D（快速失敗）
  Day 2-3: 測試和監控

Week 4：
  可選：方案 E 和 C
```

---

## ⚠️ 風險評估

| 方案 | 風險 | 緩解 |
|------|------|------|
| A：並行執行 | 資源爭搶 | 監控記憶體使用 |
| B：增量化 | 遺漏依賴 | 現有邏輯已驗證，低風險 |
| C：動態並發 | 計算邏輯錯誤 | 有回退機制 |
| D：快速失敗 | 依賴順序錯誤 | 測試充分 |
| E：快取優化 | 快取失效 | Turbo 已驗證 |

---

## 📈 監控指標

實施後應監控：

1. **執行時間分佈**
   - Build 時間
   - Typecheck 時間
   - Test 時間
   - 總耗時

2. **資源使用**
   - 峰值記憶體
   - CPU 利用率
   - 磁碟 I/O

3. **穩定性**
   - CI 失敗率
   - Flaky test 比率
   - 超時次數

---

## 🎓 參考資源

- **Turbo 優化**：https://turbo.build/repo/docs/core-concepts/caching
- **並行執行**：Bash job control (`&` 和 `wait`)
- **增量測試**：Similar to `check-unused-imports.ts`

---

**預期完成時間**：2-4 週
**預期最終結果**：26 min → 4 min（-85%）
**ROI**：非常高（投入小，回報大）

---

## 快速評估

想立即實施 Phase 3 嗎？

- **快速勝利** 🎯：方案 A + B（3 小時，節省 3-4 分鐘）
- **完整優化** 💯：所有方案（2 週，節省 6+ 分鐘）
- **保守方案** 🛡️：僅方案 A（30 分鐘，節省 1.5 分鐘）

