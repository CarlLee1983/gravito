# Event Registration System

> 🎯 A full-featured event registration example built with Gravito Framework

## Features

- 📋 **Event & Session Management** - Create events with multiple sessions
- 📝 **Dynamic Registration Forms** - Custom fields (text, select, checkbox, etc.)
- 🔐 **Authentication** - User login/register with OrbitSentinel
- 📧 **Email Notifications** - Confirmation emails with @gravito/signal
- 📱 **QR Code Check-in** - Generate & scan QR codes for attendance
- 👤 **User Dashboard** - View registration history
- 🛠️ **Admin Panel** - Full CRUD for events, sessions, fields, and users

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Server runs at http://localhost:3000
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Gravito Framework (Bun) |
| ORM | @gravito/atlas |
| Auth | @gravito/sentinel |
| Email | @gravito/signal |
| Frontend | Vue 3 + Inertia.js |
| Styling | UnoCSS |

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | password |
| User | user@example.com | password |

## Documentation

- [PLANNING.md](./PLANNING.md) - Complete system design and data models
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture overview

---

**Part of the [Gravito Framework](https://github.com/gravito-framework) examples collection.**
