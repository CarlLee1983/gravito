# 🚀 Deployment Guide

Gravito supports two primary deployment strategies: **Binary-First** (recommended) and **Docker Containerization**.

---

## 📦 Option 1: Single Executable (Binary-First) ⭐

This is Gravito's headline feature. Compile your entire application into a standalone binary.

### Build Command

```bash
bun build --compile --outfile=server ./src/index.ts
```

### Output Structure

```
dist/
├── server          # Standalone binary executable
└── public/         # Static assets folder
    ├── css/
    ├── js/
    └── images/
```

### Advantages

| Benefit | Description |
|---------|-------------|
| **Zero Dependencies** | Server doesn't need Node, npm, or Bun installed |
| **Simple Deployment** | Just copy the binary and public folder |
| **Fast Startup** | Sub-millisecond cold start |
| **Security** | Source code is compiled, not exposed |

### Deployment Steps

1. **Build on your development machine:**
   ```bash
   bun run build
   ```

2. **Copy to production server:**
   ```bash
   scp -r dist/ user@server:/opt/app/
   ```

3. **Run on Linux:**
   ```bash
   chmod +x /opt/app/server
   /opt/app/server
   ```

4. **Setup systemd service (optional):**
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

## 🐳 Option 2: Docker Containerization (Enterprise Standard)

For teams requiring container orchestration (Kubernetes, Docker Swarm).

### Multi-stage Dockerfile

```dockerfile
# ============================================
# Stage 1: Build
# ============================================
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend assets
RUN bun run build:client

# Compile binary
RUN bun build --compile --outfile=server ./src/index.ts

# ============================================
# Stage 2: Production
# ============================================
FROM debian:bookworm-slim

# Install minimal dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash appuser

WORKDIR /app

# Copy binary and assets from builder
COPY --from=builder /app/server /app/server
COPY --from=builder /app/dist/public /app/public

# Set ownership
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

CMD ["/app/server"]
```

### Build & Run

```bash
# Build image
docker build -t my-gravito-app:latest .

# Run container
docker run -d \
  --name gravito-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgres://... \
  my-gravito-app:latest
```

### Docker Compose Example

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

## 🔧 Production Checklist

Before deploying to production, ensure:

| Item | Command/Action |
|------|----------------|
| ✅ Run tests | `bun test` |
| ✅ Build frontend | `bun run build:client` |
| ✅ Set `NODE_ENV` | `export NODE_ENV=production` |
| ✅ Configure secrets | Use environment variables, not `.env` |
| ✅ Enable HTTPS | Use reverse proxy (nginx, Caddy) |
| ✅ Setup logging | Configure log aggregation |
| ✅ Health checks | Implement `/health` endpoint |

---

## 🌐 Reverse Proxy Configuration

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

    # Gzip compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
}
```

### Caddy (Simpler Alternative)

```caddyfile
example.com {
    reverse_proxy localhost:3000
}
```

---

## 📊 Monitoring

### Health Check Endpoint

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

### Prometheus Metrics (Optional)

```typescript
import { prometheus } from '@hono/prometheus'

core.app.use('*', prometheus())
core.app.get('/metrics', prometheus.handler)
```

---

## 🔐 Security Recommendations

1. **Never commit secrets** - Use environment variables
2. **Enable CORS carefully** - Restrict origins in production
3. **Rate limiting** - Protect against DDoS
4. **Keep dependencies updated** - Regular security audits
5. **Use HTTPS only** - Redirect all HTTP traffic

---

*For more details, see the [GRAVITO_AI_GUIDE.md](../../../GRAVITO_AI_GUIDE.md) in the project root.*
