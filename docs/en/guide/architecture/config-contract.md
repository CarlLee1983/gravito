---
title: Config Contract
description: Naming rules for config keys, env keys, error codes, and logger fields that keep every Gravito orbit consistent.
---

# Config Contract

To “win Laravel” we rely on **consistency**. Gravito’s Config Contract defines the vocabulary for configuration keys, environment variables, error codes, and logger fields so every orbit and preset shares the same expectations.

## Config & Environment Key Naming

| Layer | Naming rule | Example |
|-------|-------------|---------|
| Core config | Uppercase, underscore, optional `GRAVITO_` prefix | `PORT`, `APP_NAME`, `GRAVITO_DEBUG` |
| Orbit config | Prefix with orbit name in uppercase | `ATLAS_MAX_POOL`, `RIPPLE_BROKER_URL`, `SPECTRUM_ENABLED` |
| Environment keys | Mirror config key names with same casing | `DATABASE_URL`, `REDIS_URL`, `MAIL_DRIVER` |

Consistency allows `gravito doctor` to look up keys predictably (e.g., `DATABASE_URL`), and keeps `gravito.config.ts` files readable across teams.

## Error Codes

Error codes follow the pattern `GRAVITO-<MODULE>-####`. The module segment matches the orbit or feature (e.g., `CORE`, `AUTH`, `STREAM`), and the numeric suffix is a 4-digit sequence.

| Module | Purpose | Sample codes |
|--------|---------|--------------|
| CORE | PlanetCore lifecycle | `GRAVITO-CORE-1001` (bootstrap failure) |
| AUTH | Sentinel/Fortify | `GRAVITO-AUTH-2002` (invalid credentials) |
| STREAM | Background jobs | `GRAVITO-STREAM-3003` (job retry limit) |
| RIPLE | Realtime ripple | `GRAVITO-RIPPLE-4004` (broadcast channel missing) |

Error handling helpers should translate these codes into HTTP responses and log entries, giving teams consistent tracing across presets.

## Logger Fields

All log statements should include:

- `timestamp` (ISO format)  
- `level` (`info`, `warn`, `error`)  
- `orbit` (e.g., `core`, `atlas`, `ripple`)  
- `event` (short, kebab-case description)  
- `traceId` / `requestId` when available  
- `userId` when acting on behalf of a user  
- `message` (human-friendly text)  

Example log:

```json
{
  "timestamp": "2025-12-28T08:42:13.123Z",
  "level": "error",
  "orbit": "core",
  "event": "core.liftoff.failed",
  "traceId": "de305d54-75b4-431b-adb2-eb6b9e546014",
  "userId": null,
  "code": "GRAVITO-CORE-1001",
  "message": "Failed to bind port 3000"
}
```

## Orbit Compliance

Every orbit that joins an official preset must declare how it satisfies the contract. This typically means:

1. Exposing a `configContract` descriptor that lists the expected config/env keys and default values.  
2. Documenting which error codes it emits (aligned with the `GRAVITO-<MODULE>-####` pattern).  
3. Logging through Gravito’s logger helpers so the shared fields appear everywhere.

If an orbit violates the contract, `gravito doctor` will flag it (missing env keys, unknown error codes, or logger entries lacking required fields), and the orbit cannot ship inside an official preset until it aligns.

Linking back: the [Presets guide](./presets.md) shows how each preset wires config keys, and the [Golden Path guide](./golden-path.md) explains how feature slices and tests verify the contract in action.
