# 本地開發環境設定

## 前置條件

- Node.js 20+ 或 Bun 1.3+
- Docker & Docker Compose
- Git

## 快速開始

### 1. 啟動開發環境

```bash
# 進入 example 目錄
cd examples/flash-sale-fullstack

# 啟動資料庫 + Redis
docker-compose up -d

# 驗證服務是否正常運行
docker-compose ps
```

### 2. 安裝依賴

```bash
# 在根目錄（gravito-core-ci-fix）
bun install
```

### 3. 執行資料庫遷移

```bash
# TODO: 遷移命令待實作
# bun run db:migrate
```

### 4. 啟動應用

```bash
# 在 examples/flash-sale-fullstack 目錄
bun run dev
```

應用將在 http://localhost:3000 啟動。

## 本地服務訪問

| 服務 | 地址 | 用途 |
|------|------|------|
| API | http://localhost:3000 | 應用 API |
| PostgreSQL | localhost:5432 | 資料庫 |
| Redis | localhost:6379 | 快取 + 鎖 |
| Redis GUI | http://localhost:8081 | Redis 可視化 |
| PgAdmin | http://localhost:5050 | 資料庫管理 |

## 環境變數

複製 `.env.example` 為 `.env`：

```bash
# HTTP Server
HTTP_HOST=0.0.0.0
HTTP_PORT=3000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=flash_sale

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Application
NODE_ENV=development
LOG_LEVEL=debug
```

## 停止開發環境

```bash
# 停止容器但保留數據
docker-compose stop

# 停止並移除容器
docker-compose down

# 停止並移除所有數據
docker-compose down -v
```

## 常見問題

### Port 已被佔用

如果 5432、6379 等 port 已被使用，修改 `docker-compose.yml` 中的 port mapping：

```yaml
postgres:
  ports:
    - "15432:5432"  # 外部 port:內部 port

redis:
  ports:
    - "16379:6379"
```

### 資料庫連接失敗

確保 PostgreSQL 容器已完全啟動：

```bash
# 檢查日誌
docker-compose logs postgres

# 手動驗證
psql -h localhost -U postgres -d flash_sale
```

### Redis 連接問題

驗證 Redis 連接：

```bash
# 使用 redis-cli
docker-compose exec redis redis-cli ping
```

## 下一步

- 查看 [ROADMAP.md](../ROADMAP.md) 了解開發計畫
- 查看 [ARCHITECTURE.md](../ARCHITECTURE.md) 了解系統設計
