# Gravito E-Commerce MVC Example

A high-performance e-commerce MVC demonstration built on the **Gravito Framework**. This project showcases the integration of **OrbitAtlas (ORM)**, **OrbitIon (Inertia.js)**, **OrbitSentinel (Auth)**, and **OrbitPrism (Vite/Views)** to build a modern web application.

[繁體中文版本 (Traditional Chinese Version)](./README.zh-TW.md)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Start Development Server
```bash
bun run dev
```
The server will be running at: `http://localhost:3070`

## 🔐 Testing Credentials

The following accounts are pre-seeded for development and testing:

### Administrator
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Access**: Full access to `/admin` dashboard to manage products, categories, and orders.

### Customer
- **Email**: `user@example.com`
- **Password**: `password123`
- **Access**: Standard shopping flow and personal order history.

## 🛠️ Technology Stack
- **Backend**: [Gravito Core](https://github.com/gravito-framework/gravito) (Bun Runtime)
- **ORM**: OrbitAtlas (SQLite)
- **Frontend**: Vue 3 + Inertia.js (OrbitIon)
- **Styling**: Vanilla CSS + UnoCSS (Tailwind compatible)
- **Build Tool**: Vite

## 📂 Project Structure
- `src/Http/Controllers`: Centralized business logic.
- `src/Models`: Data models and Atlas ORM definitions.
- `src/client/pages`: Vue page components (Inertia).
- `config/`: Orbit registrations and security settings.
- `database/`: Migrations and seed data.

## 📸 Image Handling
This project integrates high-quality **Unsplash** images and utilizes a custom `GImage` component to implement **Lazy Loading** and **Skeleton** loading effects for a premium user experience.

---
Part of the Gravito Framework Galaxy.
