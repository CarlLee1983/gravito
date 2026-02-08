# 命令參考

> **用途**：唯一的 CLI 命令真相來源
> **何時查閱**：需要執行建構、測試、發佈或工具腳本時
> **返回**：[CLAUDE.md](../../CLAUDE.md)

---

## 建構

```bash
# 全量構建所有包
bun run build

# 個別包構建
cd packages/<package-name>
bun run build

# 增量構建（Turbo 快取）
bun run build  # Turbo 會自動追蹤依賴，只構建變更的包
```

## 類型檢查

```bash
# 快速類型檢查（使用 Turbo 快取）
bun run typecheck

# 完整類型檢查（清除快取，強制執行）
bun run typecheck:full

# 檢查特定包
cd packages/<name>
bun run typecheck
```

## 測試

```bash
# 執行所有包的測試
bun run test

# 含覆蓋率報告
bun run test:coverage

# CI 模式（嚴格檢查）
bun run test:ci

# 單一包的測試
cd packages/<package-name>
bun test

# 執行特定測試檔案
bun test tests/application.test.ts

# 含覆蓋率和閾值
bun test --coverage --coverage-threshold=75

# 查看詳細輸出
bun test --verbose
```

## 程式碼品質

```bash
# Lint 檢查（報告錯誤）
bun run lint

# 完整檢查（格式化 + Lint + 無自動修復）
bun run check

# 自動修復所有格式和 lint 問題
bun run check:fix

# 格式化代碼（Biome）
bun run format
```

## 版本管理與發佈

```bash
# 檢查版本一致性
bun run version:check

# 驗證文檔
bun run docs:validate

# 創建或編輯 changeset（記錄此次修改）
bun run changeset

# CI 模式版本更新（自動版本號）
bun run ci:version

# 發佈所有包到 npm（CI 模式）
bun run ci:publish

# Beta 版發佈
bun run pub:beta

# Snapshot 版發佈（開發快照）
bun run pub:snapshot
```

## 工具腳本

```bash
# 驗證受影響的包（避免循環依賴）
bun run scripts/validate-affected-packages.ts

# 檢查版本一致性
bun run scripts/check-versions.ts

# 生成依賴圖
bun run scripts/generate-dependency-graph.ts

# 驗證文檔
bun run scripts/validate-docs.ts

# 檢查 TypeScript 配置
bun run scripts/check-typecheck-config.ts

# 查看受影響的包（CI 用）
bun run ci:affected

# 受影響包的 lint 路徑
bun run ci:affected:lint

# CI 測試優化
bun run ci:test:optimize

# 啟動 Launchpad（開發伺服器）
bun run launchpad:up

# Docker Compose 啟動
bun run launchpad:compose
```

## CI 模擬（本地）

```bash
# 直接執行 CI 測試（本地模擬）
bun run ci:test

# 使用 act 工具（需要 Docker）
bun run ci:test:act
```

---

## 常用命令組合

### 日常開發循環

```bash
# 修改代碼後的本地驗證
bun run typecheck && bun run check && bun test

# 推送前的完整檢查（pre-push hook 會自動執行）
bun run scripts/validate-affected-packages.ts
```

### 新開發者初始化

```bash
# 1. 安裝依賴
bun install

# 2. 全量構建
bun run build

# 3. 執行測試確保環境正常
bun run test
```

### 發佈工作流

```bash
# 1. 修改代碼
# ... 編輯 packages/<name>/src ...

# 2. 添加 changeset
bun run changeset

# 3. 提交 PR
git add . && git commit -m "feat: [module] description"
git push

# 4. 合併後，CI 自動執行發佈
# （無需手動執行 bun run ci:publish）
```

---

## 命令失敗排除

> 如果命令執行失敗，請參考 [troubleshooting.md](./troubleshooting.md)

---

## 相關文件

- [返回 CLAUDE.md](../../CLAUDE.md)
- [完整開發流程](./development.md)
- [故障排除指南](./troubleshooting.md)
- [工具配置詳情](./config.md)
