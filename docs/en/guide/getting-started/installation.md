---
title: Installation Guide
description: Set up Gravito and launch your first Galaxy Host.
---

# 🚀 Installation Guide

> This guide helps you set up a Gravito development environment from scratch. Our goal is to get your first **Galaxy Host** running in under a minute.

---

## 🛠️ System Requirements

Gravito is built for modern cloud-native environments. You only need:

- **OS**: macOS, Linux, or Windows (WSL2 recommended).
- **[Bun](https://bun.sh/)**: version 1.1.0+ (latest stable recommended).

### Install Bun

```bash
# macOS or Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

Confirm your installation:

```bash
bun --version
```

---

## 🏗️ Create Your Project

We recommend using the official **Gravito Scaffold** CLI, which guides you through the base setup.

### 1. Interactive (Recommended)
```bash
bunx gravito create
```
This wizard helps you choose:
- Project name
- Galaxy Role (Host / Standalone Satellite)
- Frontend framework (React / Vue)
- Core Orbits (Auth, Database, Cache)

### 2. Direct Command
```bash
bunx create-gravito-app@latest my-galaxy
```

---

## 📦 Project Initialization

Navigate to your project directory and install dependencies:

```bash
cd my-galaxy
bun install
```

---

## ⚡ Start the Dev Server

Execute the following command to launch the **Xenon Host** and the Vite development server:

```bash
bun dev
```

Then open:
- **Galaxy Host**: [http://localhost:3000](http://localhost:3000)
- **Vite HMR**: Port 5173 (Automatically proxied through the host)

---

## 📜 Common Commands

| Command | Description |
| --- | --- |
| `bun dev` | Start development mode with Xenon Hot-Reloading |
| `bun build` | Compile satellites and bundle frontend assets |
| `bun start` | Start production Galaxy Host |
| `bun gravito` | Access the Gravito Craftsmanship CLI |

---

## ❓ FAQ

### 1. Why Bun over Node.js?
Bun is more than just a runtime; it's an all-in-one engine. It includes native TypeScript transpilation, a fast test runner, and high-performance HTTP APIs that Gravito leverages to achieve O(1) routing speeds.

### 2. What is a "Galaxy Host"?
In v1.6+, every Gravito project starts as a **Galaxy Host**. It uses the **Xenon Runtime** to orchestrate independent domain satellites. This allows your application to grow from a small site to a distributed system without refactoring.

### 3. Docker support?
Yes. Every project includes a standard `Dockerfile` and `docker-compose.yml` for seamless deployment to production environments.

---

## 🔗 Next Steps
You are ready to build. Learn about the [Project Structure](./project-structure.md) or jump into [Core Concepts](../architecture/core-concepts.md).
