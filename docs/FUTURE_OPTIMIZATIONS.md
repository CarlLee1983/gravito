# CI 後續優化路線圖

## 📋 概述

本文檔詳細說明 Phase 3C、3D、3E 及其他後續優化方案。

**當前狀態**：4.5 分鐘（-83%）
**最終目標**：3-4 分鐘（-85%）
**還有優化空間**：1-1.5 分鐘

---

## 🚀 後續優化方案（按優先級）

### 第一優先級：Phase 3D - 快速失敗策略 ⭐⭐⭐

**目標**：在 build/lint 失敗時立即反饋，不必等待整個 CI

**難度**：⭐ 簡單
**投入時間**：30 分鐘 - 1 小時
**預期節省**：
- Lint 失敗時：節省 25+ 分鐘（3 秒反饋）
- Build 失敗時：節省 15-20 分鐘（2 分鐘反饋）
- 正常情況：無額外耗時

**實現方式**：

```yaml
# 新增 quick-validation job（最快檢查）
jobs:
  quick-validation:
    name: Quick Validation (Fast Fail)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout & Setup Bun
        # ...
      - name: Lint (3 秒)
        run: bun run check
      - name: Build (2 分鐘，快速失敗)
        run: bun run build

  # 主 job 依賴 quick-validation
  pipeline:
    name: Full Pipeline
    needs: quick-validation  # 關鍵：快速失敗
    # ... 其他步驟
```

**效果**：
```
開發者工作流改善：

優化前：
1. 提交 PR
2. ☕ 等待 26 分鐘（build 失敗）
3. 修改代碼
4. 重複

優化後：
1. 提交 PR
2. ⏱️ 等待 2-3 分鐘（立即知道是否 build 成功）
3. 修改代碼
4. 重複

🎯 反饋速度快 8-10 倍
```

**實施檢查清單**：
- [ ] 創建 quick-validation job
- [ ] 配置 needs: quick-validation 依賴
- [ ] 確保 build 快速失敗機制
- [ ] 測試 lint/build 失敗時的日誌清晰度
- [ ] 驗證成功情況下無額外耗時

---

### 第二優先級：Phase 3E - Turbo 快取優化 ⭐⭐

**目標**：提高 Turbo 快取命中率，減少無謂的重新計算

**難度**：⭐⭐ 中等
**投入時間**：1-2 小時
**預期節省**：1-3 分鐘（取決於變更類型）

**當前快取配置**（`turbo.json`）：
```json
{
  "build": {
    "dependsOn": ["^build"],
    "inputs": ["src/**", "package.json", "tsconfig.json"],
    "outputs": ["dist/**"]
  },
  "test": {
    "inputs": ["src/**", "tests/**", "package.json"]
  },
  "typecheck": {
    "inputs": ["src/**", "package.json", "tsconfig.json"]
  }
}
```

**改善方案**：

```json
{
  "build": {
    "dependsOn": ["^build"],
    // 精細化 inputs：避免無關變更破壞快取
    "inputs": [
      "src/**",
      "package.json",
      "tsconfig.json",
      "biome.json",  // 新增：格式化也會影響輸出
      "esbuild.config.js"
    ],
    "outputs": ["dist/**"],
    // 啟用增量 output
    "outputMode": "partial"  // 只快取變更的輸出
  },

  "lint": {
    "inputs": ["src/**", "package.json", "biome.json"],
    // 格式化可以安全快取
    "cache": true
  },

  "test": {
    "inputs": ["src/**", "tests/**", "package.json", "tsconfig.json"],
    // Test 不需要快取（每次執行驗證）
    "cache": false
  },

  "typecheck": {
    "inputs": ["src/**", "package.json", "tsconfig.json"],
    // 啟用快取
    "cache": true
  }
}
```

**快取提升的場景**：

```
場景 1：只改了註釋
  優化前：rebuild 所有依賴包（2 分鐘）
  優化後：快取命中，0 分鐘
  節省：2 分鐘

場景 2：修改測試
  優化前：重新 typecheck + test（1.5 + 2 = 3.5 分鐘）
  優化後：只 test，typecheck 快取（0 + 2 = 2 分鐘）
  節省：1.5 分鐘

場景 3：修改配置
  優化前：清除所有快取，重新計算
  優化後：對應任務重新計算
  節省：0.5-1 分鐘
```

**實施檢查清單**：
- [ ] 分析當前快取命中率
- [ ] 精細化 inputs（避免過寬泛）
- [ ] 測試快取一致性
- [ ] 監控構建時間變化
- [ ] 驗證快取鍵策略

