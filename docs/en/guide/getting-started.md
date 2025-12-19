---
title: Getting Started
description: Start your journey with Gravito in less than 5 minutes.
---

# 🚀 Getting Started

Welcome to Gravito! This guide will help you set up your development environment and create your first high-performance fullstack application.

## 🛠 Prerequisites

Gravito is built for the modern age. You only need one thing:
- **[Bun](https://bun.sh/) 1.1.0 or higher**: The incredibly fast JavaScript runtime.

To check your version, run:
```bash
bun --version
```

## 📦 Create Your Project

The fastest way to start is using our official CLI. Run the following command in your terminal:

```bash
# Initialize a new Gravito project
bunx create-gravito-app@latest my-gravito-app
```

Then, navigate into your new folder:
```bash
cd my-gravito-app
bun install
```

## ⚡️ Launch Development Server

Start the development engine with a single command:

```bash
bun dev
```

Your app is now running at **[http://localhost:3000](http://localhost:3000)**! 🚀

### What just happened?
Gravito started two synchronized engines:
1. **Hono Backend**: Handling your routes, controllers, and logic.
2. **Vite Frontend**: Powering the React/Inertia interface with blazing-fast Hot Module Replacement (HMR).

## 🎨 Make Your First Change

Gravito is **Engine Agnostic**. You can choose your preferred way to build the UI. open `src/controllers/HomeController.ts` and try these three paths:

### Option A: The Modern SPA (Inertia + React)
This is the default for our official site. It delivers a fluid Single Page Application experience.

```typescript
// src/controllers/HomeController.ts
export class HomeController {
  index(c: Context) {
    const inertia = c.get('inertia')
    return inertia.render('Home', { greeting: 'Hello from React!' })
  }
}
```

### Option B: The Classic MPA (Orbit-View)
Prefer Laravel-style server-side templates? Use Handlebars/Mustache style templates for maximum SEO and simplicity.

```typescript
// src/controllers/HomeController.ts
export class HomeController {
  index(c: Context) {
    const view = c.get('view')
    return view.render('welcome', { greeting: 'Hello from Templates!' })
  }
}
```

### Option C: The Minimalist (Pure HTML)
Need zero overhead? Return HTML directly from your controller.

```typescript
// src/controllers/HomeController.ts
export class HomeController {
  index(c: Context) {
    return c.html('<h1>Hello from Pure HTML!</h1>')
  }
}
```

### 🖖 What about Vue?
Yes! Gravito supports **Inertia-Vue** seamlessly. Simply swap the `@gravito/orbit-inertia` adapter settings to target Vue components instead of React.

## 🗺 What's Next?

You've just taken your first step into a larger world. Here is where to go next:

- **[Core Concepts](/docs/guide/core-concepts)**: Understand the "Planet & Orbit" philosophy.
- **[Routing System](/docs/guide/routing)**: Learn how to build clean, MVC-style routes.
- **[Fullstack with Inertia](/docs/guide/inertia-react)**: Master the art of the modern monolith.

---

> **Tip**: Gravito is highly modular. You only load what you need. Check out our **Orbits** system to master features like SEO, I18n, and Fullstack integration!
