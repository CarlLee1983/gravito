# 診斷 CDN/快取問題指南

## 🔍 快速診斷步驟

### 1. 檢查文件版本是否一致

```bash
cd examples/atlas-site
bash scripts/check-deployment.sh
```

這個腳本會檢查：
- HTML 引用的 JS 文件名是否與本地一致
- 線上文件是否存在
- 文件大小是否一致
- 快取設定
- 是否包含修復代碼

### 2. 判斷快取問題的方法

#### A. 檢查 HTTP 標頭

```bash
# 檢查 HTML 快取
curl -I https://atlas.gravito.dev/features/ | grep -i "cache-control\|age\|last-modified"

# 檢查 JS 文件快取
curl -I https://atlas.gravito.dev/assets/index-XXXXX.js | grep -i "cache-control\|age\|last-modified"
```

**關鍵指標：**
- `cache-control: max-age=600` → HTML 快取 10 分鐘
- `cache-control: max-age=14400` → JS 文件快取 4 小時
- `age: XXX` → 文件在 CDN 中已快取的時間（秒）
- `x-proxy-cache: HIT/MISS` → Cloudflare 快取狀態

#### B. 比較文件內容

```bash
# 檢查線上文件是否包含修復
curl -s https://atlas.gravito.dev/assets/index-XXXXX.js | grep -o "__VUE_PROD_DEVTOOLS__[^,}]*"

# 檢查本地文件
grep -o "__VUE_PROD_DEVTOOLS__[^,}]*" dist/assets/index-XXXXX.js
```

如果線上文件沒有修復但本地有，表示：
- 需要重新部署
- 或瀏覽器/CDN 快取了舊版本

#### C. 檢查文件哈希

Vite 會為每個構建生成唯一的文件名（包含哈希），例如：
- `index-CuHO1I9n.js` (舊版本)
- `index-DP8zMrxn.js` (新版本)

如果 HTML 引用的是新文件名，但瀏覽器仍載入舊文件，就是快取問題。

### 3. 清除快取的方法

#### A. 瀏覽器快取

**Chrome/Edge:**
- Mac: `Cmd + Shift + R`
- Windows/Linux: `Ctrl + Shift + R`
- 或：開發者工具 > Network > 勾選 "Disable cache"

**Firefox:**
- Mac: `Cmd + Shift + R`
- Windows/Linux: `Ctrl + Shift + R`

**Safari:**
- `Cmd + Option + R`

#### B. Cloudflare CDN 快取

1. 登入 Cloudflare Dashboard
2. 選擇域名 `gravito.dev`
3. 進入 "Caching" > "Configuration"
4. 點擊 "Purge Everything" 或 "Custom Purge"
5. 輸入要清除的 URL 路徑：
   - `atlas.gravito.dev/assets/*`
   - `atlas.gravito.dev/features/`

#### C. 強制重新部署

```bash
# 1. 確保所有更改已提交
git status

# 2. 提交並推送（如果有未提交的更改）
git add .
git commit -m "fix: update vite config for production"
git push

# 3. 或手動觸發 GitHub Actions
# 在 GitHub 上進入 Actions > Deploy Atlas Site > Run workflow
```

### 4. 驗證修復是否生效

#### A. 檢查瀏覽器控制台

1. 開啟開發者工具 (F12)
2. 切換到 Console
3. 重新載入頁面 (Cmd/Ctrl + Shift + R)
4. 檢查是否還有 `installHook.js:1 SyntaxError` 錯誤

#### B. 檢查 Network 標籤

1. 開啟開發者工具 > Network
2. 重新載入頁面
3. 找到 `index-XXXXX.js` 文件
4. 檢查：
   - Status: 應該是 200
   - Size: 應該與本地文件大小一致
   - Type: `application/javascript`
   - 點擊文件查看 Response，確認包含修復代碼

#### C. 使用無痕模式測試

無痕模式不會使用快取，可以快速驗證：
- Chrome/Edge: `Cmd/Ctrl + Shift + N`
- Firefox: `Cmd/Ctrl + Shift + P`
- Safari: `Cmd + Shift + N`

### 5. 常見問題排查

#### 問題：HTML 引用新文件，但瀏覽器載入舊文件

**原因：** 瀏覽器快取了舊的 HTML 或 Service Worker

**解決：**
1. 清除瀏覽器快取
2. 檢查是否有 Service Worker（Application > Service Workers）
3. 使用無痕模式測試

#### 問題：線上文件與本地不一致

**原因：** 部署未完成或失敗

**解決：**
1. 檢查 GitHub Actions 是否成功
2. 檢查 `atlas-site-dist` 倉庫的最新 commit
3. 確認文件已正確推送到 GitHub Pages

#### 問題：文件已更新但仍有錯誤

**原因：** 
- CDN 快取未清除
- 瀏覽器快取
- 文件內容不正確

**解決：**
1. 清除 Cloudflare 快取
2. 清除瀏覽器快取
3. 驗證文件內容是否包含修復

### 6. 預防快取問題

#### A. 使用版本查詢參數（不推薦，因為 Vite 已使用哈希）

```html
<script src="/assets/index.js?v=1.0.0"></script>
```

#### B. 確保 Vite 使用哈希文件名（已配置）

```typescript
// vite.config.ts
entryFileNames: 'assets/[name]-[hash].js'
```

#### C. 設置適當的快取標頭

在 GitHub Pages 或 Cloudflare 中設置：
- HTML: `Cache-Control: max-age=600` (10 分鐘)
- JS/CSS: `Cache-Control: max-age=31536000` (1 年，因為有哈希)

### 7. 監控和日誌

#### 檢查部署日誌

```bash
# 查看最近的 GitHub Actions 運行
gh run list --workflow=deploy-atlas-site.yml --limit 5

# 查看特定運行的日誌
gh run view <run-id> --log
```

#### 檢查文件更新時間

```bash
# 線上文件
curl -I https://atlas.gravito.dev/assets/index-XXXXX.js | grep last-modified

# 本地文件
ls -lh dist/assets/index-*.js
```

如果線上文件的 `last-modified` 時間早於本地構建時間，表示需要重新部署。