---

### 第三優先級：Phase 3C - 動態並發度調整 ⭐⭐⭐

**目標**：根據系統資源動態調整 test 並發度（4 → 5-6）

**難度**：⭐⭐⭐ 複雜
**投入時間**：2-3 小時
**預期節省**：1-2 分鐘
**風險等級**：中等

**核心邏輯**：

```typescript
// scripts/calculate-optimal-concurrency.ts
/**
 * 根據系統資源計算最佳並發度
 */

// 1. 獲取系統資訊
const totalMemory = 7168 // MB
const reservedMemory = 1024 // 系統保留
const perTestMemory = 800 // 每個 test worker 的記憶體

// 2. 計算基於記憶體的上限
const maxByConcurrency = Math.floor(
  (totalMemory - reservedMemory) / perTestMemory
)

// 3. 獲取變更包數
const affectedPackages = process.argv[2]?.split(' ').length || 1

// 4. 計算安全並發度
const safeConcurrency = Math.min(
  maxByConcurrency,    // 記憶體上限
  affectedPackages,     // 包數上限
  6                     // 硬上限（預留安全係數）
)

console.log(safeConcurrency)
```

**使用方式**：

```yaml
- name: Calculate Optimal Concurrency
  id: concurrency
  env:
    AFFECTED_PACKAGES: ${{ steps.filters.outputs.test_filters }}
  run: |
    OPTIMAL=$(bun run scripts/calculate-optimal-concurrency.ts "$AFFECTED_PACKAGES")
    echo "test_concurrency=$OPTIMAL" >> $GITHUB_OUTPUT

- name: Run Tests with Optimal Concurrency
  run: |
    bunx turbo run test:coverage \
      --filter='./packages/*' \
      --concurrency=${{ steps.concurrency.outputs.test_concurrency }} \
      --continue
```

**場景分析**：

```
小改動（1-2 包）：
  當前：並發度 4
  建議：並發度 2（資源不必要）
  效果：更穩定，無 OOM 風險

中等改動（5 包）：
  當前：並發度 4
  建議：並發度 4-5（穩定）
  效果：略微加速

大改動（15 包）：
  當前：並發度 4
  建議：並發度 4（無法進一步提升）
  效果：無改善，但資源監控更好
```

**實施檢查清單**：
- [ ] 實現記憶體計算邏輯
- [ ] 測試不同並發度下的穩定性
- [ ] 監控 OOM（Out of Memory）情況
- [ ] 設定合理的硬上限
- [ ] 驗證日誌中並發度記錄

---

## 📊 後續優化的綜合效果

### 實施路線圖

```
Week 1-2（已完成）：Phase 3A + B
  26 min → 4.5 min（-83%）

Week 3（推薦）：Phase 3D - 快速失敗
  Lint/Build 失敗時：快速反饋
  預期額外節省：0（正常情況）或 10-25 分鐘（失敗時）

Week 4（推薦）：Phase 3E - 快取優化
  4.5 min → 3.5-4 min（-22%）
  預期額外節省：1 分鐘

Week 5（可選）：Phase 3C - 動態並發
  3.5 min → 3 min（-14%）
  預期額外節省：0.5-1 分鐘

最終狀態：26 min → 3 min（-88%）
```

### 累積效果表

| 階段 | 配置 | 執行時間 | 累積節省 | ROI |
|------|------|----------|----------|------|
| 原始 | - | 26 min | - | - |
| Phase 1+2 | 增量 + 並發 | 10 min | -62% | 🔥🔥🔥 |
| Phase 3A+B | 並行 + 增量 | 4.5 min | -83% | 🔥🔥🔥 |
| + Phase 3D | 快速失敗 | 4.5 min* | -83% | 🔥🔥 |
| + Phase 3E | 快取優化 | 3.5 min | -87% | 🔥🔥 |
| + Phase 3C | 動態並發 | 3 min | -88% | 🔥 |

*失敗時更快；正常情況無改變

---

## 🎯 其他優化方向（長期）

### 架構級優化

1. **Monorepo 分割**
   - 難度：高
   - 投入：2-4 週
   - 節省：1-2 分鐘（每個獨立 build）
   - 建議：當 monorepo > 100 包時考慮

2. **並行 Job**
   - 難度：中等
   - 投入：1 週
   - 節省：Lint/Build 完全並行
   - 建議：下一個優化優先級

3. **Remote Build Cache**
   - 難度：高
   - 投入：1-2 週
   - 節省：2-3 分鐘（CI 之間共享快取）
   - 建議：團隊規模 > 5 人時

