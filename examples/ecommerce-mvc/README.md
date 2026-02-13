# Gravito E-Commerce MVC Example

**Version 1.2.0** - Production-Ready E-Commerce with Advanced Performance Optimization

A high-performance, production-grade e-commerce MVC demonstration built on the **Gravito Framework**. This project showcases the integration of **OrbitAtlas (ORM)**, **OrbitIon (Inertia.js)**, **OrbitSentinel (Auth)**, **OrbitPulsar (Sessions)**, and **OrbitPrism (Vite/Views)** to build a modern, scalable web application with **advanced N+1 query optimization techniques**.

> **🎯 Learn From This**: This example serves as a complete **learning resource** for building production-ready e-commerce systems with clean architecture patterns, comprehensive testing (81 tests), and performance optimization at scale.

[繁體中文版本 (Traditional Chinese Version)](./README.zh-TW.md)

## ✨ What's New in v1.2.0

### 🚀 Performance Optimizations (Four-Phase N+1 Query Elimination)

This version includes a complete **N+1 query optimization framework** reducing database load by **60%+**:

- **Phase 1**: Eliminate redundant fetches (double/triple queries)
- **Phase 2**: Declarative relationships with ORM
- **Phase 3**: Batch product loading
- **Phase 4**: Request-level product caching

📊 **Real Results**: From ~10-15 queries → ~4-6 queries in complex workflows

[**→ See PERFORMANCE.md for detailed optimization breakdown**](./PERFORMANCE.md)

### 🧪 Comprehensive Testing

- **45 Unit Tests** - Services, Repositories, Presenters
- **29 Integration Tests** - Complete user workflows (Cart, Order, Events)
- **7 Cache Tests** - Request-level caching validation
- **100% Test Coverage** for new features

## 🚀 Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Start Development Server
```bash
bun run dev
```
Server running at: `http://localhost:3070`

### 3. Run Tests
```bash
# All tests
bun test

# Watch mode
bun test --watch

# Specific test file
bun test tests/Integration/CartFlow.integration.test.ts
```

## 📦 Database Setup

### Using SQLite (Default - Development)
```bash
# SQLite in-memory (no setup required)
# Data persists during session, resets on restart
bun run dev
```

### Using PostgreSQL (Docker - Production-like)
```bash
# Start database
docker-compose up -d

# Create .env
cp .env.example .env

# Update .env
DB_CONNECTION=postgres
DB_PASSWORD=password

# Restart server
bun run dev
```

### Database Cleanup
```bash
docker-compose down -v
```

## ✨ Key Features

### 🛒 E-Commerce Features
- **Complete Shopping Flow**: Browse, search, add to cart, checkout
- **Cart Management**: Add/update/remove items, cart persistence
- **Order Processing**: Order creation, payment tracking, order history
- **Admin Dashboard**: Product and order management
- **Support Center**: FAQ, policies, contact pages

### 🔐 Security & Authentication
- User registration and login (OrbitSentinel)
- Secure session handling (OrbitPulsar)
- Password hashing and validation
- Admin role-based access control

### 📊 Architecture & Performance
- **Service Layer**: Clean business logic separation
- **Repository Pattern**: Data access abstraction
- **Presenter/DTO Pattern**: Type-safe API responses
- **Domain Events**: Order/cart state changes
- **N+1 Query Optimization**: 4-phase optimization framework
- **Request-level Caching**: Automatic product cache deduplication

### 🎨 UI/UX
- Responsive design with dark mode
- Skeleton loading for images
- Real-time cart updates
- Micro-animations
- Lazy-loaded images from Unsplash

## 🔐 Testing Credentials

Pre-seeded development accounts:

### Administrator
- **Email**: `admin@example.com`
- **Password**: `admin123`

### Customer
- **Email**: `user@example.com`
- **Password**: `password123`

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Bun | Fast TypeScript runtime |
| **Framework** | Gravito Core | MVC framework with Galaxy Architecture |
| **ORM** | OrbitAtlas | Type-safe database layer |
| **Frontend** | Vue 3 + Inertia.js | Modern reactive UI framework |
| **Database** | SQLite / PostgreSQL | Relational data storage |
| **Session** | OrbitPulsar | Server-side session management |
| **Auth** | OrbitSentinel | Authentication & authorization |
| **Build** | Vite | Fast development build tool |
| **Testing** | Bun Test | Native testing framework |
| **Code Quality** | Biome | Fast formatter & linter |

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, patterns, and component relationships |
| [PERFORMANCE.md](./PERFORMANCE.md) | N+1 query optimization, 4-phase framework, benchmarks |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Development workflow, conventions, contribution guide |
| [API.md](./API.md) | Complete API endpoint reference |

