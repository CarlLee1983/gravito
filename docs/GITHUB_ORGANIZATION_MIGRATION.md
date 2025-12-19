# GitHub 組織移轉指南

本指南協助您將 Gravito 專案從個人 GitHub 帳號移轉到組織（Organization）。

## 📋 移轉前準備

### 1. 確認組織資訊

在開始之前，請確認：
- ✅ 組織名稱（例如：`gravito-org` 或 `gravito-framework`）
- ✅ 組織已建立並有適當權限
- ✅ 您有組織的管理員權限

### 2. 備份重要資料

```bash
# 確保所有變更已提交
git status

# 建立備份分支
git checkout -b backup-before-migration
git push origin backup-before-migration
```

## 🔄 GitHub 移轉步驟

### 步驟 1：在 GitHub 上移轉 Repository

1. 前往您的 repository 設定頁面
   - `https://github.com/CarlLee1983/gravito-core/settings`

2. 點擊「Transfer ownership」
   - 位於頁面最下方「Danger Zone」

3. 輸入組織名稱和 repository 名稱
   - 例如：`gravito-org/gravito-core`

4. 確認移轉
   - 輸入 repository 完整名稱確認

**注意事項**：
- ⚠️ 移轉後，所有 GitHub URL 會自動重定向（但建議更新）
- ⚠️ 需要更新所有 package.json 中的 repository URL
- ⚠️ CI/CD 可能需要重新授權

### 步驟 2：更新本地 Git Remote

```bash
# 查看目前的 remote
git remote -v

# 更新 remote URL
git remote set-url origin https://github.com/YOUR_ORG/gravito-core.git

# 或使用 SSH
git remote set-url origin git@github.com:YOUR_ORG/gravito-core.git

# 驗證
git remote -v
```

### 步驟 3：更新所有檔案中的 GitHub URL

使用提供的腳本自動更新，或手動更新以下檔案：

## 📝 需要更新的檔案清單

### Package.json 檔案（約 30+ 個）

所有 `packages/*/package.json` 中的：
- `repository.url`
- `bugs.url`
- `homepage`

### 程式碼檔案

- `packages/cli/src/index.ts` - 模板來源 URL
- `examples/official-site/src/controllers/DocsController.ts` - 編輯連結
- `examples/official-site/src/client/pages/Docs.tsx` - GitHub 連結

### 文件檔案

- `README.md`
- `README.zh-TW.md`
- `CHANGELOG.md`
- `packages/*/README.md`
- `templates/*/README.md`
- `docs/**/*.md`

### 模板檔案

- `templates/*/src/views/partials/*.html` - GitHub 連結

## 🚀 自動化更新腳本

執行以下腳本來批量更新所有檔案：

```bash
# 執行更新腳本
bun run scripts/update-github-urls.ts YOUR_ORG gravito-core
```

或手動執行：

```bash
# 替換所有 GitHub URL
find . -type f \( -name "*.json" -o -name "*.ts" -o -name "*.tsx" -o -name "*.md" -o -name "*.html" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -exec sed -i '' 's/github\.com\/CarlLee1983\/gravito/github.com\/YOUR_ORG\/gravito-core/g' {} +
```

## ✅ 驗證清單

移轉完成後，請驗證以下項目：

### 1. Git Remote

```bash
git remote -v
# 應該顯示新的組織 URL
```

### 2. Package.json 檔案

```bash
# 檢查所有 package.json
grep -r "github.com/CarlLee1983" packages/ --include="*.json"
# 應該沒有結果
```

### 3. 程式碼檔案

```bash
# 檢查所有 TypeScript 檔案
grep -r "github.com/CarlLee1983" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules
# 應該沒有結果
```

### 4. 文件檔案

```bash
# 檢查所有 Markdown 檔案
grep -r "github.com/CarlLee1983" docs/ --include="*.md"
# 應該沒有結果
```

### 5. CI/CD 設定

- ✅ 檢查 GitHub Actions 是否正常運作
- ✅ 確認 secrets 和 permissions 設定正確
- ✅ 測試自動發布流程

### 6. NPM 發布

- ✅ 確認 npm 套件的 repository URL 正確
- ✅ 測試發布流程

## 🔧 手動更新範例

### Package.json 更新

**更新前**：
```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/CarlLee1983/gravito.git"
  },
  "bugs": {
    "url": "https://github.com/CarlLee1983/gravito/issues"
  },
  "homepage": "https://github.com/CarlLee1983/gravito#readme"
}
```

**更新後**（假設組織名為 `gravito-org`）：
```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/gravito-org/gravito-core.git"
  },
  "bugs": {
    "url": "https://github.com/gravito-org/gravito-core/issues"
  },
  "homepage": "https://github.com/gravito-org/gravito-core#readme"
}
```

### 程式碼更新

**更新前**：
```typescript
const editUrl = `https://github.com/CarlLee1983/gravito-core/blob/main/docs/${slug}.md`
```

**更新後**：
```typescript
const editUrl = `https://github.com/gravito-org/gravito-core/blob/main/docs/${slug}.md`
```

## 🎯 組織設定建議

### 1. Repository 設定

- ✅ 啟用 Issues 和 Pull Requests
- ✅ 設定適當的 branch protection rules
- ✅ 配置 GitHub Pages（如果需要）

### 2. 團隊權限

- ✅ 設定團隊成員和權限
- ✅ 配置 code owners（如果需要）

### 3. Secrets 和 Variables

- ✅ 更新 GitHub Actions secrets
- ✅ 確認 NPM_TOKEN 等 secrets 正確設定

## 🚨 常見問題

### Q: 移轉後舊的 URL 還能用嗎？

A: GitHub 會自動重定向，但建議更新所有引用以避免混淆。

### Q: CI/CD 會中斷嗎？

A: 通常不會，但建議：
- 檢查 GitHub Actions 是否正常執行
- 確認 secrets 和 permissions 設定正確

### Q: NPM 套件需要重新發布嗎？

A: 不需要，但建議更新 package.json 中的 repository URL。

### Q: 如何處理已發布的套件？

A: 已發布的套件不受影響，但新版本會使用新的 repository URL。

## 📚 參考資源

- [GitHub 移轉 Repository 文檔](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)
- [GitHub 組織管理](https://docs.github.com/en/organizations)

