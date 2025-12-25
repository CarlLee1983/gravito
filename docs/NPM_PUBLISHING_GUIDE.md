# NPM 發布指南

本指南說明如何將 Gravito monorepo 中的所有套件發布到 NPM。

## 發布前準備

### 1. 確認 NPM 帳號

```bash
# 檢查是否已登入
npm whoami

# 如果未登入，執行登入
npm login
```

### 2. 確認 Registry 設定

```bash
# 檢查當前 registry
npm config get registry

# 確保使用官方 registry
npm config set registry https://registry.npmjs.org/
```

### 3. 確認套件版本

所有套件應該已經更新到目標版本（目前是 `1.0.0`）。如果需要更新版本：

```bash
bun run scripts/release-all.ts
```

### 4. 構建所有套件

```bash
bun run build
```

### 5. 執行測試

```bash
bun run test
```

## 發布方式

### 方式一：使用發布腳本（推薦）

使用我們提供的自動化發布腳本：

```bash
# 完整發布流程（構建 + 測試 + 發布）
bun run scripts/publish-all.ts

# 僅查看會發布哪些套件（不實際發布）
bun run scripts/publish-all.ts --dry-run

# 跳過構建步驟
bun run scripts/publish-all.ts --skip-build

# 跳過測試步驟
bun run scripts/publish-all.ts --skip-test

# 組合使用
bun run scripts/publish-all.ts --dry-run --skip-test
```

### 方式二：手動發布單一套件

如果需要單獨發布某個套件：

```bash
cd packages/core
bun run build
bun test
npm publish --access public
```

### 方式三：批量發布（使用 Bun workspaces）

```bash
# 構建所有套件
bun run build

# 發布所有套件（需要每個套件都有 prepublishOnly 腳本）
bun run --filter '*' publish
```

## 版本策略

### Beta 版本（核心穩定套件）

以下套件已進入 Beta 階段，主要用於核心框架和基礎設施 (`1.0.0-beta.*`)：

- `gravito-core` - 核心框架
- `@gravito/horizon` - 路由系統
- `@gravito/luminosity` - SEO 核心模組
- `@gravito/luminosity-adapter-photon` - SEO HTTP 適配器
- `@gravito/stasis` - 靜態快取系統

### Alpha 版本（功能模組）

以下套件處於 Alpha 階段，正在積極開發中 (`1.0.0-alpha.*`)：

**資料與儲存**
- `@gravito/atlas` - 資料庫適配器
- `@gravito/dark-matter` - NoSQL/Document 儲存
- `@gravito/nebula` - 檔案儲存系統
- `@gravito/plasma` - Redis 快取適配器
- `@gravito/matter` - 資料實體管理

**視圖與前端**
- `@gravito/freeze` - 視圖凍結/渲染核心
- `@gravito/freeze-react` - React 適配器
- `@gravito/freeze-vue` - Vue 適配器
- `@gravito/prism` - 視圖轉換與處理

**系統與工具**
- `@gravito/cli` - 命令列工具
- `@gravito/client` - API 客戶端
- `@gravito/atlas` - 系統導航與映射
- `@gravito/constellation` - Sitemap 生成
- `@gravito/cosmos` - 國際化 (i18n)
- `@gravito/impulse` - 事件驅動系統
- `@gravito/ion` - 依賴注入容器
- `@gravito/mass` - 驗證器
- `@gravito/monolith` - 單體架構工具
- `@gravito/pulsar` - 排程系統
- `@gravito/radiance` - 監控與日誌
- `@gravito/sentinel` - 認證與授權
- `@gravito/signal` - 通訊與信號
- `@gravito/stream` - 串流處理
- `@gravito/flare` - 錯誤追蹤與通知

## 需要發布的套件

所有位於 `packages/` 目錄下且 `package.json` 中 `private` 不為 `true` 的套件都會被發布。

**不會發布的套件**（標記為 `private: true`）：
- `@gravito/site` - 內部網站套件
- `create-gravito-app` - 獨立發布的脚手架工具

## 更新版本號

在發布前，使用版本更新腳本：

```bash
# 更新所有套件版本號（根據官網使用情況）
bun run version:update
```

這會：
- 將官網使用的套件設為 `1.0.0-beta.1`
- 將其他套件設為 `1.0.0-alpha.1`
- 自動更新內部依賴版本

## ⚙ 發布配置

每個套件的 `package.json` 都包含以下配置：

```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

## 發布前檢查清單

- [ ] 所有套件版本已更新
- [ ] 所有套件已構建（`dist/` 目錄存在）
- [ ] 所有測試通過
- [ ] 已登入 NPM（`npm whoami` 有輸出）
- [ ] Registry 設定正確
- [ ] 已確認要發布的套件清單

## 常見問題

### 套件已存在

如果套件版本已存在於 NPM，發布會失敗。解決方式：

1. 更新版本號（使用 `version:update` 腳本）
2. 或使用 `--force`（不推薦，除非是修復問題）

### Alpha/Beta 版本標籤

- Alpha 版本會自動使用 `--tag alpha`
- Beta 版本會自動使用 `--tag beta`
- 穩定版本使用 `latest` tag（預設）

安裝時可以指定 tag：
```bash
npm install gravito-core@beta
npm install @gravito/sentinel@alpha
```

### 權限錯誤

確保：
- NPM 帳號有發布權限
- 套件名稱未被其他人使用
- 使用正確的組織範圍（`@gravito/`）

### 構建失敗

檢查：
- TypeScript 編譯是否成功
- 依賴是否正確安裝
- `build.ts` 腳本是否正常執行

## CI/CD 自動發布

目前 `.github/workflows/release-please.yml` 包含發布步驟，但需要完善：

1. **使用發布腳本**：
   ```yaml
   - name: Publish to npm
     run: bun run scripts/publish-all.ts
     env:
       NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

2. **或使用 Changesets**（如果已整合）：
   ```yaml
   - name: Publish to npm
     run: bunx changeset publish
     env:
       NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

## 發布後步驟

1. **驗證發布**：
   ```bash
   npm view gravito-core
   npm view @gravito/sentinel
   ```

2. **更新文檔**：
   - 更新 README 中的安裝說明
   - 更新 CHANGELOG（如果使用 Changesets 會自動處理）

3. **創建 GitHub Release**：
   - 如果使用 Release Please，會自動創建
   - 或手動創建 Release 標籤

## 最佳實踐

1. **使用 dry-run 先測試**：
   ```bash
   bun run scripts/publish-all.ts --dry-run
   ```

2. **分批發布**（如果套件很多）：
   - 先發布核心套件（`gravito-core`）
   - 再發布依賴它的套件

3. **監控發布狀態**：
   - 檢查 NPM 上的套件頁面
   - 確認版本號正確
   - 確認檔案已上傳

4. **記錄發布日誌**：
   - 記錄發布的套件和版本
   - 記錄任何問題和解決方式

## 相關資源

- [NPM 發布文檔](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [Changesets 文檔](../CHANGESETS_INTEGRATION_GUIDE.md)
