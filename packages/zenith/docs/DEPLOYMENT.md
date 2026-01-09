# Flux Console Deployment Guide

This whitepaper outlines the recommended deployment strategies for Gravito Flux Console in various environments, from local development to enterprise-scale production clusters.

## 1. Deployment Philosophy: "Zero-Config, Anywhere"

Flux Console is designed to be infrastructure-agnostic. It acts as a stateless monitoring interface that connects to your existing infrastructure (Redis). It does not require its own dedicated database for basic operation.

### Core Dependencies
- **Runtime**: Node.js 18+ OR Bun 1.0+ (or use standard binary)
- **Infrastructure**: Redis 6.0+ (Required for state coordination)
- **Optional**: SQL Database (MySQL/PostgreSQL) for History Persistence (Future Feature)

---

## 2. Deployment Scenarios

### Scenario A: Local Development (The "NPM" Way)
Best for individual developers debugging workers locally.

**Prerequisites:** Node.js or Bun installed.

```bash
# S1. Run directly via npx (Zero Installation)
npx @gravito/flux-console
# Automatically detects local Redis at localhost:6379 and opens browser.

# S2. Install globally for frequent use
npm install -g @gravito/flux-console
flux-console start
```

### Scenario B: Traditional VM / EC2 (The "Process" Way)
Best for bare-metal servers or performance-critical environments where avoiding Docker overhead is desired.

**Option 1: Node.js + PM2 (Recommended)**
```bash
# 1. Install globally
npm install -g @gravito/flux-console pm2

# 2. Start with PM2 for auto-restart and log management
pm2 start flux-console --name flux-monitor -- --port 3000

# 3. Configure Env Vars (if Redis is remote)
pm2 set flux-monitor:env.REDIS_URL redis://prod-redis:6379
```

**Option 2: Standalone Binary (The "Go" Way)**
*Ideal for restricted environments without Node.js installed.*
1. Download the binary: `flux-console-linux-x64`
2. `chmod +x ./flux-console-linux-x64`
3. `./flux-console-linux-x64`

### Scenario C: Docker & Container Platforms (The "Cloud-Native" Way)
Best for Kubernetes, AWS ECS, Google Cloud Run, or simple Docker Compose setups.

**1. Docker Run**
```bash
docker run -d \
  -p 3000:3000 \
  -e REDIS_URL=redis://your-redis-host:6379 \
  -e AUTH_SECRET=my-super-secret-password \
  --name flux-console \
  gravito/flux-console:latest
```

**2. Docker Compose (Full Stack Example)**
```yaml
version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  flux-console:
    image: gravito/flux-console:latest
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - PORT=3000
    depends_on:
      - redis

  # Your Application Workers
  worker-orders:
    build: .
    command: npm run start:worker
    environment:
      - REDIS_URL=redis://redis:6379
```

**3. Kubernetes (K8s)**
Deploy as a simple Deployment + Service.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flux-console
spec:
  replicas: 1
  selector:
    matchLabels:
      app: flux-console
  template:
    metadata:
      labels:
        app: flux-console
    spec:
      containers:
        - name: flux-console
          image: gravito/flux-console:latest
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: redis-secrets
                  key: url
          ports:
            - containerPort: 3000
```

---

## 3. Security Best Practices

Since Flux Console provides administrative capabilities (Pause Queue, Retry Job, Delete Job), security is paramount in production.

1. **Network Isolation (Private VPC)**:
   - **Recommendation**: Do NOT expose Flux Console to the public internet.
   - Deploy it within your VPN / Private Subnet.
   - Access via VPN or SSH Tunnel.

2. **Authentication**:
   - Enable built-in simple auth by setting `AUTH_PASSWORD` env var.
   - For enterprise, put it behind an Identity Aware Proxy (e.g., Cloudflare Access, AWS ALB OIDC) to enforce SSO (Google/Okta) login.

3. **Read-Only Mode (Future Feature)**:
   - For giving access to support teams, run a separate instance with `READ_ONLY=true` env var (Roadmap item).

## 4. Scaling (High Availability)

Flux Console is **stateless**. You can run multiple instances behind a Load Balancer for high availability.

- **Session Affinity**: Not required (JWT based Auth).
- **Resource Usage**: Very low (mostly forwarding Redis data). A standard `t3.micro` or `256MB` container is usually sufficient for monitoring even large clusters.

---

## 5. Troubleshooting

**Common Issue: "Cannot connect to Redis"**
- **Docker**: Ensure you use the service name (e.g., `redis`) not `localhost` if inside the same network. Host networking might be needed for accessing host Redis.
- **AWS ElastiCache**: Ensure Security Groups allow traffic on port 6379 from the Console's security group.
- **Encryption**: If Redis uses TLS (rediss://), ensure certificates are trusted or use `REDIS_TLS_REJECT_UNAUTHORIZED=0` (not recommended for prod).
