# CI 優化實現指南

## 概述

本文檔記錄 Gravito Core CI 執行時間優化的實現過程、效果監控和持續改進計劃。目標是將 PR CI 執行時間從 **26 分鐘** 減少至 **8-12 分鐘**。

## 實施階段

### 階段一：Build 增量化 + 測試並發度優化 ✅ 已完成

**實現日期**：2026-02-06

**改動清單**：

1. **新增腳本** `scripts/get-affected-packages.ts`
   - 偵測變更的包（與指定 ref 比較）
   - 建立依賴圖並遞歸找出受影響的包
   - 支援多種輸出格式（Turbo filter / 文件路徑）

2. **Build 增量化** (`.github/workflows/ci.yml`)
   - PR 時：只 build 變更包及其依賴
   - Main 時：全量 build（安全網）
   - **預期節省**：60-80% build 時間

3. **Lint 增量化** (`.github/workflows/ci.yml`)
   - PR 時：只檢查變更包的源碼
   - Main 時：全量檢查
   - **預期節省**：80% lint 時間

4. **Test 並發度提升** (`.github/workflows/ci.yml`)
   - 並發度：`2 → 4`
   - 加 `--continue` 避免一個包失敗就中斷
   - **預期節省**：30-40% 執行時間

**本地驗證結果**：

```bash
# 修改 packages/photon 後
$ bun run ci:affected --base main
# ✅ 正確輸出：photon 及其所有依賴包的 filter 參數

$ bun run ci:affected:lint --base main
# ✅ 正確輸出：受影響包的 src 路徑
```

**預期效益**（以修改 5 個包為例）：

| 步驟 | 現狀 | 優化後 | 節省 |
|------|------|--------|------|
| Build | 8 分鐘 | 2 分鐘 | -75% |
| Lint | 3 分鐘 | 0.5 分鐘 | -83% |
| Typecheck | 5 分鐘 | 3 分鐘 | -40% |
| Test | 10 分鐘 | 6 分鐘 | -40% |
| **總計** | **26 分鐘** | **11.5 分鐘** | **-56%** |

---

### 階段二：Typecheck 並發度優化 + 資源監控 ✅ 已完成

**實現日期**：2026-02-06

**改動清單**：

1. **Typecheck 並發度提升** (`.github/workflows/ci.yml`)
   - 並發度：`4 → 6`（從原本 2 提升 3 倍）
   - 記憶體評估：6GB 預算，並發度 6 需要約 4.8GB（安全範圍）
   - **預期節省**：40-50% 執行時間

2. **資料庫連接池配置**
   ```yaml
   DB_POOL_SIZE: "3"
   REDIS_MAX_CLIENTS: "5"
   POSTGRES_MAX_CONNECTIONS: "5"
   ```
   - 避免並發度過高導致連接池耗盡
   - Test 並發度保持 4（考慮資料庫連接池限制）

3. **系統資源監控** (`.github/workflows/ci.yml`)
   - 新增 Monitor System Resources 步驟
   - 追踪記憶體、磁碟使用情況
   - 用於評估後續優化方向

**預期效益總合**：

| 步驟 | 階段一後 | 階段二後 | 比例 |
|------|----------|----------|------|
| Build | 2 分鐘 | 2 分鐘 | - |
| Lint | 0.5 分鐘 | 0.5 分鐘 | - |
| Typecheck | 3 分鐘 | 1.5 分鐘 | -50% |
| Test | 6 分鐘 | 6 分鐘 | - |
| **總計** | **11.5 分鐘** | **10 分鐘** | **-62%** |

---

## 監控與評估

### 關鍵指標

1. **執行時間**
   - PR 平均執行時間
   - 各步驟執行時間分佈
   - Vs. Main branch 基準線

2. **失敗率**
   - 目標：< 5%（與優化前一致）
   - 重點監控：並發度提升後的 flaky tests

3. **資源使用**
   - 記憶體峰值（目標：< 5.5GB）
   - 磁碟使用趨勢
   - 資料庫連接數

### 監控方式

1. **GitHub Actions Logs**
   - 每個 PR 的執行時間可在 Actions 標籤頁查看
   - Monitor System Resources 步驟記錄資源使用

2. **本地測試**
   ```bash
   # 測試受影響包
   bun run ci:affected --base origin/main

   # 模擬 build 時間
   FILTERS=$(bun run ci:affected --base origin/main)
   time bunx turbo run build $FILTERS
   ```

3. **CI 模擬**
   ```bash
   bun run ci:test              # 直接執行 CI
   bun run ci:test:act          # 用 act 工具模擬
   ```

---

## 風險評估與緩解

| 風險 | 概率 | 影響 | 緩解措施 |
|------|------|------|----------|
| 依賴圖計算錯誤 | 低 | 中 | Main branch 保持全量；可視需要新增單測 |
| 資料庫連接池耗盡 | 低 | 高 | 設定 POSTGRES_MAX_CONNECTIONS=5 |
| 記憶體不足 | 極低 | 中 | 4.8GB vs 6GB 預算；可降並發度至 4 |
| Test flaky failures | 中 | 低 | 監控失敗率；--continue flag 避免中斷 |
| Turbo cache 失效 | 低 | 低 | 保留現有快取配置；支援 --force 回退 |

