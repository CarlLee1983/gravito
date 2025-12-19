# 🚢 Deployment Guide

Shipping your application is the final step of the journey. Gravito, being powered by **Bun**, offers extreme performance and multiple ways to reach your users—whether you want a full-stack dynamic app, a static site, or an edge function.

## 🛠 Preparation

Before deploying, ensure you have your production environment variables set up. Create a `.env.production` file:

```bash
# .env.production
NODE_ENV=production
BASE_URL=https://your-app.com
GA_MEASUREMENT_ID=G-XXXXXXXX
```

---

## 📦 Option 1: Full-stack Docker (Recommended)

Docker ensures your app runs exactly the same on your server as it does on your laptop.

### 1. The Multi-stage Dockerfile
Use this optimized Dockerfile to keep your production image small and fast.

```dockerfile
# Build Stage
FROM oven/bun:latest as builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build # Compiles React/Vite assets

# Production Stage
FROM oven/bun:slim
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

### 2. Build and Run
```bash
docker build -t my-gravito-app .
docker run -p 3000:3000 --env-file .env.production my-gravito-app
```

---

## ⚡ Option 2: Static Site Generation (SSG)

If you are building a documentation site or a blog, SSG is the fastest and cheapest option. It generates pure HTML files that you can host on **GitHub Pages**, **Vercel**, or **Netlify**.

### 1. Run the Build
```bash
bun run build:static
```

### 2. The Output
Your static files will be generated in the `dist/` directory. Simply upload this folder to any static hosting provider.

---

## ☁️ Option 3: Edge & Serverless

Because Gravito is built on the **Hono** engine, it can run "on the edge" (closer to your users).

- **Cloudflare Workers**: Use our Cloudflare adapter.
- **Vercel Functions**: Deploy directly using the Vercel CLI.
- **AWS Lambda**: High-speed cold starts thanks to Bun's efficiency.

## ⚙️ CI/CD Best Practices

1. **Frozen Lockfile**: Always use `bun install --frozen-lockfile` in your pipeline to prevent version drift.
2. **Build Verification**: Run `bun test` before building to ensure zero regressions.
3. **Health Checks**: Implement a `/health` route to allow your load balancer to monitor the app.

---

> **Congratulations!** You've completed the Gravito "Babysitting" Guide. You are now ready to build high-performance, AI-friendly applications that scale to infinity. ☄️
