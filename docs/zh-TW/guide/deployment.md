# 🚀 佈署指南

Gravito 支援兩種主要佈署策略：**Binary-First** (推薦) 和 **Docker 容器化**。

---

## 📦 方案一：單一執行檔 (Binary-First) ⭐

這是 Gravito 的主打亮點。將整個應用程式編譯成獨立的二進位執行檔。

### 編譯指令

```bash
bun build --compile --outfile=server ./src/index.ts
```

### 產出結構

```
dist/
├── server          # 獨立 Binary 執行檔
└── public/         # 靜態資源資料夾
    ├── css/
    ├── js/
    └── images/
```

### 優勢

| 優點 | 說明 |
|------|------|
| **零依賴** | 伺服器無需安裝 Node、npm 或 Bun |
| **簡單佈署** | 只需複製 binary 和 public 資料夾 |
| **快速啟動** | 亞毫秒級冷啟動 |
| **安全性** | 原始碼已編譯，不會暴露 |

### 佈署步驟

1. **在開發機器上編譯：**
   ```bash
   bun run build
   ```

2. **複製到正式伺服器：**
   ```bash
   scp -r dist/ user@server:/opt/app/
   ```

3. **在 Linux 上執行：**
   ```bash
   chmod +x /opt/app/server
   /opt/app/server
   ```

4. **設定 systemd 服務 (選配)：**
   ```ini
   [Unit]
   Description=Gravito Application
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/opt/app
   ExecStart=/opt/app/server
   Restart=on-failure
   Environment=PORT=3000
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

---

## 🐳 方案二：Docker 容器化 (企業標準)

適合需要容器編排 (Kubernetes、Docker Swarm) 的團隊。

### Multi-stage Dockerfile

```dockerfile
# ============================================
# Stage 1: Build
# ============================================
FROM oven/bun:1 AS builder

WORKDIR /app

# 複製 package 檔案
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 複製原始碼
COPY . .

# 編譯前端資源
RUN bun run build:client

# 編譯 Binary
RUN bun build --compile --outfile=server ./src/index.ts

# ============================================
# Stage 2: Production
# ============================================
FROM debian:bookworm-slim

# 安裝最小依賴
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 建立非 root 使用者
RUN useradd -m -s /bin/bash appuser

WORKDIR /app

# 從 builder 複製 binary 和資源
COPY --from=builder /app/server /app/server
COPY --from=builder /app/dist/public /app/public

# 設定權限
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

CMD ["/app/server"]
```

### 建置與執行

```bash
# 建置映像檔
docker build -t my-gravito-app:latest .

# 執行容器
docker run -d \
  --name gravito-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgres://... \
  my-gravito-app:latest
```

### Docker Compose 範例

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://postgres:password@db:5432/app
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=app

volumes:
  pgdata:
```

---

## 🔧 正式環境檢查清單

佈署到正式環境前，請確認：

| 項目 | 指令/動作 |
|------|----------|
| ✅ 執行測試 | `bun test` |
| ✅ 編譯前端 | `bun run build:client` |
| ✅ 設定 `NODE_ENV` | `export NODE_ENV=production` |
| ✅ 設定密鑰 | 使用環境變數，而非 `.env` |
| ✅ 啟用 HTTPS | 使用反向代理 (nginx, Caddy) |
| ✅ 設定日誌 | 配置日誌聚合系統 |
| ✅ 健康檢查 | 實作 `/health` 端點 |

---

## 🌐 反向代理設定

### Nginx

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/ssl/certs/example.com.pem;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip 壓縮
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
}
```

### Caddy (更簡單的替代方案)

```caddyfile
example.com {
    reverse_proxy localhost:3000
}
```

---

## 📊 監控

### 健康檢查端點

```typescript
// src/routes/health.ts
core.app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})
```

### Prometheus 指標 (選配)

```typescript
import { prometheus } from '@hono/prometheus'

core.app.use('*', prometheus())
core.app.get('/metrics', prometheus.handler)
```

---

## 🔐 安全建議

1. **永遠不要提交密鑰** - 使用環境變數
2. **謹慎啟用 CORS** - 在正式環境限制來源
3. **速率限制** - 防止 DDoS 攻擊
4. **保持依賴更新** - 定期進行安全稽核
5. **僅使用 HTTPS** - 將所有 HTTP 流量重新導向

---

*更多詳情，請參閱專案根目錄的 [GRAVITO_AI_GUIDE.md](../../../GRAVITO_AI_GUIDE.md)。*
