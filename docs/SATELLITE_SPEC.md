# 🛰️ Gravito Satellite Specification (GASS) v1.0

這份文件定義了 Gravito 生態系中衛星模組（Satellite）的開發標準，旨在確保模組的高內聚、低耦合以及卓越的開發者體驗（DX）。

## 1. 核心哲學
- **DDD 驅動**: 邏輯應位於 Domain 層，而非框架層。
- **配置化優先**: 所有的品牌標誌、顏色與外部連結都應是可配置的。
- **Hooks 通訊**: 插件之間透過 Hook 而非直接引用來協作。

## 2. 標準目錄結構
```text
src/
├── Domain/           # 業務邏輯、實體 (Entities)、介面定義
├── Application/      # UseCases (業務流程)、DTOs (數據交換)
├── Infrastructure/   # 持久化實現 (Repositories)、外部驅動
└── Interface/        # HTTP 中間件、控制器、CLI 指令
```

## 3. 命名與註冊規範
- **類名**: 必須以 `ServiceProvider` 結尾（如 `MembershipServiceProvider`）。
- **容器鍵名**: 建議使用 `插件名.功能` 格式（如 `membership.register`）。
- **Hook 命名**: `插件名:動作`（如 `membership:registered`）。

## 4. 品牌抽象化標準
所有的郵件或 UI 內容應遵循以下獲取模式：
```typescript
const brandingName = core.config.get('membership.branding.name', 'Default App');
```

## 5. 隊列配套標準
所有對外發出的副作用（Side Effects）動作應預設支援排程：
```typescript
// 優雅降級模式
async queue(job) {
  const queue = container.make('queue');
  if (queue) return queue.push(job);
  return this.send(job); // 同步回退
}
```

## 6. 驗證清單 (CI Checklist)
- [ ] 是否在 `satellites/` 目錄下？
- [ ] 是否導出了 `ServiceProvider`？
- [ ] 所有的 `require()` 是否已替換為 `import`？
- [ ] 是否包含 `README.md` 與 `docs/EXTENDING.md`？
- [ ] 是否通過了 `grand-review.ts` 整合測試？

## 7. 環境相容性與工具鏈避雷指南 (Pitfalls)

為了確保模組在 CI/CD 環境與各種執行環境（Bun/Node）下的穩定性，請務必遵循以下規範：

### A. TypeScript 指令衝突
- **陷阱**: 在本地開發時，若依賴包未建置，可能需要 `@ts-expect-error`；但 CI 環境中依賴包已就緒，會觸發「Unused Directive」錯誤。
- **規範**: 
  - 盡量避免使用指令。
  - 若必須使用，請優先選用 `@ts-ignore` 並配合 `// biome-ignore` 防止 Linter 自動將其修復回 `@ts-expect-error`。
  - 範例：
    ```typescript
    // biome-ignore lint/suspicious/noTsIgnore: 說明原因
    // @ts-ignore
    import { something } from '...'
    ```

### B. ESM 與路徑解析
- **陷阱**: `__dirname` 與 `require()` 在純 ESM 模式下會報錯或失效。
- **規範**: 
  - 衛星模組必須全面使用頂層 `import`。
  - 路徑解析請統一使用 `import.meta.dir` 與 `node:path` 模組。
  - 禁止在 `.ts` 檔案中使用 `require()`，這會導致某些打包工具（如 tsup）在處理 CJS/ESM 混用時發生崩潰。

### C. 依賴規範 (Monorepo)
- **規範**: 所有的 `@gravito/*` 或 `@gravito/core` 依賴必須標註為 `workspace:*`。
- **優點**: 確保測試與建置時始終連結到專案內最新的原始碼，而非 NPM 上的舊版本。

### D. 類型與值 (Imports)
- **陷阱**: 僅以 `import type` 導入類別（如 Mapper），但在代碼中將其作為實體調用，會導致 `ReferenceError`。
- **規範**: 若需要調用靜態方法或實例化，請確保使用標準 `import`。

### E. 資料庫 Schema 一致性
- **陷阱**: 手動寫測試 Schema 時漏掉欄位（如 `email_verified_at`）。
- **規範**: 測試中的 `Schema.create` 應與 `Domain/Entities` 的屬性完全對齊，建議定期執行 `grand-review.ts` 進行全量欄位檢查。

---
*Created by Gravito Core Team.*
