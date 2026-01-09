---
title: Better Than Laravel: Five DX Pillars
description: Five developer-experience pillars where Gravito can outpace Laravel by leaning into Bun.
---

# Better Than Laravel: Five DX Pillars

This page captures five developer-experience pillars where Gravito can go beyond Laravel by leaning into Bun's strengths.

## 1. Ultra-Fast Dev Loop (Maximize Bun)

- `bun dev`: boot server + watch + typecheck (can be separated)
- Instant reloads for `routes` / `configs` / `views` / `i18n` / `env` changes without restarts
- Cold-start KPIs: first boot < 1.5s; subsequent boot < 0.5s (define your own)

## 2. Built-in Doctor and Auto Fixes (Missing in Laravel)

- Add `gravito doctor`
- Checks: env, port, database connection, migration status, Redis, permissions, Node/Bun versions
- Every issue includes: root cause, impact, and a one-click or interactive fix

## 3. Composable Presets, But Defaults Are Right

Not a grab bag of packages. Provide fully vetted presets:

- `minimal` (API / edge / micro)
- `app` (full web app)
- `realtime` (with ripple / echo)
- `worker` (queue-first)

Each preset is a Golden Path template; read [Presets](./presets.md) to see what folders, routes, and tests ship with every option.

## 4. Examples Are a Golden Path, Not a Demo

Generated apps ship with a real, end-to-end slice:

- `routes/`, `app/`, `database/`
- A complete feature slice (Auth + Profile + Settings)
- Tests for every route (at least 2: auth, CRUD)

## 5. Unified Config Contract End-to-End

To beat Laravel, consistency wins:

- Naming for `config key`, `env key`, error codes, logger fields
- Any orbit must follow the contract to enter official presets

Read [Config Contract](./config-contract.md) for the naming conventions and enforcement hooks that keep every preset aligned.
