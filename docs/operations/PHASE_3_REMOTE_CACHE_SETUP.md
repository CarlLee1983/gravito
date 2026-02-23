# Phase 3B：Vercel Turbo Remote Cache 設置指南

## 概述

本指南說明如何為 Gravito monorepo 啟用 **Vercel Turbo Remote Cache**，實現跨 PR、跨 commit 的快速緩存共享。

### 預期效果

- ✅ validate job：完整構建 → 上傳 Vercel cache（首次）；後續 cache hit → 跳過構建
- ✅ test job (4 shards)：利用 validate 的 Vercel cache，`build:dts` 快速 hit → 並行測試加速
- ✅ 跨 PR 效果：修改不同包時，未修改包的構建自動 cache hit
- 📊 **預期改善**：+5-15% 構建時間（Phase 1-2 已達成 10-15%，Phase 3 加速緩存共享）

---

## 前置條件

1. ✅ 代碼變更已推送並合併到遠端 main（或在 PR 中）
2. ✅ `turbo.json` 已添加 `remoteCache` 配置
3. ✅ `.github/workflows/ci.yml` 已添加 `TURBO_TOKEN` 和 `TURBO_TEAM` 環境變數

### 驗證代碼變更

在本地確認以下文件已修改：

```bash
# 檢查 turbo.json 是否有 remoteCache 配置
grep -A 3 "remoteCache" turbo.json

# 檢查 ci.yml validate job 中 Build step 是否有 env
grep -A 2 "TURBO_TOKEN" .github/workflows/ci.yml

# 檢查 Turbo Cache step 名稱是否為 "Turbo Cache (local fallback)"
grep "Turbo Cache (local fallback)" .github/workflows/ci.yml
```

---

## 用戶必須手動執行的步驟

### Step 1：在 Vercel 建立 Access Token

