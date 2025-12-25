# 批次發布指南

## 批次發布功能

發布腳本現在支援智能批次發布，包含以下功能：

### 主要功能

1. **自動版本檢查**：發布前自動檢查版本是否已存在，已存在則跳過
2. **瀏覽器驗證**：第一個套件發布時自動觸發瀏覽器驗證（WebAuthn）
3. **智能跳過**：已發布的版本不會重複發布
4. **詳細統計**：顯示成功、跳過、失敗的套件數量

## 使用方式

### 基本使用

```bash
# 實際發布所有套件
bun run publish:all

# 測試模式（不實際發布，只檢查）
bun run publish:dry-run
```

### 發布流程

1. **檢查套件列表**：列出所有需要發布的套件
2. **檢查已發布版本**：自動檢查哪些版本已存在
3. **認證檢查**：確認 NPM 登入狀態
4. **瀏覽器驗證**：第一個套件發布時觸發瀏覽器驗證
5. **批次發布**：驗證成功後自動發布所有套件

### 發布結果

腳本會顯示三種類型的結果：

- **[Complete] 已存在（跳過）**：版本已發布，自動跳過
- **[Complete] 成功發布**：新發布的套件
- **❌ 失敗**：發布失敗的套件（會顯示原因）

## 瀏覽器驗證流程

### 自動驗證

當執行 `bun run publish:all` 時：

1. **第一個套件發布時**，NPM 會自動：
   - 顯示一個驗證 URL
   - 自動打開瀏覽器（或提示手動複製 URL）
   - 等待你在瀏覽器中完成驗證

2. **完成驗證後**：
   - 第一個套件會自動發布
   - 後續套件會自動繼續發布（無需再次驗證）

### 驗證方式

支援的驗證方式：
- **WebAuthn**（瀏覽器 Key）：指紋、Face ID、Touch ID 等
- **TOTP**（認證器 App）：如果使用 `--otp` 參數

## 範例輸出

```
 Gravito 套件批次發布工具

 找到 24 個套件:
  - gravito-core@1.0.0-beta.1
  - @gravito/stasis@1.0.0-beta.1
  ...

 檢查已發布的版本...
  ⏭  gravito-core@1.0.0-beta.1 已存在於 NPM，跳過發布
  ⏭  @gravito/stasis@1.0.0-beta.1 已存在於 NPM，跳過發布
  ...

 發布計劃:
  [Complete] 已存在（跳過）: 20 個
   需要發布: 4 個

 檢查 NPM 認證狀態...
[Complete] 已登入為: carllee1983

 準備進行瀏覽器驗證...
   注意：發布第一個套件時，NPM 會自動打開瀏覽器進行驗證
   請在瀏覽器中完成驗證（指紋、Face ID 等）
   驗證成功後，後續套件會自動發布

⏳ 等待 3 秒後開始發布...

 構建 @gravito/luminosity-adapter-photon...
  [Complete] @gravito/luminosity-adapter-photon 構建成功

 發布 @gravito/luminosity-adapter-photon@1.0.0-beta.1 (tag: beta)...
  [Complete] @gravito/luminosity-adapter-photon@1.0.0-beta.1 發布成功 (tag: beta)

 發布結果總結:
  ⏭  已存在（跳過）: 20
     - gravito-core@1.0.0-beta.1
     ...
  [Complete] 成功發布: 4
     - @gravito/luminosity-adapter-photon@1.0.0-beta.1
     ...

 所有套件處理完成！
```

## ⚙ 進階選項

### 跳過構建

```bash
bun run publish:all --skip-build
```

### 跳過測試

```bash
bun run publish:all --skip-test
```

### 組合使用

```bash
bun run publish:all --skip-build --skip-test
```

## 提示

1. **首次發布**：建議先執行 `bun run publish:dry-run` 檢查
2. **瀏覽器驗證**：確保瀏覽器已打開，以便自動完成驗證
3. **網路連線**：確保網路連線穩定，避免發布中斷
4. **版本檢查**：已存在的版本會自動跳過，不會重複發布

## 故障排除

### 認證問題

如果遇到認證錯誤：

```bash
# 重新登入
npm login

# 檢查登入狀態
npm whoami
```

### 版本已存在

如果版本已存在，腳本會自動跳過，這是正常行為。

### 瀏覽器驗證失敗

如果瀏覽器驗證失敗：

1. 確保瀏覽器已打開
2. 手動複製驗證 URL 到瀏覽器
3. 完成驗證後，重新執行發布腳本

## 注意事項

- 發布腳本會自動處理 alpha/beta 版本的 tag
- 已發布的版本不會重複發布
- 第一個套件發布時會觸發瀏覽器驗證
- 驗證成功後，後續套件會自動發布

