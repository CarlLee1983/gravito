# Profiles & Architecture

Gravito adopts a **Profile-based Architecture**, allowing you to start simple and scale indefinitely without rewriting your infrastructure.

Unlike traditional boilerplate Generators that give you a static starting point, Gravito Profiles are designed to be overlay-based and upgradeable.

## 🌟 Available Profiles

### 1. Core Profile (Default)
**Best for:** MVP, Prototypes, Hobby Projects, Serverless.

The Core profile is designed for maximum development velocity. It requires **zero infrastructure** to start.

- **Database**: SQLite (local file)
- **Cache**: Memory
- **Queue**: Sync (in-process)
- **Session**: Cookie / File
- **Infrastructure**: None required.

```bash
gravito create my-app --profile core
```

### 2. Scale Profile
**Best for:** Production Apps, High Traffic, Team Projects.

The Scale profile introduces industry-standard infrastructure for reliability and concurrency.

- **Database**: PostgreSQL
- **Cache**: Redis
- **Queue**: Redis
- **Session**: Redis
- **Infrastructure**: Docker Compose (Postgres, Redis)

```bash
gravito create my-app --profile scale
```

### 3. Enterprise Profile
**Best for:** Regulated Industries, Large Teams, Mission Critical Systems.

The Enterprise profile adds layers for observability, security, and governance.

- **Everything in Scale**, plus:
- **Logging**: Structured JSON Logging
- **Security**: CSP Headers, HSTS, Fortify Audit Config
- **Observability**: OpenTelemetry Hooks
- **Governance**: Policy Lock enabled

```bash
gravito create my-app --profile enterprise
```

## 📦 Feature Packs

You can mix and match profiles with **Feature Packs**.

| Feature | Description |
| :--- | :--- |
| `redis` | Adds `ioredis` and configures Cache/Queue to use Redis. |
| `otel` | Adds OpenTelemetry SDK and Jaeger for tracing. |
| `queue` | Adds dedicated worker configuration. |

**Example:** Start with Core but add Redis for background jobs:
```bash
gravito create my-app --profile core --with redis
```

## ☁️ Cloud Detection

Gravito CLI can automatically detect your deployment environment and suggest the best profile.

```bash
gravito create --recommend
```

If you are running on **AWS Lambda**, it might suggest `Scale` (stateless).
If you are running on **Kubernetes**, it might suggest `Enterprise`.

## 🛠 Management Tools

### Health Check (Doctor)
Run `gravito doctor` to verify that your project's configuration matches its profile and lock file.

```bash
gravito doctor
```

### Upgrading Profiles
Ready to go from MVP to Production? Use the upgrade command to generate a migration checklist.

```bash
gravito upgrade --to scale
```

### Adding Features
Need to add a feature later?

```bash
gravito add redis
```