---

## 後續優化方向（計劃中）

### 短期（1-2 週）

1. **監控基準線建立**
   - 收集 10+ PR 的執行時間數據
   - 計算平均、最小、最大執行時間
   - 識別 flaky tests

2. **Flaky Test 修復**
   - 識別並隔離不穩定的測試
   - 重新執行失敗的測試以驗證
   - 必要時調整超時時間

3. **並發度細粒度優化**
   - 根據資源監控結果，評估是否可進一步提升
   - 例如：Test 並發度 4 → 5（若資料庫穩定）

### 中期（2-4 週）

1. **Build Cache 優化**
   - 分析 Turbo cache 命中率
   - 優化 cache key 策略
   - 評估分層快取可行性

2. **Lint 進一步優化**
   - 分析 biome check 耗時（可能已達到 0.5 分鐘下限）
   - 評估是否可分離非必要檢查
   - 考慮漸進式格式化

3. **測試套件優化**
   - 分析哪些測試耗時較長
   - 考慮 sharded testing（測試按包分片並行）
   - 標記慢速測試並隔離

### 長期（1-3 個月）

1. **架構級優化**
   - 評估是否可拆分 monorepo 提高增量效率
   - 考慮 workspace 級別的 build 策略

2. **智能快取策略**
   - 基於檔案變更類型的選擇性 build
   - 依賴時序優化的 Turbo 調度

3. **CI/CD 流水線重構**
   - 分離快速檢查（lint）和詳細檢查（test）
   - 並行執行獨立 job 的可行性

---

## 本地開發指南

### 快速測試 CI 優化效果

#### 1. 查看受影響的包

```bash
# 查看變更後會 build 的包
bun run ci:affected --base origin/main

# 查看會被 lint 檢查的路徑
bun run ci:affected:lint --base origin/main
```

#### 2. 本地模擬增量 build

```bash
# 取得 filter 參數
FILTERS=$(bun run ci:affected --base origin/main)

# 執行增量 build
if [ -n "$FILTERS" ]; then
  time bunx turbo run build $FILTERS
else
  echo "沒有包變更"
fi
```

#### 3. 測試並發度

```bash
# 測試 typecheck 的不同並發度
time bunx turbo run typecheck --concurrency=4 --filter='./packages/*'
time bunx turbo run typecheck --concurrency=6 --filter='./packages/*'

# 比較執行時間
```

#### 4. 完整 CI 模擬

```bash
# 直接執行 CI 邏輯
bun run ci:test

# 或使用 act 工具
bun run ci:test:act
```

---

## 故障排除

### 問題：增量 build 遺漏某些包

**症狀**：修改包 A 後，依賴 A 的包 B 沒有被 build

**解決方案**：
1. 驗證依賴圖是否正確：
   ```bash
   bun run ci:affected --base origin/main
   ```
2. 檢查 package.json 中 B 是否有正確依賴 A
3. 若無錯誤，可提交 issue

### 問題：並發度提升後 test 失敗

**症狀**：並發度 4 或 6 時出現間歇性 test 失敗

**解決方案**：
1. 降低並發度重新運行：
   ```bash
   cd packages/failing-package
   bun test --concurrency=1
   ```
2. 檢查 test 是否有全域狀態污染
3. 檢查資料庫連接是否正確隔離

### 問題：記憶體不足

**症狀**：CI 超時，日誌顯示 OOM（Out of Memory）

**解決方案**：
1. 臨時降低並發度（Typecheck: 6→4）
2. 檢查 NODE_OPTIONS 設定
3. 提交 issue 並收集資源監控數據

---

## 效果追蹤

### 預期達成時間表

- **開啟 PR**：立即看到 build + lint 優化效果（節省 10-20 分鐘）
- **並發度優化**：Typecheck 加速應立即顯現
- **穩定期**：1 週後應達到平穩狀態，可評估後續優化

### 評估檢查點

- [ ] 第一個 PR 執行時間 < 15 分鐘
- [ ] 5 個 PR 後，失敗率 < 5%
- [ ] 10 個 PR 後，確認平均執行時間
- [ ] 資源監控正常，無 OOM 報警

---

## 相關檔案

- **優化核心腳本**：`scripts/get-affected-packages.ts`
- **CI 配置**：`.github/workflows/ci.yml`
- **快捷命令**：`package.json` 的 `ci:affected` 系列
- **計劃文檔**：本檔案

---

## 提交記錄

```
a8bd42be feat: [ci] 實現 CI 執行時間優化 - 增量 build + 並發度提升
9b4a67be feat: [ci] 添加便利的 CI 優化腳本快捷方式
3b909d4a feat: [ci] 階段二 - Typecheck 並發度優化 + 資源監控
```

---

**最後更新**：2026-02-06
**維護者**：CI Optimization Task
