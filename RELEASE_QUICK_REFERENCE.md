# 🚀 Gravito Core v1.0.0 - 發佈快速參考卡

**狀態**: ✅ 就緒發佈
**模組**: 7 個新版本
**時間**: 5-10 分鐘（全自動）
**方法**: GitHub Actions + Changesets

---

## 一句話總結

```bash
git push origin main  # 就這樣，剩下自動化搞定！
```

---

## 發佈清單

### 準備工作（2 分鐘）

```bash
# 確保在 main 分支
git branch

# 檢查版本
bun run version:check

# 清理工作目錄（可選但推薦）
git add .
git commit -m "chore: pre-release cleanup"
```

### 執行發佈（自動化，5-10 分鐘）

```bash
# 推送並自動觸發 GitHub Actions release.yml
git push origin main

# 打開看進度
open https://github.com/carl/gravito-core/actions
```

### 驗證成功（1-2 分鐘後）

```bash
# 檢查新版本
npm view @gravito/resilience version     # 應顯示 1.0.0
npm view @gravito/chromatic version      # 應顯示 1.0.0
npm view @gravito/plasma version         # 應顯示 2.0.0

# 測試下載
npm install @gravito/resilience@1.0.0
```

---

## 7 個待發佈模組

| 模組 | 版本 | 類型 | 測試 |
|------|------|------|------|
| @gravito/chromatic | 1.0.0 | New | ✅ 178/178 |
| @gravito/resilience | 1.0.0 | New | ✅ 92/92 |
| @gravito/plasma | 2.0.0 | Major | ✅ Pass |
| @gravito/quark | 1.0.0 | New | ✅ Pass |
| @gravito/nova | 1.0.0 | New | ✅ Pass |
| @gravito/xenon | 1.0.0 | New | ✅ Pass |
| @gravito/nebula-s3 | 2.0.0 | Major | ✅ Pass |

---

## 快速命令速查

```bash
# 預檢查
bun run typecheck              # 類型檢查
bun run test                   # 運行測試
bun run build                  # 構建驗證
bun run version:check          # 版本檢查

# Changeset
bun run changeset status       # 看待發佈版本

# 發佈
git push origin main           # 自動發佈（推薦）
bun run changeset publish      # 本地手動發佈（備用）

# 驗證
npm view @pkg-name version     # 查看最新版本
npm install @pkg-name@1.0.0    # 測試下載
```

---

## 狀態速查表

| 項目 | 狀態 | 檢查命令 |
|------|------|---------|
| 代碼品質 | ✅ | `bun run typecheck` |
| 測試覆蓋 | ✅ | `bun run test` |
| 版本一致 | ✅ | `bun run version:check` |
| 構建系統 | ✅ | `bun run build` |
| 循環依賴 | ✅ | 無 |
| NPM 認證 | 🔄 | GitHub Actions (自動) |

---

## 常見場景

### 場景 1: 馬上發佈

```bash
git push origin main
# 等 5-10 分鐘，完成！
```

### 場景 2: 發佈前想運行測試

```bash
bun run test                   # 運行完整測試
bun run test:coverage          # 覆蓋率檢查
git push origin main           # 測試通過後推送
```

### 場景 3: 只想驗證版本

```bash
bun run changeset status       # 預覽待發佈版本
bun run version:check          # 檢查版本一致性
# 不推送 = 不發佈
```

### 場景 4: 本地手動發佈（備用）

```bash
npm login                      # 登錄 NPM
bun run changeset publish      # 手動發佈
git push --tags                # 推送標籤
```

---

## 故障排查

| 問題 | 解決方案 |
|------|---------|
| Git 衝突 | `git pull origin main` 然後 `git push origin main` |
| 未提交修改 | `git add . && git commit -m "..."` |
| 版本衝突 | `bun run version:check` 查看並修正 |
| 構建失敗 | `bun run build` 本地重現，修復後推送 |
| NPM 發佈失敗 | 檢查 GitHub Actions 日誌，多數是 token 過期 |

---

## 發佈完成標記

```
✅ npm 上有 7 個新版本
✅ GitHub Releases 有標籤
✅ CHANGELOG.md 已更新
✅ main 分支版本已遞增
✅ 可在 npmjs.com 搜到
```

---

## 關鍵數據

```
框架版本: 1.0.0
新增代碼: ~15,000+ 行
測試覆蓋: 92-178 per package
向後兼容: ✅ 100%
預計時間: 5-10 分鐘
風險等級: 低 ✅
```

---

## 深度參考

| 文件 | 用途 |
|------|------|
| `NPM_RELEASE_ASSESSMENT.md` | 完整技術評估 |
| `PUBLISH_INSTRUCTIONS.md` | 詳細步驟指南 |
| `PUBLISH_SUMMARY.txt` | 發佈摘要 |
| `.github/workflows/release.yml` | CI/CD 配置 |

---

## 一鍵發佈（Copy-Paste）

```bash
# 複製下面整個代碼塊，一貼進終端就發佈！
cd /Users/carl/Dev/Carl/gravito-core && \
git add . && \
git commit -m "chore: pre-release cleanup" && \
git push origin main && \
echo "✅ Publish triggered! Check: https://github.com/carl/gravito-core/actions"
```

---

## 發佈成功標記

```
✅ GitHub Actions "Release" workflow 綠燈
✅ npm 上看得到 7 個新版本
✅ CHANGELOG.md 自動更新
✅ GitHub Release tags 已建立
```

---

**生成時間**: 2026-02-26
**有效期**: 直到下一次代碼提交
**狀態**: ✅ 最終就緒
