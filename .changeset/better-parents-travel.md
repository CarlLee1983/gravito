---
"@gravito/scaffold": patch
---

Allow developers to choose database driver for core profile

The core profile previously defaulted to SQLite, forcing all users to install better-sqlite3 even if they wanted to use PostgreSQL or MySQL.

Changes:
- Core profile database driver changed from 'sqlite' to 'none'
- Developers can now choose their preferred database after project creation:
  - SQLite: bun add better-sqlite3
  - PostgreSQL: bun add pg
  - MySQL: bun add mysql2
- DependencyValidator updated to recognize 'none' driver (no dependencies required)
- ConfigGenerator now intelligently selects database config based on driver type
- All generators updated to respect profile configuration

This improves the onboarding experience by reducing unnecessary dependencies and giving developers flexibility to choose their database at setup time.
