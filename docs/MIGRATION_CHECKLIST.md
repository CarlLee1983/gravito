# GitHub 組織移轉檢查清單

## ✅ 移轉前準備

- [ ] 確認組織名稱已建立
- [ ] 確認有組織管理員權限
- [ ] 備份當前 repository（建立備份分支）
- [ ] 確認所有變更已提交並推送

## 🔄 GitHub 移轉步驟

- [ ] 在 GitHub 上執行 repository 移轉
  - 前往 Settings → Transfer ownership
  - 輸入組織名稱和 repository 名稱
  - 確認移轉

- [ ] 更新本地 Git remote
  ```bash
  git remote set-url origin https://github.com/YOUR_ORG/gravito-core.git
  git remote -v  # 驗證
  ```

## 📝 更新專案檔案

- [ ] 執行自動化更新腳本
  ```bash
  bun run scripts/update-github-urls.ts YOUR_ORG gravito-core
  ```

- [ ] 手動檢查以下檔案類型：
  - [ ] `packages/*/package.json` (約 30+ 個)
  - [ ] `templates/*/package.json`
  - [ ] `examples/*/package.json`
  - [ ] `README.md` 和 `README.zh-TW.md`
  - [ ] `CHANGELOG.md`
  - [ ] `packages/*/README.md`
  - [ ] `docs/**/*.md`
  - [ ] `packages/cli/src/index.ts`
  - [ ] `examples/official-site/src/controllers/DocsController.ts`
  - [ ] `examples/official-site/src/client/pages/Docs.tsx`
  - [ ] `templates/*/src/views/partials/*.html`

## ✅ 驗證步驟

- [ ] 檢查 Git remote
  ```bash
  git remote -v
  ```

- [ ] 搜尋舊的 GitHub URL（應該沒有結果）
  ```bash
  grep -r "github.com/CarlLee1983" . --exclude-dir=node_modules --exclude-dir=.git
  ```

- [ ] 檢查所有 package.json
  ```bash
  grep -r "github.com/CarlLee1983" packages/ --include="*.json"
  ```

- [ ] 檢查程式碼檔案
  ```bash
  grep -r "github.com/CarlLee1983" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules
  ```

- [ ] 檢查文件檔案
  ```bash
  grep -r "github.com/CarlLee1983" docs/ --include="*.md"
  ```

## 🔧 CI/CD 設定

- [ ] 檢查 GitHub Actions 是否正常運作
- [ ] 確認 GitHub Actions secrets 設定正確
- [ ] 測試 CI 流程（建立測試 PR）
- [ ] 確認自動發布流程正常

## 📦 NPM 相關

- [ ] 確認所有 package.json 中的 repository URL 已更新
- [ ] 測試本地構建：`bun run build`
- [ ] 測試本地測試：`bun run test`
- [ ] 準備發布新版本（使用新的 repository URL）

## 🎯 組織設定

- [ ] 設定 repository 描述和主題標籤
- [ ] 配置 branch protection rules
- [ ] 設定團隊成員和權限
- [ ] 配置 GitHub Pages（如果需要）
- [ ] 設定 repository secrets 和 variables

## 📋 提交變更

- [ ] 檢查所有變更
  ```bash
  git status
  git diff
  ```

- [ ] 提交變更
  ```bash
  git add .
  git commit -m "chore: migrate repository to organization"
  ```

- [ ] 推送到新 repository
  ```bash
  git push origin main
  ```

## 🚨 後續檢查

- [ ] 確認 GitHub 上的 repository URL 正確
- [ ] 測試從新 URL clone repository
- [ ] 確認所有連結和引用正常運作
- [ ] 通知團隊成員 repository 已移轉
- [ ] 更新外部文件或網站中的連結

## 📝 備註

- GitHub 會自動重定向舊 URL 到新 URL
- 已發布的 NPM 套件不受影響
- 建議在移轉後立即更新所有引用

