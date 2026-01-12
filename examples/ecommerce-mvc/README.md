# Gravito E-Commerce MVC Example

**Version 1.1.0**

A high-performance, full-featured e-commerce MVC demonstration built on the **Gravito Framework**. This project showcases the integration of **OrbitAtlas (ORM)**, **OrbitIon (Inertia.js)**, **OrbitSentinel (Auth)**, **OrbitPulsar (Sessions)**, and **OrbitPrism (Vite/Views)** to build a modern, "premium-feel" web application.

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

## ✨ Key Features (v1.1.0)

- **Complete Shopping Experience**: Product browsing, search, cart management, and checkout.
- **Support Center**: Fully implemented FAQ, Shipping Policy, Returns Policy, and Contact pages with interactive UI.
- **Admin Dashboard**: backend management for products, and orders.
- **Secure Authentication**: User registration, login, and secure session handling via OrbitPulsar.
- **Premium UI/UX**: Responsive design with dark mode support, micro-animations, and skeleton loading.

## 🔐 Testing Credentials

The following accounts are pre-seeded for development and testing:

### Administrator
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Access**: Full access to `/admin` dashboard to manage products, categories, and orders.

### Customer
- **Email**: `user@example.com`
- **Password**: `password123`
- **Access**: Standard shopping flow, personal order history, and profile management.

## 🛠️ Technology Stack
- **Backend**: [Gravito Core](https://github.com/gravito-framework/gravito) (Bun Runtime)
- **ORM**: OrbitAtlas (SQLite)
- **Frontend**: Vue 3 + Inertia.js (OrbitIon)
- **Styling**: Vanilla CSS + UnoCSS (Tailwind compatible)
- **Session**: OrbitPulsar
- **Build Tool**: Vite

## 📂 Project Structure
- `src/Http/Controllers`: Centralized business logic (Shop, Cart, Order, Admin, Page Controllers).
- `src/Models`: Data models and Atlas ORM definitions.
- `src/client/pages`: Vue page components (Inertia) including new `Support/` directory.
- `config/`: Orbit registrations and security settings.
- `database/`: Migrations and seed data.

## 📸 Image Handling
This project integrates high-quality **Unsplash** images and utilizes a custom `GImage` component to implement **Lazy Loading** and **Skeleton** loading effects for a premium user experience.

---
Part of the Gravito Framework Galaxy.