## 📁 Project Structure

```
src/
├── Http/Controllers/          # Request handlers
│   ├── CartController.ts       # Shopping cart operations
│   └── OrderController.ts      # Order management
├── Models/                     # Data models (@column decorators)
│   ├── Cart.ts
│   ├── Order.ts
│   └── Product.ts
├── Repositories/              # Data access layer
│   ├── CartRepository.ts       # Cart data operations
│   └── OrderRepository.ts      # Order data operations
├── Services/                  # Business logic layer
│   ├── CartService.ts         # Cart business logic
│   ├── OrderService.ts        # Order business logic
│   └── RequestProductCache.ts # Request-level caching
├── Presenters/               # DTO transformation
│   ├── CartPresenter.ts
│   └── OrderPresenter.ts
├── Events/                    # Domain events
│   ├── CartItemAdded.ts
│   ├── OrderCreated.ts
│   └── OrderPaid.ts
└── bootstrap.ts              # Application initialization

tests/
├── Unit/                      # Unit test suite (45 tests)
│   ├── Services/
│   ├── Repositories/
│   ├── Presenters/
│   └── Events/
└── Integration/              # Integration test suite (29 tests)
    ├── CartFlow.integration.test.ts
    ├── OrderFlow.integration.test.ts
    └── EventDispatch.integration.test.ts
```

## 🎯 Learning Objectives

This example teaches:

1. **Clean Architecture**: Service → Repository → Model layers
2. **ORM Best Practices**: Model decorators, relationships, migrations
3. **Testing Strategy**: Unit + integration testing at scale
4. **Performance Optimization**: Systematic N+1 query elimination
5. **Event-Driven Architecture**: Domain events and event handlers
6. **API Design**: Presenter/DTO pattern for type-safe responses
7. **Scalability**: Multi-request caching and batch operations

## 📈 Performance Benchmarks

### Query Reduction (Single Request)
```
getCartAsDTO():
  Before optimization: 3 queries
  After Phase 1:       2 queries
  After Phase 3:       2 queries (with product batch)
  After Phase 4:       1 query (with cache hit)

getUserOrders():
  Before optimization: N+1 queries
  After Phase 2:       3 queries
  After Phase 3:       2 queries

Complex workflow (2 carts × 3 products):
  Without cache:  6-8 product queries
  With cache:     1-2 product queries
  Reduction:      75-87%
```

## 🧪 Test Coverage

- **81 Total Tests** (100% pass rate)
  - 45 Unit tests
  - 29 Integration tests
  - 7 Cache tests

## 🚀 Deployment Checklist

- [ ] Update `.env` with production database credentials
- [ ] Set `NODE_ENV=production`
- [ ] Configure PostgreSQL connection
- [ ] Run database migrations: `bun run migrate`
- [ ] Build assets: `bun run build`
- [ ] Enable security headers in `config/security.ts`
- [ ] Set up error logging
- [ ] Configure session storage
- [ ] Run test suite: `bun test`

## 📖 Next Steps

1. **Read** [ARCHITECTURE.md](./ARCHITECTURE.md) for system design overview
2. **Review** [PERFORMANCE.md](./PERFORMANCE.md) for optimization techniques
3. **Follow** [DEVELOPMENT.md](./DEVELOPMENT.md) for contribution guidelines
4. **Reference** [API.md](./API.md) for endpoint documentation

## 🤝 Contributing

See [DEVELOPMENT.md](./DEVELOPMENT.md) for:
- Code style guidelines
- Testing requirements
- Commit message format
- Pull request process

## 📄 License

Part of the **Gravito Framework Galaxy**. See LICENSE file for details.

---

**Version**: 1.2.0
**Last Updated**: 2026-02-12
**Test Status**: ✅ 81/81 passing
**Production Ready**: ✅ Yes
