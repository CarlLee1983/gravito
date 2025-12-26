---
title: Scaffold Generator
description: Project generators for MVC, DDD, and clean architecture.
---

# Scaffold Generator

Scaffold provides project generators for Gravito, including MVC, DDD, and clean architecture presets.

## Installation

```bash
bun add @gravito/scaffold
```

## CLI Usage

```bash
npx gravito init my-app --architecture ddd
```

## Architecture Presets

| Type | Description |
| --- | --- |
| `enterprise-mvc` | MVC structure inspired by Laravel |
| `clean` | Clean Architecture with strict boundaries |
| `ddd` | Domain-Driven Design with bounded contexts |

## Programmatic API

```ts
import { Scaffold } from '@gravito/scaffold'

const scaffold = new Scaffold({
  name: 'my-app',
  architecture: 'ddd',
  targetPath: './my-app',
  packageManager: 'bun',
})

await scaffold.generate()
```

## Next Steps

- Learn the CLI workflow in [Project Scaffolding](./cli-init.md)
