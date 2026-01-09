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

#### 瀏覽器驗證流程

當執行 `bun run scripts/publish-all.ts` 時，腳本支援智能驗證：

1. **第一個套件發布時**，NPM 會自動：
   - 顯示一個驗證 URL
   - 自動打開瀏覽器（或提示手動複製 URL）
   - 等待你在瀏覽器中完成驗證（使用 WebAuthn、指紋、Face ID 等）

2. **完成驗證後**：
   - 第一個套件會自動發布
   - 後續套件會自動繼續發布（無需再次驗證）

#### 腳本功能

- **自動版本檢查**：發布前自動檢查版本是否已存在，已存在則跳過
- **智能跳過**：已發布的版本不會重複發布
- **詳細統計**：顯示成功、跳過、失敗的套件數量

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

- `@gravito/core` - 核心框架
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

## 發布問題排查指南

### 1. 版本已存在

如果套件版本已經發布過，NPM 會拒絕重複發布。

**檢查方法**：
```bash
npm view <套件名稱>@<版本號> version
```

**解決方案**：
- 更新版本號後再發布（使用 `version:update` 腳本）
- 或使用 `npm publish --force`（不建議，除非是修復關鍵問題）

### 2. NPM 認證問題

**症狀**：
- `Access token expired or revoked`
- `You must be logged in to publish packages`

**解決方案**：
```bash
# 檢查登入狀態
npm whoami

# 重新登入
npm login

# 或使用瀏覽器驗證（WebAuthn），發布腳本會自動處理
```

### 3. prepublishOnly 腳本失敗

**症狀**：
- `npm error command failed`
- `npm error command sh -c ...`

**解決方案**：
```bash
# 手動執行 prepublishOnly 腳本
cd packages/<套件名稱>
bun run prepublishOnly

# 如果失敗，檢查：
# 1. 類型檢查：bun run typecheck
# 2. 測試：bun run test
# 3. 構建：bun run build
```

### 4. 缺少 dist 文件

**症狀**：
- `ENOENT: no such file or directory`
- `Cannot find module`

**解決方案**：
```bash
# 確保已構建
cd packages/<套件名稱>
bun run build

# 檢查 dist 目錄
ls -la dist/
```

### 5. bin 路徑錯誤

**症狀**：
- `bin[xxx] script name was invalid`
- `ENOENT: no such file or directory`

**解決方案**：
```bash
# 修復 package.json
cd packages/<套件名稱>
npm pkg fix

# 確認 bin 文件存在且有執行權限
ls -la dist/bin/
chmod +x dist/bin/<執行文件名>
```

### 6. Alpha/Beta 版本標籤問題

**症狀**：
- `You must specify a tag using --tag when publishing a prerelease version`

**解決方案**：
```bash
# Beta 版本
npm publish --access public --tag beta

# Alpha 版本
npm publish --access public --tag alpha
```

## 診斷工具

### 使用診斷腳本

```bash
# 診斷特定套件
bun run scripts/check-failed-packages.ts

# 驗證套件準備狀態
bun run publish:validate <套件名稱>
```

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
   npm view @gravito/core
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
   - 先發布核心套件（`@gravito/core`）
   - 再發布依賴它的套件

3. **監控發布狀態**：
   - 檢查 NPM 上的套件頁面
   - 確認版本號正確
   - 確認檔案已上傳

## 相關資源

- [NPM 發布文檔](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [Changesets 文檔](../CHANGESETS_INTEGRATION_GUIDE.md)