# 品牌化更名評估報告

## 項目現狀分析

### 當前狀態
- **品牌名稱**：Gravito
- **核心版本**：1.0.0-beta.1（準備上線 1.0.0）
- **項目結構**：Monorepo，包含約 30+ 個 packages
- **引用點統計**：約 596 個 `gravito-core` 或 `@gravito/` 引用
- **重命名映射**：已定義完整的映射表（`scripts/rename-mapping.json`）

### 影響範圍
1. **Package 名稱**：約 30+ 個 packages 需要重命名
2. **程式碼引用**：約 213 個檔案包含需要更新的引用
3. **文檔**：所有 README、API 文檔、指南需要更新
4. **範例與模板**：examples 和 templates 目錄需要更新
5. **CLI 工具**：CLI 命令和提示訊息需要更新

## 重命名策略分析

根據 `rename-mapping.json`，重命名分為以下類型：

### 1. 簡單重命名（可直接進行）
- 獨立模組，依賴關係簡單
- 不影響其他模組的核心功能

### 2. 拆分模組（需要謹慎處理）
- `gravito-core` → `@gravito/graviton` + `@gravito/horizon`
- `@gravito/sentinel` → `@gravito/isotope` + `@gravito/charge`

### 3. 提取模組（未來規劃）
- 從 core 中提取 middleware、logger、helpers、DI 等

## 優先順序建議

### 階段一：獨立模組（低風險，可立即進行）[Complete]

這些模組相對獨立，依賴關係簡單，可以先進行重命名：

1. **SEO 相關模組**（獨立性高）
   - `@gravito/seo-core` → `@gravito/luminosity`
   - `@gravito/seo-adapter-hono` → `@gravito/luminosity-adapter-photon`
   - `@gravito/seo-adapter-express` → `@gravito/luminosity-adapter-express`
   - `@gravito/seo-cli` → `@gravito/luminosity-cli`
   - **理由**：SEO 模組相對獨立，主要依賴外部框架（如 Express 等 HTTP adapter）

2. **存儲與內容模組**（依賴關係簡單）
   - `@gravito/orbit-storage` → `@gravito/nebula`
   - `@gravito/orbit-content` → `@gravito/nebula-content`
   - **理由**：主要依賴 core，不影響其他模組

3. **國際化模組**（獨立性高）
   - `@gravito/cosmos` → `@gravito/cosmos`
   - **理由**：功能獨立，依賴關係簡單

4. **網站地圖模組**（獨立性高）
   - `@gravito/orbit-sitemap` → `@gravito/constellation`
   - **理由**：功能獨立，主要依賴 core 和 router

5. **驗證器模組**（獨立性高）
   - `@gravito/validator` → `@gravito/mass`
   - **理由**：獨立工具模組，無複雜依賴

### 階段二：數據與快取模組（中等風險）⚠

這些模組有較多依賴關係，但影響範圍可控：

1. **數據存儲模組**
   - `@gravito/atlas` → `@gravito/matter`
   - `@gravito/orbit-mongo` → `@gravito/dark-matter`
   - `@gravito/orbit-database` → `@gravito/matter`（需確認是否合併）
   - **注意**：需要確認 `Atlas` 和 `orbit-database` 是否合併

2. **快取系統模組**
   - `@gravito/orbit-redis` → `@gravito/plasma`
   - `@gravito/stasis` → `@gravito/stasis`
   - **注意**：可能被其他模組依賴（如 session、queue）

3. **會話模組**
   - `@gravito/ion` → `@gravito/orbit`
   - **注意**：可能被 auth 模組依賴

### 階段三：前端與渲染模組（中等風險）⚠

1. **前端模組**
   - `@gravito/ion` → `@gravito/momentum`
   - `@gravito/prism` → `@gravito/photon`
   - **注意**：可能被 examples 和 templates 大量使用

### 階段四：背景任務與通訊模組（中等風險）⚠

1. **背景任務**
   - `@gravito/orbit-scheduler` → `@gravito/chronon`
   - `@gravito/stream` → `@gravito/kinetic`
   - **注意**：可能被 mail、notifications 等模組依賴

2. **通訊與通知**
   - `@gravito/orbit-broadcasting` → `@gravito/gravity-wave`
   - `@gravito/orbit-notifications` → `@gravito/flare`
   - `@gravito/signal` → `@gravito/signal`
   - **注意**：依賴關係較複雜

### 階段五：身份與權限模組（高風險，需拆分）

1. **身份認證模組**（需要拆分）
   - `@gravito/sentinel` → `@gravito/isotope`（認證）+ `@gravito/charge`（權限）
   - **注意**：這是拆分操作，需要：
     - 先分析現有代碼結構
     - 確定拆分邊界
     - 創建兩個新模組
     - 遷移代碼
     - 更新所有依賴

