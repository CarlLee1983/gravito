---
title: Create Gravito App
description: Use official templates to bootstrap a Gravito project.
---

# Create Gravito App

`create-gravito-app` is a thin wrapper around the Gravito CLI for fast project creation.

## Highlights

- One-command project creation
- Recommended templates and defaults
- Continues into CLI initialization flow

## Usage

```bash
bunx create-gravito-app@latest my-app
```

## Common Options

```bash
bunx create-gravito-app@latest my-app -- --template clean
```

Common flags (forwarded to Gravito CLI):

```bash
# Architecture templates
--template clean
--template ddd
--template enterprise-mvc

# Package manager
--package-manager bun
--package-manager pnpm

# Skip steps
--skip-install
--skip-git
```

Template notes:

- `clean`: strict layered Clean Architecture.
- `ddd`: domain-driven design with bounded contexts.
- `enterprise-mvc`: Laravel-style MVC for fast delivery.

> Tip: `create-gravito-app` forwards args to `gravito init`. Run `gravito init --help` for the latest list.
> `--package-manager` only controls the install tool. It does not lock the runtime.
> If your team uses Bun everywhere, keep Bun for full consistency.

## What it does

- Triggers the Gravito CLI `create` flow
- Generates a recommended project structure

## Output Example

```
my-app/
  src/
  tests/
  package.json
  README.md
```

## Next Steps

- Learn templates and architecture: [Project Init](./cli-init.md)