1. **登入 Vercel**
   - 前往 [vercel.com](https://vercel.com)
   - 使用 GitHub / 其他方式登入

2. **導航到 Team Settings（或 Account Settings）**
   - 點擊左側選單 **Settings**
   - 選擇 **Tokens**（在左側子選單中）

3. **建立新的 Access Token**
   - 點擊 **Create Token** 按鈕
   - **Token Name**：`gravito-turbo-remote-cache`（或任意名稱）
   - **Permissions**：使用預設或 **Full Access**（Turbo Remote Cache 需要完整存取權限）
   - 點擊 **Create**
   - **複製 Token 值**（只會顯示一次）

### Step 2：取得 Vercel Team Slug

1. **在 Team Settings 頁面**
   - 找到 **Team ID** 或 **Team Slug**（通常在頁面頂部或設定頁面中）
   - 格式示例：`my-team` 或 `team-abc123`

2. **如果使用個人帳號**
   - 可以將 `TURBO_TEAM` 留空或設置為個人 slug
   - 或在 Account Settings 中查看個人 slug

> **注意**：如果不確定 Team Slug，可以在第 3 步推送代碼後，查看 CI 日誌中 Turbo 的報錯信息，其中會提示正確的格式。

### Step 3：在 GitHub 添加 Secrets

1. **前往 GitHub Repository Settings**
   - 打開你的 GitHub repository
   - 點擊 **Settings** → **Secrets and variables** → **Actions**

2. **添加 `TURBO_TOKEN` Secret**
   - 點擊 **New repository secret**
   - **Name**：`TURBO_TOKEN`
   - **Value**：粘貼從 Step 1 複製的 Vercel Access Token
   - 點擊 **Add secret**

3. **添加 `TURBO_TEAM` Secret**
   - 點擊 **New repository secret**
   - **Name**：`TURBO_TEAM`
   - **Value**：粘貼從 Step 2 取得的 Team Slug（或留空）
   - 點擊 **Add secret**

### Step 4：驗證 CI 配置

1. **推送代碼或觸發 CI**
   - 推送任何修改或創建 PR 來觸發 CI
   - GitHub Actions 會自動執行

2. **查看 CI 日誌**
   - 打開 GitHub Actions → 選擇最新的 workflow run
   - 點擊 **validate** → **Build** step
   - 在日誌中搜索 `Remote cache` 關鍵字

3. **預期看到的日誌訊息**
   ```
   Remote cache: enabled
   Cache key: ...
   Cache status: MISS (首次)
   ```
   或
   ```
   Cache status: HIT (後續執行相同代碼)
   ```

4. **如果看到錯誤**
   ```
   error: "TURBO_TOKEN" not configured
   ```
   - 確認 GitHub Secrets 已正確添加
   - 檢查 secret 名稱是否完全匹配（區分大小寫）

---

## 工作流效果驗證

### 驗證 1：首次構建（Cache Miss）

**Scenario**：修改 `packages/core` 中的代碼，推送 PR

**預期結果**：

1. validate job → Build step
   ```
   [Turbo] Cache key: 8f3c9d2e...
   [Turbo] Remote cache: enabled
   [Turbo] Storing build artifacts in remote cache
   ✓ Build completed (full build, ~2-4 minutes)
   ```

2. test job → Run Tests
   ```
   [Turbo] Checking remote cache for build:dts...
   [Turbo] Cache hit! Skipping build:dts
   ✓ Running typecheck (dependencies resolved from cache)
   ```

### 驗證 2：後續構建（Cache Hit）

**Scenario**：相同代碼或不影響 `packages/core` 的修改，再次推送 PR

**預期結果**：

1. validate job → Build step
   ```
   [Turbo] Remote cache: enabled
   [Turbo] Cache status: HIT
   ✓ Build completed (from cache, ~10-30 seconds)
   ```

2. test job → 完全使用 cache
   ```
   [Turbo] All tasks hit remote cache
   ✓ Tests executed from cached artifacts (~1-2 minutes)
   ```

### 驗證 3：跨 PR 效果

**Scenario**：PR A 修改 `packages/core`，PR B 修改 `packages/catalog`（不涉及 core）

**預期結果**：

- PR A：完整構建，上傳 cache
- PR B：
  - `packages/core` 構建自動 cache hit（使用 PR A 的緩存）
  - `packages/catalog` 完整構建
  - 總耗時比 PR A 快（因為 core 被緩存）

---

## 常見問題（FAQ）

### Q1：`TURBO_TOKEN` 未設定時會發生什麼？

**A**：Turbo 會自動退回本地緩存（`.turbo` 和 `node_modules/.cache/turbo`）。CI 無需修改代碼，仍可正常執行，但無法跨 shard 共享緩存。

### Q2：能否只在 main 分支啟用 Remote Cache？

**A**：可以。在 `.github/workflows/ci.yml` 中，在 Build step 添加條件：

```yaml
- name: Build
  if: github.ref == 'refs/heads/main'  # 只在 main 啟用
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
  run: ...
```

### Q3：Vercel Free Plan 支援 Remote Cache 嗎？

**A**：是。Vercel Free Plan 包含 Turborepo Remote Cache 功能，無額外費用。

### Q4：如何測試 Remote Cache 是否正常工作？

**A**：

1. 推送代碼觸發 CI（首次 → Miss）
2. 推送相同代碼（第二次 → Hit）或使用 `turbo run build --skip-missing` 查看本地緩存状態

```bash
# 本地測試（不影響 CI）
bun run build
# 第二次運行會看到 cache hit 訊息
bun run build  # Expected: "cache hit"
```

### Q5：緩存多久會過期？

**A**：Vercel Remote Cache 預設保留時間為 **30 天**。無活動訪問的緩存會自動清理。

---

## 故障排除

### 問題：CI 中看到 `TURBO_TOKEN is required` 錯誤

**解決方案**：
1. 確認 GitHub Secrets 已正確添加
2. 檢查 secret 名稱是否完全匹配：`TURBO_TOKEN` 和 `TURBO_TEAM`（區分大小寫）
3. 等待 GitHub Actions cache 同步（通常幾秒鐘）
4. 重新觸發 CI（點擊 Re-run）

### 問題：Turbo 日誌中看到 `Invalid token` 或 `Unauthorized`

**解決方案**：
1. 確認 Vercel token 未過期或被撤銷
2. 在 Vercel console 重新生成新的 token
3. 更新 GitHub Secret

### 問題：Cache Hit 但 build 仍然執行

**解決方案**：
1. 檢查 `turbo.json` 的 `inputs` 配置（是否包含所有源文件）
2. 確認 `.turbo` 目錄未被 `.gitignore` 排除（應該被排除，本地和 CI 環境不同）
3. 清除本地 `.turbo` 目錄並重試：

```bash
rm -rf .turbo
bun run build
```

---

## 後續最佳實踐

### 定期監控 Cache 性能

1. 查看 GitHub Actions 中每個 job 的執行時間
2. 記錄 validate job 和 test job 的時間趨勢
3. 對比啟用前後的性能數據

### 緩存管理

1. 定期檢查 Vercel 中的 Cache 大小（通常不會很大）
2. 如懷疑緩存損壞，可以在 Vercel 後台手動清除（Settings → Cache）

### 進一步優化

- 如果 test 仍然較慢，考慮調整 shard 數量或並行度
- 監控 CI 資源使用情況，根據實際調整

---

## 相關資源

- **[Turborepo Remote Cache 官方文檔](https://turbo.build/repo/docs/core-concepts/remote-caching)**
- **[Vercel Remote Cache 設置](https://vercel.com/docs/monorepos/turborepo/remote-caching)**
- **[GitHub Actions Secrets 管理](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)**

---

## 修改摘要

| 檔案 | 修改內容 |
|------|---------|
| `turbo.json` | 添加 `remoteCache: { enabled: true }` |
| `.github/workflows/ci.yml` (validate job) | 在 Build step 添加 `TURBO_TOKEN` 和 `TURBO_TEAM` env；移除 Turbo Cache 中的 `**/tsconfig.tsbuildinfo` 和 `**/dist` 路徑 |
| `.github/workflows/ci.yml` (test job) | 在 job level env 添加 `TURBO_TOKEN` 和 `TURBO_TEAM`；移除 Turbo Cache 中的 `**/tsconfig.tsbuildinfo` 和 `**/dist` 路徑 |
