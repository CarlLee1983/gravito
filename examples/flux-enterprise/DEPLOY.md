
# 🚀 Flux Enterprise Deployment Guide

本指南將協助您將 Flux Enterprise 佈署至生產環境 (Linux/EC2)。

## 1. 環境準備 (Prerequisites)

確保伺服器已安裝以下軟體：
- **Bun Runtime** (v1.0+): `curl -fsSL https://bun.sh/install | bash`
- **Redis Server** (v6+): 用於 Queue 與 Distributed Lock。

## 2. 資源體檢與配置 (Profiling & Config)

在正式啟動前，請先執行體檢工具，決定最佳的併發數。

```bash
# 1. 執行體檢
bun run scripts/profile-workflow.ts

# 2. 根據建議設定環境變數 (.env 或 System Environment)
# 範例：如果體檢建議 100，機器有 2 核，且為 I/O Bound
export CONCURRENCY=100
export QUEUE_DRIVER=redis
export REDIS_URL=redis://localhost:6379 
```

## 3. 服務架構 (Service Architecture)

本系統由兩個獨立 Process 組成，建議分開管理 (Systemd 或 PM2)：

### A. Web Server (API & Dashboard)
- **職責**: 接收 HTTP 請求、WebSocket 即時監控面板。
- **指令**: `bun run src/server.ts`
- **Port**: 3000 (預設)

### B. Worker Service (Consumers)
- **職責**: 處理 Redis 中的任務 (Group FIFO 核心)。
- **指令**: `bun run src/consumer.ts`
- **擴展**: 單機內透過 `CONCURRENCY` 擴展；多機透過增加節點擴展。

---

## 4. Systemd 服務設定範例 (Recommended)

在 `/etc/systemd/system/` 下建立以下檔案：

### `/etc/systemd/system/flux-web.service`
```ini
[Unit]
Description=Flux Web Server
After=network.target redis.service

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/app/flux-enterprise
Environment="NODE_ENV=production"
Environment="REDIS_URL=redis://localhost:6379"
ExecStart=/home/ec2-user/.bun/bin/bun run src/server.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/flux-worker.service`
```ini
[Unit]
Description=Flux Consumer Workers
After=network.target redis.service

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/app/flux-enterprise
Environment="NODE_ENV=production"
Environment="QUEUE_DRIVER=redis"
Environment="REDIS_URL=redis://localhost:6379"
# SET THIS BASED ON PROFILER RESULT
Environment="CONCURRENCY=50"
ExecStart=/home/ec2-user/.bun/bin/bun run src/consumer.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

## 5. 啟動服務

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now flux-web
sudo systemctl enable --now flux-worker

# 檢查狀態
systemctl status flux-web flux-worker
```
