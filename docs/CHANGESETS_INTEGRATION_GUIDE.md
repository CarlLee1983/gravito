# Changesets 整合指南

本指南展示如何將 Changesets 整合到 Gravito monorepo 中。

## 📦 安裝

```bash
bun add -D @changesets/cli
```

## ⚙️ 初始化

```bash
bunx changeset init
```

這會創建 `.changeset` 目錄和 `config.json`。

## 🔧 配置

編輯 `.changeset/config.json`：

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [
    "@gravito/site",
    "@gravito/cli"
  ]
}
```

**配置說明**：
- `access: "public"`：所有套件都是公開的
- `baseBranch: "main"`：主分支名稱
- `updateInternalDependencies: "patch"`：內部依賴自動更新 patch 版本
- `ignore`：忽略私有套件（不需要發布）

## 📝 使用流程

### 1. 開發時標記變更

當你修改了套件，需要標記變更：

```bash
bunx changeset
```

這會引導你：
1. 選擇受影響的套件
2. 選擇版本類型（major/minor/patch）
3. 寫變更說明

**範例**：
```
🦋  Which packages would you like to include?
 · gravito-core, @gravito/orbit-inertia

🦋  Which packages should have a major bump?
 · gravito-core

🦋  Please enter a summary for this change:
 · Add new hook system for better extensibility
```

這會創建一個 changeset 檔案，例如：
`.changeset/brave-lions-sleep.md`

### 2. 提交 Changeset

```bash
git add .changeset
git commit -m "feat: add changeset for hook system"
```

### 3. 版本更新（發布前）

當準備發布時：

```bash
bunx changeset version
```

這會：
- 根據 changesets 更新所有套件的版本
- 更新內部依賴的版本號
- 生成/更新 CHANGELOG.md
- 刪除已處理的 changeset 檔案

### 4. 發布到 npm

```bash
bunx changeset publish
```

這會：
- 發布所有有版本變更的套件到 npm
- 創建 git tags
- 推送變更

## 🔄 整合到 CI/CD

### GitHub Actions Workflow

創建 `.github/workflows/changesets.yml`：

```yaml
name: Changesets

on:
  push:
    branches:
      - main

permissions:
  contents: write
  pull-requests: write

jobs:
  changesets:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Create Release Pull Request
        uses: changesets/action@v1
        with:
          publish: bunx changeset publish
          version: bunx changeset version
          commit: "chore: version packages"
          title: "Version Packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 📋 與現有流程整合

### 選項 A：完全替換 Release Please

1. 移除 `release-please-config.json`
2. 移除 `.github/workflows/release-please.yml`
3. 使用 Changesets 的 GitHub Action

### 選項 B：並行使用（過渡期）

1. Changesets 管理版本和 CHANGELOG
2. Release Please 只處理 GitHub Release 創建
3. 逐步遷移到 Changesets

## 🎯 實際範例

### 場景：更新 `orbit-inertia` 套件

1. **修改程式碼**：
   ```typescript
   // packages/orbit-inertia/src/index.ts
   // 添加新功能...
   ```

2. **創建 Changeset**：
   ```bash
   bunx changeset
   # 選擇 @gravito/orbit-inertia
   # 選擇 minor (新功能)
   # 寫說明：Add support for Vue 3
   ```

3. **提交**：
   ```bash
   git add .
   git commit -m "feat(orbit-inertia): add Vue 3 support"
   ```

4. **發布時自動處理**：
   - CI 會自動執行 `changeset version`
   - 更新版本號（例如：1.0.0 → 1.1.0）
   - 生成 CHANGELOG
   - 發布到 npm

## 📊 版本策略

### 獨立版本化（推薦）

每個套件獨立版本：
- `gravito-core`: 1.0.0
- `@gravito/orbit-inertia`: 1.1.0
- `@gravito/orbit-db`: 1.0.0

**優點**：
- 使用者只更新需要的套件
- 更靈活的發布週期

### 統一版本化（目前方式）

所有套件統一版本：
- `gravito-core`: 1.0.0
- `@gravito/orbit-inertia`: 1.0.0
- `@gravito/orbit-db`: 1.0.0

**優點**：
- 版本管理簡單
- 適合緊密耦合的套件

**使用 Changesets 的 `linked` 配置**：
```json
{
  "linked": [
    ["gravito-core", "@gravito/orbit-*"]
  ]
}
```

## 🚨 注意事項

1. **內部依賴**：
   - Changesets 會自動更新 `workspace:*` 依賴
   - 確保發布前版本號正確

2. **CHANGELOG**：
   - 每個套件會有獨立的 CHANGELOG
   - 或使用根目錄的統一 CHANGELOG

3. **Git Tags**：
   - Changesets 會為每個套件創建 tag
   - 格式：`@gravito/orbit-inertia@1.1.0`

## 🔍 進階配置

### 自訂 CHANGELOG 格式

創建 `.changeset/changelog.js`：

```javascript
module.exports = {
  getReleaseLine: async (changeset, type) => {
    const [firstLine, ...futureLines] = changeset.summary
      .split('\n')
      .map(l => l.trimRight());

    return `- ${firstLine}`;
  },
};
```

### 發布前檢查

在 `package.json` 中添加：

```json
{
  "scripts": {
    "version": "bun run build && bun run test",
    "release": "bunx changeset publish"
  }
}
```

## 📚 參考資源

- [Changesets 官方文檔](https://github.com/changesets/changesets)
- [Changesets GitHub Action](https://github.com/changesets/action)
- [版本策略最佳實踐](https://github.com/changesets/changesets/blob/main/docs/versioning-explained.md)

