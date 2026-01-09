---
title: Installation Guide
description: Set up Gravito and launch your first project.
---

# Installation Guide

> This guide helps you set up a Gravito dev environment from scratch. The goal is to get your first page running in under a minute.

## System Requirements

Gravito is built for modern environments. You only need:

- **OS**: macOS, Linux, or Windows (WSL2 recommended).
- **[Bun](https://bun.sh/)**: version 1.1.0+ (latest stable recommended).

### Install Bun

```bash
# macOS or Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

Confirm your version:

```bash
bun --version
```

## Create Your Project

We recommend the official CLI, which guides you through base setup.

### 1) Interactive (Recommended)
```bash
bunx gravito create
```
This wizard lets you choose:
- Project name
- Frontend framework (React / Vue)
- Template type (Fullstack / API Only / Blog)

### 2) Direct command
```bash
bunx create-gravito-app@latest my-awesome-app
```

## Project Initialization

```bash
cd my-awesome-app
bun install
```

## Start the Dev Server

```bash
bun dev
```

Then open:
- App: **http://localhost:3000**
- HMR: **Vite runs on port 5173** (proxied through the app)

## Common Commands

| Command | Description |
| --- | --- |
| `bun dev` | Start dev mode with HMR |
| `bun build` | Build for production |
| `bun start` | Start production server |
| `bun gravito` | Open Gravito CLI tools |

## FAQ

### Why Bun over Node.js?
Bun includes native TypeScript, fast tests, and much faster installs than npm/yarn. Gravito integrates with Bun APIs for best performance.

### Docker support?
Yes. Templates include a standard `Dockerfile` for easy container deployment.

---

## Next Steps
You are ready to build. Learn the [Project Structure](./project-structure.md) or jump to [Quick Start](./quick-start.md).
