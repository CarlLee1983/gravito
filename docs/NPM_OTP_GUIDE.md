# NPM OTP 驗證指南

## 什麼是 OTP？

OTP（One-Time Password，一次性密碼）是 NPM 2FA（雙因素認證）的安全驗證碼。當你的 NPM 帳號啟用了 2FA 時，發布套件需要提供這個驗證碼。

## 如何獲取 OTP

### 方式一：使用認證器 App（推薦）

如果你使用認證器 App（如 Google Authenticator、Authy、1Password 等）：

1. **打開你的認證器 App**
2. **找到 NPM 的條目**
3. **查看當前顯示的 6 位數字**
4. **這個數字就是 OTP**（每 30 秒更新一次）

### 方式二：使用簡訊（如果設定了）

如果你設定了簡訊驗證：

1. **NPM 會自動發送 OTP 到你的手機**
2. **查看簡訊獲取 6 位數字**
3. **使用這個數字作為 OTP**

### 方式三：使用備用代碼

如果你有備用代碼（Recovery Codes）：

1. **使用其中一個備用代碼**
2. **注意：備用代碼只能使用一次**

## 使用驗證發布套件

### 方法 1：瀏覽器 Key 驗證（WebAuthn）

如果你使用瀏覽器 Key 驗證：

```bash
# 直接執行發布，NPM 會自動打開瀏覽器進行驗證
bun run publish:all
```

**流程**：
1. 執行命令後，NPM 會顯示一個 URL
2. 瀏覽器會自動打開（或手動複製 URL 到瀏覽器）
3. 在瀏覽器中完成驗證（指紋、Face ID 等）
4. 驗證完成後，發布會自動繼續

### 方法 2：使用命令行參數（TOTP）

如果你使用認證器 App：

```bash
# 獲取 OTP 後，立即執行（OTP 有時效性，通常 30 秒）
bun run publish:all --otp=123456
```

### 方法 3：使用環境變數（TOTP）

```bash
# 設定環境變數
export NPM_OTP=123456

# 然後執行發布
bun run publish:all
```

### 方法 4：互動式輸入

某些情況下，NPM 會提示你輸入 OTP：

```bash
bun run publish:all
# 當提示時，輸入 OTP
```

## ⚠ 重要注意事項

### OTP 時效性

- **OTP 通常只有 30 秒的有效期**
- **過期後需要獲取新的 OTP**
- **建議在準備發布時再獲取 OTP**

### 發布時間

由於 OTP 有時效性，建議：

1. **先執行 dry-run 測試**：
   ```bash
   bun run publish:dry-run
   ```

2. **確認一切正常後，獲取 OTP**

3. **立即執行發布**：
   ```bash
   bun run publish:all --otp=<剛獲取的OTP>
   ```

### 批量發布

如果發布多個套件，可能需要：

- **使用同一個 OTP**（如果發布速度夠快）
- **或準備多個 OTP**（如果發布時間較長）

## 檢查 2FA 狀態

### 查看當前 2FA 設定

```bash
npm profile get
```

### 管理 2FA

```bash
# 啟用 2FA
npm profile enable-2fa auth-and-writes

# 查看 2FA 狀態
npm profile get
```

## 最佳實踐

### 1. 準備發布流程

#### 使用瀏覽器 Key 驗證：

```bash
# 步驟 1：確認準備就緒
bun run publish:dry-run

# 步驟 2：直接執行發布（會自動打開瀏覽器驗證）
bun run publish:all
```

#### 使用認證器 App：

```bash
# 步驟 1：確認準備就緒
bun run publish:dry-run

# 步驟 2：打開認證器 App，準備獲取 OTP

# 步驟 3：獲取 OTP 並立即執行
bun run publish:all --otp=<OTP>
```

### 2. 如果 OTP 過期

如果 OTP 過期，你會看到錯誤：

```
npm error code EOTP
npm error This operation requires a one-time password from your authenticator.
```

解決方法：
1. **獲取新的 OTP**
2. **重新執行發布命令**

### 3. 使用環境變數（推薦）

為了方便，可以設定環境變數：

```bash
# 在發布前設定
export NPM_OTP=$(your-otp-getter-script)  # 如果有自動獲取腳本

# 或手動設定
export NPM_OTP=123456

# 執行發布
bun run publish:all
```

## 常見問題

### Q: OTP 一直過期怎麼辦？

A: 
- 確保在獲取 OTP 後立即使用
- 如果發布時間較長，可能需要多次獲取 OTP
- 考慮使用 `--skip-build` 和 `--skip-test` 來加快發布速度

### Q: 可以禁用 2FA 嗎？

A: 
- 不建議禁用 2FA，這會降低帳號安全性
- 如果必須禁用，使用 `npm profile disable-2fa`

### Q: 忘記了認證器 App 怎麼辦？

A: 
- 使用備用代碼（如果有的話）
- 或聯繫 NPM 支援恢復帳號

## 相關資源

- [NPM 2FA 文檔](https://docs.npmjs.com/configuring-two-factor-authentication)
- [NPM 帳號管理](https://docs.npmjs.com/managing-your-account)

