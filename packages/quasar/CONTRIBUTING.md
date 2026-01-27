# Contributing to @gravito/quasar

Thank you for your interest in contributing to Gravito Quasar! This guide will help you get started with development and testing.

## Prerequisites

- [Bun](https://bun.sh/) 1.0+
- [Docker](https://www.docker.com/) (optional, for real Redis testing)

## Development Setup

1. Clone the repository and install dependencies:
   ```bash
   bun install
   ```

2. Build the project:
   ```bash
   bun run build
   ```

## Architecture Overview

Quasar uses a dual monitoring approach:
- **Probes**: Periodically scan Redis/APIs for queue statistics (Waiting, Active, Failed counts).
- **Bridges**: Hook into worker events for real-time job lifecycle tracking and logging.

When adding a new queue system support, you should ideally implement both a `Probe` and a `Bridge`.

## Testing

We use Bun's built-in test runner. Tests are located in `src/__tests__`.

### Running Tests

Run all tests:
```bash
bun test
```

Run tests with coverage:
```bash
bun test --coverage
```

### Mocking Redis

For unit tests, use the `MockRedis` helper located in `src/__tests__/mock-redis.ts`. It provides an in-memory implementation of common Redis commands and supports pipelining and pub/sub.

## Coding Standards

- Use TypeScript 5.x features.
- Follow the existing project structure:
  - `src/probes/`: Queue statistics collectors.
  - `src/bridges/`: Real-time job event trackers.
  - `src/executors/`: Remote command handlers.
- Document public APIs with JSDoc.
- Maintain 80%+ test coverage.

## Pull Request Process

1. Create a new branch for your feature or bugfix.
2. Implement your changes and add tests.
3. Ensure all tests pass and coverage is maintained.
4. Update `CHANGELOG.md` with your changes.
5. Submit a pull request.
