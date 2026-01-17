# 測試策略與回歸清單

## 測試策略

### 1. 單元測試
```bash
bun test                          # 執行所有測試
bun test --coverage               # 覆蓋率報告
bun test --coverage-threshold=80  # 強制最低覆蓋率
```

### 2. 性能測試
```bash
bun test tests/performance/       # 執行基準測試
```

### 3. 整合測試
```bash
cd examples/zenith-site
bun install
bun test
```

### 4. 類型檢查
```bash
bun run typecheck                 # TypeScript 驗證
```

### 5. 回歸測試

在每個 Phase 前：
```bash
# Baseline performance
bun test tests/performance/ > baseline.txt

# After implementation
bun test tests/performance/ > optimized.txt

# Compare
diff baseline.txt optimized.txt
```

---

## 回歸測試清單

詳見 [回歸測試清單](./regression-checklist.md)