### 階段六：核心模組與工具（最高風險）

1. **核心模組**（需要拆分，影響所有模組）
   - `gravito-core` → `@gravito/graviton`（核心引擎）+ `@gravito/horizon`（路由）
   - **注意**：這是最高優先級的重命名，因為：
     - 所有其他模組都依賴 core
     - 需要先完成拆分和遷移
     - 然後才能更新其他模組的依賴

2. **工具模組**
   - `@gravito/client` → `@gravito/beam`
   - `@gravito/cli` → `@gravito/pulse`
   - `create-gravito-app` → 需要重命名
   - **注意**：CLI 工具被廣泛使用，需要謹慎處理

## 建議實施順序

### 第一階段：準備工作（1-2 天）
1. [Complete] 創建重命名腳本工具
2. [Complete] 建立測試環境
3. [Complete] 備份當前代碼庫
4. [Complete] 確認重命名映射表完整性

### 第二階段：獨立模組重命名（3-5 天）
按順序進行：
1. SEO 模組（luminosity 系列）
2. 存儲與內容模組（nebula 系列）
3. 國際化模組（cosmos）
4. 網站地圖模組（constellation）
5. 驗證器模組（mass）

**驗證**：每個模組重命名後立即測試構建和基本功能

### 第三階段：數據與快取模組（5-7 天）
1. 確認 `Atlas` 和 `orbit-database` 的合併策略
2. 重命名數據存儲模組（matter 系列）
3. 重命名快取模組（plasma、stasis）
4. 重命名會話模組（orbit）

**驗證**：測試數據庫操作、快取功能、會話管理

### 第四階段：前端與背景任務模組（5-7 天）
1. 重命名前端模組（momentum、photon）
2. 重命名背景任務模組（chronon、kinetic）
3. 重命名通訊模組（gravity-wave、flare、signal）

**驗證**：測試前端渲染、背景任務執行、通訊功能

### 第五階段：身份與權限模組拆分（7-10 天）
1. 分析 `orbit-auth` 代碼結構
2. 設計拆分方案
3. 創建 `isotope` 和 `charge` 模組
4. 遷移代碼
5. 更新所有依賴

**驗證**：完整測試認證和權限功能

### 第六階段：核心模組拆分（10-14 天）
1. 分析 `gravito-core` 代碼結構
2. 設計拆分方案（graviton + horizon）
3. 創建新模組結構
4. 遷移核心引擎代碼
5. 遷移路由代碼
6. 更新所有依賴（這是最大的工作量）

**驗證**：完整測試所有功能，確保所有模組正常工作

### 第七階段：工具與文檔（5-7 天）
1. 重命名 CLI 工具（pulse）
2. 重命名客戶端工具（beam）
3. 更新所有文檔
4. 更新範例和模板
5. 更新 GitHub URLs 和相關連結

### 第八階段：最終驗證與發布（3-5 天）
1. 完整測試所有功能
2. 更新版本號到 1.0.0
3. 準備發布文檔
4. 執行發布流程

## ⚠ 風險評估

### 高風險項目
1. **核心模組拆分**：影響所有模組，需要最謹慎處理
2. **身份認證模組拆分**：影響安全功能，需要完整測試
3. **CLI 工具重命名**：影響開發者體驗，需要更新文檔

### 中風險項目
1. **數據存儲模組**：需要確認合併策略
2. **依賴關係複雜的模組**：需要仔細檢查所有依賴

### 低風險項目
1. **獨立模組**：可以快速進行，風險較低

## 建議

### 立即可以開始的部分
**建議先從階段二開始**（獨立模組），因為：
1. [Complete] 風險最低
2. [Complete] 可以快速看到進展
3. [Complete] 建立重命名流程和工具
4. [Complete] 為後續複雜重命名積累經驗

### 需要先確認的事項
1. ⚠ `Atlas` 和 `orbit-database` 是否合併？
2. ⚠ 核心模組拆分的具體邊界是什麼？
3. ⚠ 身份認證模組拆分的具體邊界是什麼？
4. ⚠ 是否需要保持向後兼容性？

### 工具需求
1. 自動化重命名腳本
2. 依賴關係檢查工具
3. 測試驗證腳本
4. 文檔更新工具

## 總結

**建議優先順序**：
1. **第一優先**：獨立模組（SEO、存儲、i18n、sitemap、validator）
2. **第二優先**：數據與快取模組
3. **第三優先**：前端與背景任務模組
4. **第四優先**：身份與權限模組（需要拆分）
5. **最後進行**：核心模組（影響最大）

**預計總時間**：6-8 週（考慮測試和驗證時間）

**建議**：先從獨立模組開始，建立流程和工具，然後逐步推進到複雜模組。
