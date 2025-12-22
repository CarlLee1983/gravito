# NPM 發布快速開始

## 🚀 快速發布步驟

### 1. 準備工作（首次發布）

```bash
# 1. 登入 NPM
npm login

# 2. 確認登入狀態
npm whoami

# 3. 確認 registry
npm config get registry
# 應該顯示: https://registry.npmjs.org/
```

### 2. 更新版本號

```bash
# 根據官網使用情況更新版本號
bun run version:update
```

這會：
- 官網使用的套件 → `1.0.0-beta.1`
- 其他套件 → `1.0.0-alpha.1`

### 3. 構建和測試

```bash
# 構建所有套件
bun run build

# 執行測試（可選）
bun run test
```

### 4. 發布（三種方式）

#### 方式 A：使用發布腳本（推薦）

```bash
# 先測試（不實際發布）
bun run publish:dry-run

# 實際發布
# 如果使用瀏覽器 Key 驗證：直接執行，會自動打開瀏覽器
bun run publish:all

# 如果使用認證器 App：需要提供 OTP
bun run publish:all --otp=<你的OTP代碼>

# 或使用環境變數
NPM_OTP=<你的OTP代碼> bun run publish:all
```

#### 方式 B：直接執行腳本

```bash
# 測試模式
bun run scripts/publish-all.ts --dry-run

# 實際發布（帶 OTP）
bun run scripts/publish-all.ts --otp=<你的OTP代碼>
```

#### 方式 C：手動發布單一套件

```bash
cd packages/core
bun run build
bun test
npm publish --access public --otp=<你的OTP代碼>
```

## ⚠️ 重要注意事項

1. **2FA 驗證**：
   - 如果 NPM 帳號啟用了 2FA，發布時需要提供 OTP
   - 使用 `--otp=<code>` 參數或 `NPM_OTP` 環境變數

2. **發布順序**：
   - 腳本會自動按順序發布
   - 建議先發布核心套件（`gravito-core`）
   - 再發布依賴它的套件

3. **發布後驗證**：
   ```bash
   npm view gravito-core@beta
   npm view @gravito/orbit-auth@alpha
   ```

## 📋 發布檢查清單

- [ ] NPM 已登入
- [ ] Registry 設定正確
- [ ] 版本號已更新（`bun run version:update`）
- [ ] 所有套件已構建
- [ ] 所有測試通過（可選）
- [ ] 已準備 OTP（如果啟用了 2FA）
- [ ] 已執行 dry-run 測試

## 🎯 版本策略

### Beta 版本（核心穩定）

以下套件發布為 `1.0.0-beta.*`：
- `gravito-core`
- `@gravito/horizon`
- `@gravito/luminosity`
- `@gravito/luminosity-adapter-hono`
- `@gravito/stasis`

### Alpha 版本（功能模組）

其他套件發布為 `1.0.0-alpha.*`，包括：
- 資料庫與儲存：`db`, `dark-matter`, `nebula`, `plasma`
- 視圖：`freeze`, `freeze-react`, `freeze-vue`, `prism`
- 系統：`sentinel`, `impulse`, `ion`, `pulsar`, `signal` 等

## 🔍 安裝方式

```bash
# 安裝 beta 版本
npm install gravito-core@beta

# 安裝 alpha 版本
npm install @gravito/orbit-auth@alpha
```

## 🐛 遇到問題？

查看完整指南：`docs/NPM_PUBLISHING_GUIDE.md`
