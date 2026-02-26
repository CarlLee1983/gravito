# Gravito Core v1.0.0 - NPM 發佈執行指南

**發佈日期**: 2026-02-26
**框架版本**: 1.0.0
**待發佈模組數**: 7
**預計時間**: 5-10 分鐘（自動化）

---

## 快速開始

### 一鍵發佈（推薦）

```bash
# 步驟 1: 確保代碼已提交
cd /Users/carl/Dev/Carl/gravito-core
git status

# 步驟 2: 清理工作目錄（可選）
git add .
git commit -m "chore: pre-release cleanup"

# 步驟 3: 推送到 main（自動觸發發佈）
git push origin main
```

**就這樣！** GitHub Actions 將自動:
1. ✅ 執行完整構建 (bun run build)
2. ✅ 執行所有測試
3. ✅ 發佈 7 個新版本到 NPM
4. ✅ 建立 GitHub Release 標籤
5. ✅ 更新 CHANGELOG.md

---

## 詳細步驟指南

### 步驟 1: 預發佈驗證

```bash
# 1.1 檢查工作目錄狀態
git status
git log --oneline -5

# 1.2 運行類型檢查
bun run typecheck

# 1.3 運行完整測試（可選，但推薦）
bun run test
# 或只測試受影響的包
turbo run test --filter=@gravito/resilience --filter=@gravito/chromatic

# 1.4 驗證版本一致性
bun run version:check
```

### 步驟 2: 預覽變更清單

```bash
# 檢查 changeset 當前狀態
bun run changeset status

# 看到類似輸出（顯示待發佈的模組）:
# @gravito/chromatic            1.0.0  (new release)
# @gravito/resilience           1.0.0  (new release)
# @gravito/plasma               2.0.0  (new release)
# @gravito/quark                1.0.0  (new release)
# @gravito/nova                 1.0.0  (new release)
# @gravito/xenon                1.0.0  (new release)
# @gravito/nebula-s3            2.0.0  (new release)
```

### 步驟 3: 清理工作目錄（重要）

```bash
# 檢查未提交的修改
git diff

# 方案 A: 提交修改
git add .
git commit -m "chore: [pre-release] finalize changes

- Update dependencies
- Cleanup test artifacts
- Configuration adjustments"

# 方案 B: 放棄修改（謹慎）
git checkout -- .
rm -rf test-dist-* test-views tmp

# 驗證工作目錄乾淨
git status
# 應顯示: On branch main, nothing to commit, working tree clean
```

### 步驟 4: 推送並發佈

```bash
# 確保你在 main 分支
git branch
# 應顯示: * main

# 推送代碼到遠程
git push origin main

# 監控發佈進度
# 方法 1: 打開 GitHub 頁面
open https://github.com/carl/gravito-core/actions

# 方法 2: 查看最新 workflow（在終端）
# 等待 "Release" workflow 完成，查看 "Create Release Pull Request or Publish" step
```

### 步驟 5: 驗證發佈成功

```bash
# 等待 1-2 分鐘後，檢查 NPM

# 驗證新版本可用（在終端執行）
npm view @gravito/resilience version
npm view @gravito/chromatic version
npm view @gravito/plasma version

# 預期輸出:
# @gravito/resilience: 1.0.0
# @gravito/chromatic: 1.0.0
# @gravito/plasma: 2.0.0

# 測試下載（可選）
cd /tmp
npm install @gravito/resilience@1.0.0
cd gravito-core
```

---

## GitHub Actions 監控

### 觀察發佈進度

**URL**: https://github.com/carl/gravito-core/actions

**查看步驟**:
1. 點擊最新的 "Release" workflow run
2. 展開 "Create Release Pull Request or Publish" step
3. 查看日誌輸出，確認:
   ```
   ✅ Setup Bun
   ✅ Setup Node.js
   ✅ Install Dependencies
   ✅ Build Packages
   ✅ Create Release Pull Request or Publish
      publishing to npm...
      published @gravito/resilience@1.0.0
      published @gravito/chromatic@1.0.0
      ...
   ```

### 常見日誌消息

| 消息 | 含義 | 動作 |
|------|------|------|
| `Creating Release Pull Request` | 沒有發佈版本 | 檢查 changeset 配置 |
| `published @gravito/xxx@x.x.x` | ✅ 成功發佈 | 無需動作 |
| `401 Unauthorized` | NPM token 問題 | 檢查 GitHub Secrets |
| `ESOCKET` | 網路問題 | 等待並重試 |

---

## 本地發佈（高級）

### 如需本地發佈（不推薦，但可行）

```bash
# 僅當 GitHub Actions 無法使用時

# 1. 配置 NPM token
npm login
# 按提示輸入 NPM 憑證

# 2. 驗證登錄
npm whoami
# 應輸出你的 NPM 用戶名

# 3. 執行 changeset 發佈
bun run changeset publish

# 4. 標籤並推送
git push --tags
```

---

## 出現問題時的故障排除

### 問題 1: "Working tree has uncommitted changes"

**症狀**: Push 失敗，提示有未提交修改

**解決方案**:
```bash
# 查看未提交文件
git status

# 提交所有修改
git add .
git commit -m "chore: cleanup before release"

# 或放棄修改
git checkout -- .

# 重試 push
git push origin main
```

### 問題 2: "version check failed"

**症狀**: version:check 顯示警告

