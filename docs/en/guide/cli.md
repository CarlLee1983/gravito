# CLI Reference

The Gravito CLI (`gravito`) is your primary tool for developing, managing, and deploying Gravito applications.

## Global Options

| Option | Description |
| :--- | :--- |
| `--help`, `-h` | Display help for the given command. |
| `--version`, `-v` | Display the current CLI version. |

## Project Creation

### `create`
Initialize a new project.

```bash
gravito create <project-name> [options]
```

**Options:**
- `--template <name>`: Choose a template (`basic`, `inertia-react`, `static-site`).
- `--profile <name>`: Choose an architecture profile (`core`, `scale`, `enterprise`).
- `--with <features>`: Add specific features (comma-separated, e.g., `redis,queue`).
- `--recommend`: Auto-detect cloud environment and suggest a profile.

**Example:**
```bash
gravito create my-app --profile scale --with redis
```

---

## Development

### `dev`
Start the development server with built-in health checks.

```bash
gravito dev
```

This command runs `gravito doctor` before starting the Vite dev server to ensure your environment is healthy.

### `doctor`
Diagnose configuration and environment issues.

```bash
gravito doctor
```

Checks:
- `gravito.lock.json` integrity.
- Presence of required config files for the active profile.
- Mismatched dependencies.

---

## Maintenance & Upgrades

### `upgrade`
Upgrade your project to a more advanced profile.

```bash
gravito upgrade --to <profile>
```

**Options:**
- `--to <profile>`: The target profile (`scale`, `enterprise`).

**Behavior:**
- Updates `gravito.lock.json`.
- Generates a `MIGRATION.md` file with a step-by-step checklist to manually update your config files and dependencies.

### `add`
Add a feature pack to an existing project.

```bash
gravito add <feature>
```

**Arguments:**
- `<feature>`: The feature to add (e.g., `redis`, `otel`, `queue`).

---

## Code Generation (Make)

Scaffold new application components.

```bash
gravito make:controller <Name>
gravito make:model <Name> [--migration] [--controller]
gravito make:middleware <Name>
gravito make:request <Name>
gravito make:seeder <Name>
```

## Database

Manage your database schema and data.

```bash
gravito migrate
gravito migrate:status
gravito db:seed
gravito db:deploy
```
