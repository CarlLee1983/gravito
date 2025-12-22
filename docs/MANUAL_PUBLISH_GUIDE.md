# 手動發布單一套件指南

當你需要進行瀏覽器 Key 驗證時，可以手動發布單一套件。

## 🚀 手動發布步驟

### 1. 進入套件目錄

```bash
cd packages/<套件名稱>
# 例如：
cd packages/core
cd packages/orbit-auth
```

### 2. 確認構建

```bash
# 構建套件
bun run build

# 確認 dist 目錄存在且包含必要文件
ls -la dist/
```

### 3. 檢查版本號和 tag

根據版本號確定需要使用的 tag：

- **Beta 版本** (`1.0.0-beta.1`) → 使用 `--tag beta`
- **Alpha 版本** (`1.0.0-alpha.1`) → 使用 `--tag alpha`
- **穩定版本** (`1.0.0`) → 不需要 tag（使用 `latest`）

### 4. 執行發布

#### Beta 版本：

```bash
npm publish --access public --tag beta
```

#### Alpha 版本：

```bash
npm publish --access public --tag alpha
```

#### 穩定版本：

```bash
npm publish --access public
```

### 5. 完成瀏覽器驗證

1. **NPM 會顯示一個 URL**，例如：
   ```
   Visit this URL to authorize:
   https://www.npmjs.com/login?next=/org/gravito/package/gravito-core
   ```

2. **瀏覽器會自動打開**（或手動複製 URL）

3. **在瀏覽器中完成驗證**（指紋、Face ID、Touch ID 等）

4. **驗證完成後，發布會自動繼續**

## 📋 快速參考

### Beta 版本（核心穩定）

```bash
# gravito-core
cd packages/core
npm publish --access public --tag beta

# @gravito/horizon
cd packages/horizon
npm publish --access public --tag beta

# @gravito/luminosity
cd packages/luminosity
npm publish --access public --tag beta

# @gravito/stasis
cd packages/stasis
npm publish --access public --tag beta
```

### Alpha 版本（功能模組）

```bash
# 例如：@gravito/sentinel (認證)
cd packages/sentinel
npm publish --access public --tag alpha

# 例如：@gravito/plasma (Redis)
cd packages/plasma
npm publish --access public --tag alpha

# 例如：@gravito/db (資料庫)
cd packages/db
npm publish --access public --tag alpha
```

## ⚠️ 注意事項

1. **必須指定 tag**：預發布版本（alpha/beta）必須使用 `--tag` 參數
2. **瀏覽器驗證**：每次發布都需要在瀏覽器中完成驗證
3. **發布順序**：建議先發布核心套件（`gravito-core`），再發布依賴它的套件
4. **檢查版本**：發布前確認版本號正確

## 🔍 驗證發布

發布完成後，可以驗證：

```bash
# 查看發布的版本
npm view <套件名稱> versions

# 查看特定 tag 的版本
npm view <套件名稱>@beta version
npm view <套件名稱>@alpha version

# 查看所有 dist-tags
npm view <套件名稱> dist-tags
```

## 💡 提示

- 如果發布失敗，檢查錯誤訊息
- 確保 `dist/` 目錄包含所有必要文件
- 確保 `package.json` 中的 `files` 欄位正確
- 如果遇到權限問題，確認已登入正確的 NPM 帳號