**解決方案**:
```bash
# 查看詳細警告
bun run version:check 2>&1 | grep -A 5 "WARN\|ERROR"

# 通常原因: package.json 版本未更新
# 檢查並手動更新版本

# 驗證修復
bun run version:check
```

### 問題 3: "Build failed"

**症狀**: GitHub Actions 中 "Build Packages" 失敗

**解決方案**:
```bash
# 本地重現構建錯誤
bun run build

# 查看詳細日誌
turbo run build --verbose

# 常見原因:
# - TypeScript 編譯錯誤: bun run typecheck
# - 缺失依賴: bun install
# - 循環依賴: bun run scripts/generate-dependency-graph.ts
```

### 問題 4: "Publish to NPM failed"

**症狀**: 構建通過但發佈失敗

**可能原因和解決方案**:

```bash
# 原因 1: NPM token 過期/無效
# 解決: GitHub Secrets 檢查 NPM_TOKEN

# 原因 2: 版本號重複
# 檢查:
npm view @gravito/resilience versions
# 確保本地版本不在列表中

# 原因 3: 套件已發佈但 npm 緩存
# 清除緩存:
npm cache clean --force
npm view @gravito/resilience version
```

---

## 發佈後檢查清單

發佈完成後，請驗證以下事項：

```
發佈驗證清單
═══════════════════════════════════

□ npm 上可見 7 個新版本
  npm view @gravito/resilience
  npm view @gravito/chromatic
  npm view @gravito/plasma
  npm view @gravito/quark
  npm view @gravito/nova
  npm view @gravito/xenon
  npm view @gravito/nebula-s3

□ GitHub Release 標籤已建立
  https://github.com/carl/gravito-core/releases

□ CHANGELOG.md 已自動更新
  grep "1.0.0\|2.0.0" CHANGELOG.md

□ main 分支版本已遞增
  git log --oneline -3

□ 下載測試成功
  npm install @gravito/resilience@1.0.0

□ TypeScript 定義可用
  npm view @gravito/resilience@1.0.0 | grep typings

□ 新版本可在 npm.js.org 搜到
  https://www.npmjs.com/package/@gravito/resilience
```

---

## 環境信息參考

### Gravito Core 框架

```
框架名稱: Gravito Core
版本: 1.0.0
主分支: main
包管理: Bun 1.3.9
包系統: Turbo + pnpm workspaces
發佈系統: Changesets
Registry: npm.js.org
```

### 待發佈模組（7 個）

| 模組名 | 新版本 | 類型 | 測試狀態 |
|--------|--------|------|---------|
| @gravito/chromatic | 1.0.0 | New | ✅ 178/178 |
| @gravito/resilience | 1.0.0 | New | ✅ 92/92 |
| @gravito/plasma | 2.0.0 | Major | ✅ Pass |
| @gravito/quark | 1.0.0 | New | ✅ Pass |
| @gravito/nova | 1.0.0 | New | ✅ Pass |
| @gravito/xenon | 1.0.0 | New | ✅ Pass |
| @gravito/nebula-s3 | 2.0.0 | Major | ✅ Pass |

### 既有套件（62 個）

無需更新版本，已在 npm 上發佈。

---

## 相關命令速查表

```bash
# 預發佈驗證
bun run typecheck              # 類型檢查 (87 packages)
bun run test                   # 執行所有測試
bun run build                  # 完整構建
bun run version:check          # 版本一致性檢查

# Changeset 操作
bun run changeset status       # 查看待發佈版本
bun run changeset version      # 本地預覽版本更新（不實際提交）

# GitHub Actions 自動化（推薦）
git push origin main           # 觸發 release.yml 自動發佈

# 本地發佈（高級/備用）
npm login                      # 登錄 NPM
bun run changeset publish      # 手動發佈
git push --tags                # 推送版本標籤

# 驗證
npm view @gravito/resilience   # 查看最新版本
npm view @gravito/chromatic    # 查看最新版本
npm install pkg@version        # 測試下載
```

---

## 聯繫與支持

### 發佈問題排查

1. **GitHub Actions 日誌**: https://github.com/carl/gravito-core/actions
2. **Changesets 文檔**: https://github.com/changesets/changesets
3. **NPM 發佈指南**: https://docs.npmjs.com/cli/publish

### 關鍵配置文件

- 🔧 發佈工作流: `.github/workflows/release.yml`
- 📋 Changeset 配置: `.changeset/config.json`
- 📦 主 package.json: `./package.json`
- 🏗️  Turbo 配置: `turbo.json`

---

## 發佈時間表

| 步驟 | 預計時間 | 備註 |
|------|---------|------|
| 預發佈驗證 | 2-3 分鐘 | typecheck + 簡短測試 |
| 推送代碼 | < 1 分鐘 | git push |
| GitHub Actions 運行 | 3-5 分鐘 | 自動構建 + 發佈 |
| NPM CDN 同步 | 1-2 分鐘 | 新版本全球可用 |
| **總計** | **5-10 分鐘** | ✅ 完全自動化 |

---

## 成功發佈標誌 ✅

```
✅ GitHub Actions "Release" workflow 完成
✅ npm 上可見 7 個新版本
✅ GitHub Release 標籤已建立
✅ CHANGELOG.md 自動更新
✅ 版本提交推送到 main
✅ 可在 npm.js.org 搜到新版本
```

---

**祝發佈順利！🚀**

有任何問題，請參考 `NPM_RELEASE_ASSESSMENT.md` 詳細分析。
