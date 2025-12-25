---
title: Production Deployment
---

# Deployment Guide: From Launchpad to Orbit

Shipping your application is the final milestone of the Gravito journey. Powered by **Bun's** cross-platform performance, Gravito supports multiple deployment paths—whether you need a full-stack dynamic container, a lightning-fast static site (SSG), or serverless edge functions.

---

## Pre-Launch Prep: Environment Configuration

Before deploying, ensure your production environment variable system is properly configured.

### 1. Environment Variables (`.env.production`)
Create a `.env.production` file. This will be automatically loaded by Bun or bundled into your container:

```bash
# .env.production
NODE_ENV=production
BASE_URL=https://your-domain.com
API_KEY=********
SESSION_SECRET=********
```

### 2. Production Optimizations
Ensure your build command includes `NODE_ENV=production`. This triggers essential production optimizations in Vite, React, and Vue, stripping out development-only code and minifying assets.

---

## Route A: Full-stack Orbit (Docker Containerization)

This is the recommended deployment method, ensuring 100% consistency between your local development environment and the cloud production environment.

### Optimized Multi-stage Build
Use this Dockerfile to minimize image size and maximize startup speed:

```dockerfile
# Stage 1: Build Environment
FROM oven/bun:latest as builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build # Compile frontend assets

# Stage 2: Runtime Environment
FROM oven/bun:slim
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

### Cloud Providers
You can push the generated Docker Image to various platforms:
- **Google Cloud Run** (Highly Recommended)
- **AWS App Runner / ECS**
- **DigitalOcean App Platform**

---

## Route B: Frozen Path (Static Site Generation)

Ideal for documentation, blogs, or websites that don't require real-time backend logic.

### 1. Execute Static Build
```bash
bun run build:static
```

### 2. Deployment Targets
The generated `dist-static/` directory can be deployed to any static storage service:
- **Cloudflare Pages** (Fastest edge distribution)
- **GitHub Pages** (Free and easy via GitHub Actions)
- **Vercel**

> 💡 **Developer Note**: Internal navigation in SSG projects must use the `StaticLink` component. For detailed configuration, refer to the [Static Site Development Guide](./static-site-development.md).

---

## Route C: Edge Jump (Edge / Serverless)

Gravito's core engine is lightweight by design, making it a perfect fit for restricted edge environments.

- **Cloudflare Workers**: Leverage `PhotonAdapter` or our dedicated adapters.
- **AWS Lambda**: Benefit from Bun's millisecond-range cold start times.

---

## CI/CD Best Practices: Automation Map

A mature project should have an automated deployment pipeline:

1.  **Dependency Locking**: Always use `bun install --frozen-lockfile` in pipelines to prevent version drift.
2.  **Quality Gates**: Run `bun test` and `bun run typecheck` as mandatory steps before the `build` phase.
3.  **Health Tracking**: Implement a `/health` or `/status` route for load balancers and monitoring services.

---

## Post-Launch Checklist: SEO & Indexing

Once deployed, make sure to complete the final tasks to ensure search engines can find you:

1.  **Verify Sitemap**: Check if your `BASE_URL/sitemap.xml` is accessible and valid.
2.  **Submit to Console**: Submit your sitemap URL to Google Search Console or Bing Webmaster Tools.
3.  **Meta Validation**: Use the Luminosity Engine to verify OpenGraph data for social sharing.

For more information on configuring automated sitemap generation, see the [Sitemap System Guide](./sitemap-guide.md).

---

> **Congratulations!** Your Gravito project is now in stable orbit. You can now focus on creating content and iterating on features, while Gravito handles the heavy lifting.
