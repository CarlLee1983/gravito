# create-gravito-app

## 1.1.2

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/pulse@3.2.1

## 1.1.1

### Patch Changes

- Fix @gravito/pulse dependency - convert from workspace:\* to version number

  - Changed @gravito/pulse from workspace:\* to ^3.2.0
  - This allows create-gravito-app to work properly when installed from npm via bunx

## 1.1.0

### Minor Changes

- Add convenient development commands and prepare for npm publishing

  - Add `bun run dev` command for local development
  - Add root-level `bun run create` command for convenient project scaffolding
  - Support all CLI options: `--profile`, `--template`, `--with`, `--framework`, etc.
  - Users can now scaffold projects via: `bun run create [app-name] --profile [core|scale|enterprise]`

## 1.0.5

### Patch Changes

- @gravito/pulse@3.0.1

## 1.0.4

### Patch Changes

- @gravito/pulse@3.0.0

## 1.0.3

### Patch Changes

- Updated dependencies
  - @gravito/pulse@2.1.0

## 1.0.2

### Patch Changes

- @gravito/pulse@2.0.0

## 1.0.1

### Patch Changes

- @gravito/pulse@1.0.1

## 1.0.0

### Patch Changes

- @gravito/pulse@1.0.0
