# Gravito Launchpad 部署手冊

本指南將引導您在單一 Linux 伺服器上部署 Gravito Launchpad，打造私有化的極速預覽環境。

## 1. 基礎設施準備

### 建議規格
- **OS**: Ubuntu 22.04 LTS (或任何支援 Docker 的 Linux 發行版)
- **CPU**: 2 vCPU 以上
- **RAM**: 4 GB 以上 (視併發預覽數量而定，每個 Bun 容器約佔 50-100MB)
- **Disk**: 20 GB 以上

### 軟體安裝
請以 `root` 或具備 `sudo` 權限的用戶執行：

```bash
# 1. 安裝 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. 安裝 Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 3. 安裝 Git
sudo apt update && sudo apt install -y git
```

## 2. 獲取與配置 Launchpad

```bash
# 1. 拉取專案
git clone https://github.com/gravito-framework/gravito.git
cd gravito

# 2. 安裝依賴
bun install

# 3. 構建 Dashboard 前端
cd packages/launchpad-dashboard
bun run build
cd ../..
```

## 3. 啟動服務 (生產模式)

建議使用 `pm2` 來管理進程，確保崩潰自動重啟。

```bash
# 安裝 PM2
bun add -g pm2

# 啟動後端 (Mission Control)
cd packages/launchpad
pm2 start server.ts --interpreter bun --name "launchpad-server"

# 啟動前端 (Dashboard)
# 這裡我們使用一個簡單的靜態檔案伺服器，或者直接讓 Caddy 代理
# 為了簡單，我們用 bun 內建 server 跑靜態檔
cd ../launchpad-dashboard
pm2 start "bun x serve dist -p 5173" --name "launchpad-ui"
```

## 4. 設定反向代理與 SSL (使用 Caddy)

Caddy 是最簡單的解決方案，它會自動申請並續期 Let's Encrypt 證書。

1.  安裝 Caddy: [官方指南](https://caddyserver.com/docs/install)
2.  配置 `/etc/caddy/Caddyfile`:

```caddyfile
# 1. Launchpad Dashboard (UI)
dashboard.your-domain.com {
    reverse_proxy localhost:5173
}

# 2. Launchpad API (Webhook)
api.your-domain.com {
    reverse_proxy localhost:4000
}

# 3. 泛域名預覽環境 (Wildcard)
# 需配合 DNS 設定 *.dev.your-domain.com 指向此 IP
*.dev.your-domain.com {
    # 這裡需要進階配置：Launchpad 需實作動態路由表
    # 或者暫時使用 Port Mapping 方式訪問 (http://IP:Port)
    respond "Router Not Yet Implemented" 200
}
```

3.  重啟 Caddy: `sudo systemctl reload caddy`

## 5. 設定 GitHub Webhook

1.  進入您的 GitHub Repo -> **Settings** -> **Webhooks** -> **Add webhook**。
2.  **Payload URL**: `https://api.your-domain.com/launch`
3.  **Content type**: `application/json`
4.  **Events**: 選擇 `Let me select individual events` -> 勾選 **Pull requests**。
5.  **Active**: ✅

## 6. (進階) 安全性設定

為了防止惡意觸發，建議在 Launchpad 中驗證 GitHub Signature。

*   在 GitHub Webhook 設定 **Secret** (例如 `my-super-secret`).
*   在伺服器環境變數設定 `GITHUB_WEBHOOK_SECRET=my-super-secret`.
*   Launchpad 後端需實作 `X-Hub-Signature-256` 驗證邏輯。

## 常見問題 (FAQ)

### Q: 容器啟動失敗？
A: 檢查 Docker 服務是否正常：`docker ps`。確保 Image 已下載：`docker pull oven/bun:1.0-slim`。

### Q: 依賴安裝太慢？
A: 確保已掛載宿主機的 Bun Cache (Launchpad 預設已啟用)。

### Q: 硬碟滿了？
A: 設定 Cron Job 定期清理無用 Image：`docker system prune -a -f`。
```
