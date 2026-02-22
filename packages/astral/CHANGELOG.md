# @gravito/astral

## 1.0.2

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1
  - @gravito/impulse@1.1.1

## 1.0.1

### Patch Changes

- Updated dependencies [1e7f7d6]
  - @gravito/impulse@1.1.0

## 0.2.0

### Minor Changes

- **完整 OpenAPI 3.1.0 規範支援**

  - ✨ 新增 `servers` 配置支援（多環境設定）
  - ✨ 新增 `securitySchemes` 與全域 `security` 支援
  - ✨ 新增 `tags` 完整定義（含 description 與 externalDocs）
  - ✨ 新增 `externalDocs` 全域文檔連結
  - ✨ 新增 `components` 完整支援（schemas, responses, parameters, examples 等）
  - ✨ 自動轉換 Zod schemas 為 JSON Schema 於 components

- **測試覆蓋提升**
  - 測試數量：29 → 37（+27.6%）
  - 新增 8 個 OpenAPI 規範生成測試
  - OpenApiGenerator.ts 保持 100% 覆蓋率

## 0.1.2

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1
  - @gravito/impulse@1.0.3

## 0.1.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0
  - @gravito/impulse@1.0.2
