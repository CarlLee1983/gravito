# 發布問題排查指南

## 常見發布失敗原因

### 1. 版本已存在

如果套件版本已經發布過，NPM 會拒絕重複發布。

**檢查方法**：
```bash
npm view <套件名稱>@<版本號> version
```

**解決方案**：
- 更新版本號後再發布
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

# 或使用瀏覽器驗證（WebAuthn）
# 發布時會自動打開瀏覽器進行驗證
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

### 6. 預發布版本缺少 tag

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

### 手動檢查清單

1. [Complete] package.json 存在且正確
2. [Complete] 版本號格式正確
3. [Complete] dist 目錄存在
4. [Complete] main/module 文件存在
5. [Complete] bin 文件存在（如果有）
6. [Complete] prepublishOnly 腳本通過
7. [Complete] NPM 已登入
8. [Complete] 版本未重複發布

## 快速修復流程

```bash
# 1. 檢查套件狀態
cd packages/<套件名稱>
bun run publish:validate .

# 2. 確保已構建
bun run build

# 3. 測試 prepublishOnly
bun run prepublishOnly

# 4. 執行 dry-run
npm publish --access public --tag <beta|alpha> --dry-run

# 5. 實際發布
npm publish --access public --tag <beta|alpha>
```

## 獲取詳細錯誤訊息

```bash
# 查看最新的 NPM 日誌
ls -lt ~/.npm/_logs/*.log | head -1 | awk '{print $NF}' | xargs tail -50

# 或查看特定套件的發布日誌
cd packages/<套件名稱>
npm publish --access public --tag <beta|alpha> --loglevel=verbose
```

