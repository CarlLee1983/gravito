# Gravito Blog MVC Example

This project serves as a comprehensive reference implementation for building full-stack applications using the **Gravito Framework**. It demonstrates a modern **Monolithic MVC** architecture, tightly integrating a robust Node.js backend with a reactive Vue 3 frontend via Inertia.js.

## 🏗️ Architecture

This application eschews the traditional API-centric approach in favor of a monolithic architecture that combines the developer experience of a Single Page Application (SPA) with the simplicity of a classic server-side framework (like Laravel or Rails).

*   **Backend Driven Routing**: Routes are defined in the backend (`src/routes`), controlling data flow and access.
*   **Modern Monolith**: The frontend and backend live in the same codebase and run on the same server logic, eliminating the need for client-side routing synchronization or API state management.
*   **Reactive Views**: Instead of server-side ephemeral HTML (Blade, EJS), we serve fully reactive **Vue 3** components hydrated with server data.

## 🛠️ Technology Stack

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Runtime** | [Bun](https://bun.sh) | High-performance JavaScript/TypeScript runtime and bundler. |
| **Framework** | **@gravito/core** | The application container, handling DI, Middleware, and Lifecycle. |
| **Frontend** | [Vue 3](https://vuejs.org/) | Progressive JavaScript framework using Composition API and `<script setup>`. |
| **Integration** | [Inertia.js](https://inertiajs.com/) | The glue connecting Gravito to Vue, enabling SPA experiences without APIs. |
| **Database** | **@gravito/atlas** | Active Record ORM and Query Builder (currently using **SQLite**). |
| **Authentication** | **@gravito/sentinel** | Complete authentication system supporting Guards, Providers, and Drivers. |
| **State/Session** | **@gravito/pulsar** | Server-side session and state management (Memory driver). |
| **Caching** | **@gravito/stasis** | Flexible caching layer. |
| **Build Tool** | [Vite 6](https://vitejs.dev/) | Next-generation frontend tooling, handling HMR and asset bundling. |
| **Styling** | [TailwindCSS](https://tailwindcss.com/) | Utility-first CSS framework for rapid UI development. |
| **Icons** | Lucide Vue | Modern and consistent icon set. |

## ✨ Key Features

This example implements a real-world set of features to validate the framework's capabilities:

*   **Authentication & Authorization**: Full login/logout flow using `Sentinel` guards.
*   **CRUD Interactions**: Complete Create, Read, Update, Delete operations for Blog Posts.
*   **Active Record ORM**: Database modeling using `Atlas` (e.g., `Post.find(1)`, `user.posts()`).
*   **Dark/Light Mode**: Integrated theme switching with persisted state and smooth transitions.
*   **Asset Management**: Efficient asset serving and bundling via Vite.

## 🚀 Getting Started

### Prerequisites

*   [Bun](https://bun.sh) (v1.0 or higher)

### Installation

1.  Navigate to the project directory:
    ```bash
    cd examples/blog-mvc
    ```

2.  Install dependencies (if not already installed in the workspace):
    ```bash
    bun install
    ```

### Running Development Server

To start both the backend server and the Vite frontend dev server in parallel:

```bash
bun run dev
```

*   **Backend Server**: Runs on `http://localhost:3001`
*   **Frontend (Vite)**: Proxies requests, access via `http://localhost:5174`

### Building for Production

To compile the frontend assets for production deployment:

```bash
bun run build
```

The server can then be started in production mode:

```bash
bun start
```

## 📂 Project Structure

```
examples/blog-mvc/
├── src/
│   ├── client/           # Frontend Application (Vue 3)
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components (Inertia views)
│   │   ├── styles/       # Global CSS (Tailwind)
│   │   └── app.ts        # Client entry point
│   ├── controllers/      # Request handlers (return Inertia.render)
│   ├── models/           # Database Models (extends Atlas Model)
│   ├── database/         # Database initialization and schema
│   ├── middleware/       # Gravito Middleware (Inertia handling)
│   ├── routes/           # Route definitions
│   ├── bootstrap.ts      # Application configuration and boot logic
│   └── index.ts          # Server entry point
├── static/               # Compiled assets
├── package.json          # Dependency definitions
├── vite.config.ts        # Vite configuration
└── tsconfig.json         # TypeScript configuration
```