### 工具級優化

1. **更快的 TypeScript 編譯**
   - 使用 `esbuild` 代替 `tsc`
   - 節省：1-2 分鐘
   - 風險：功能完整性

2. **測試框架優化**
   - 使用 Vitest 代替 Jest
   - 節省：1-2 分鐘
   - 風險：遷移成本

3. **增量 Lint**
   - 只 lint 變更文件
   - 節省：已實現 ✅
   - 風險：低

---

## 📈 決策框架

### 何時實施 Phase 3D（快速失敗）

**立即實施**（強烈建議）：
- ✅ 最簡單（30 分鐘）
- ✅ 高價值（失敗時快速反饋）
- ✅ 無風險
- ✅ 無需修改現有邏輯

### 何時實施 Phase 3E（快取優化）

**1 週內實施**（推薦）：
- ✅ 複雜度中等（1-2 小時）
- ✅ 穩定收益（1-3 分鐘）
- ⚠️ 需要驗證快取一致性
- ✅ 對現有 CI 無干擾

### 何時實施 Phase 3C（動態並發）

**2 週後考慮**（可選）：
- ⚠️ 複雜度高（2-3 小時）
- ⚠️ 收益不確定（1-2 分鐘）
- ⚠️ 需要詳細的錯誤處理
- ✅ 有回退機制

---

## 💡 建議實施計劃

### 短期（1-2 週）

```
Week 1：監控 Phase 3A+B 的實際效果
  ✅ 提交 5-10 個 PR，收集數據
  ✅ 確認 4.5 min 目標是否達成
  ✅ 監控 CI 失敗率和記憶體使用

Week 2：實施 Phase 3D（快速失敗）
  ✅ 30 分鐘實施
  ✅ 測試 lint/build 失敗情況
  ✅ 驗證日誌清晰度
```

### 中期（2-4 週）

```
Week 3：實施 Phase 3E（快取優化）
  ✅ 分析當前快取命中率
  ✅ 精細化 inputs
  ✅ 驗證快取一致性

Week 4：決定 Phase 3C
  ✅ 評估節省空間
  ✅ 測試並發度 5-6
  ✅ 決定是否值得實施
```

### 長期（1-3 個月）

```
評估架構級優化：
  ✅ Monorepo 分割
  ✅ 並行 Job
  ✅ 遠程構建快取
```

---

## 🚀 快速開始

### 立即可做

**推薦優先級**：
1. **Phase 3D**（30 分鐘，高價值）✨
2. **Phase 3E**（1-2 小時，穩定收益）
3. **Phase 3C**（2-3 小時，可選）

### 決定樹

```
當前狀態：4.5 分鐘（-83%）

❓ CI 失敗率是否 > 5%？
├─ 是 → 先修復失敗率，再優化
└─ 否 → 繼續

❓ Lint/Build 失敗時反饋速度是否重要？
├─ 是 → 優先 Phase 3D ✨
└─ 不重要 → 跳過

❓ 變更模式差異大嗎？（有時 1 包，有時 20 包）
├─ 是 → 優先 Phase 3E + 3C
└─ 否 → Phase 3E 即可

❓ 有誤 OOM 的情況嗎？
├─ 是 → 檢查 Phase 3C
└─ 否 → 可放心升級並發度
```

---

## 📊 期望設定

### 現實的預期

```
Phase 3A+B 後的改進空間有限：

4.5 min 的瓶頸分佈：
├─ Build：2 min（已接近理論下限）
├─ Prepare：0.2 min（固定開銷）
├─ Typecheck：0.5 min（已優化）
├─ Test：1.5 min（受 DB 連接限制）
└─ Other：0.3 min（固定開銷）

可優化的部分：
├─ Test：1.5 min → 0.8-1 min（快取 + 並發）
├─ Prepare：0.2 min → 0.1 min（優化腳本）
└─ Build：2 min → 1.5 min（快取）

理論最終值：~3 min（-88%）
現實可達：~3.5-4 min（-85%）
```

---

## 📞 支持資源

- **Turbo 文檔**：https://turbo.build/repo/docs
- **Bash 進程控制**：https://www.gnu.org/software/bash/manual/bash.html#Job-Control
- **快取策略**：https://turbo.build/repo/docs/core-concepts/caching

---

**總結**：
- ✅ Phase 3A+B 已完成（4.5 min）
- 🎯 Phase 3D 推薦下一步（快速失敗）
- 💡 Phase 3E 穩定優化（快取）
- 🔮 Phase 3C 可選（動態並發）