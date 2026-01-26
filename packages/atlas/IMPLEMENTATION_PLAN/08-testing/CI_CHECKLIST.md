# CI 檢查清單

**目的：** 確保 CI 功能正常運作，即使測試覆蓋率暫時無法提升，也要避免 CI 出錯。

**最後更新：** 2026-01-17

---

## 📋 CI 配置檢查

### 1. GitHub Actions 工作流程

**文件位置：** `.github/workflows/ci.yml`

#### ✅ 檢查項目

- [x] **測試執行步驟**
  - 位置：Line 82-90
  - 命令：`bunx turbo run typecheck test:coverage`
  - 過濾：`--filter='./packages/*' --filter='./satellites/*'`
  - 並發：`--concurrency=2`

- [x] **Bun 版本設定**
  - 位置：Line 20-22, 50-53, 106-109
  - 版本：`1.3.4`（固定版本，避免版本差異）

- [x] **依賴快取**
  - Bun 快取：`~/.bun/install/cache`
  - Turbo 快取：`.turbo`, `node_modules/.cache/turbo`

- [x] **環境變數**
  - `NODE_OPTIONS: "--max-old-space-size=6144"`（記憶體限制）
  - `SKIP_INSTALL_SIMPLE_GIT_HOOKS: 1`（跳過 git hooks）

---

### 2. Package.json 測試腳本

**文件位置：** `packages/atlas/package.json`

#### ✅ 檢查項目

- [x] **test 腳本**
  ```json
  "test": "bun test"
  ```

- [x] **test:coverage 腳本**
  ```json
  "test:coverage": "bun test --coverage --coverage-threshold=70"
  ```
  - ⚠️ **覆蓋率閾值：70%**
  - 如果覆蓋率低於 70%，CI 會失敗

- [x] **test:ci 腳本**
  ```json
  "test:ci": "bun test --coverage --coverage-threshold=70"
  ```
  - 與 `test:coverage` 相同

---

### 3. Turbo 配置

**文件位置：** `turbo.json`

#### ✅ 檢查項目

- [x] **test:coverage 任務定義**
  ```json
  "test:coverage": {
    "dependsOn": [],
    "inputs": ["src/**", "tests/**", "package.json", "tsconfig.json", "bunfig.toml"],
    "outputs": []
  }
  ```

---

## ⚠️ 重要注意事項

### 1. 測試覆蓋率閾值

**當前設定：** 70%

**影響：**
- 如果測試覆蓋率低於 70%，CI 會失敗
- 當前回歸測試完成率：64%（低於閾值）

**處理方式：**

#### 選項 A：暫時降低閾值（不建議）
```json
"test:coverage": "bun test --coverage --coverage-threshold=60"
```
- ⚠️ 不建議，會降低品質標準

#### 選項 B：調整覆蓋率計算方式（建議）
- 檢查 Bun 的覆蓋率計算是否包含測試文件
- 確認覆蓋率報告是否正確

#### 選項 C：補充測試（最佳）
- 補充缺失的測試項目
- 目標：達到 70% 以上

---

### 2. CI 失敗預防措施

#### 檢查清單（每次 PR 前）

- [ ] **本地執行測試**
  ```bash
  cd packages/atlas
  bun test:coverage
  ```
  - 確認所有測試通過
  - 確認覆蓋率 ≥ 70%

- [ ] **檢查測試數量**
  ```bash
  bun test 2>&1 | grep -E "pass|fail"
  ```
  - 確認沒有測試失敗

- [ ] **檢查類型錯誤**
  ```bash
  bun run typecheck
  ```
  - 確認沒有類型錯誤

- [ ] **模擬 CI 環境**
  ```bash
  # 使用 CI 模擬腳本（如果存在）
  bun run ci:simulate
  ```

---

### 3. 常見 CI 失敗原因

#### 原因 1：測試覆蓋率不足
**症狀：**
```
Error: Coverage threshold not met
```

**解決方案：**
1. 檢查覆蓋率報告
2. 補充缺失的測試
3. 或暫時調整閾值（不建議）

#### 原因 2：測試失敗
**症狀：**
```
1 tests failed
```

**解決方案：**
1. 本地執行測試確認
2. 修復失敗的測試
3. 檢查環境差異

#### 原因 3：類型錯誤
**症狀：**
```
Type error: ...
```

**解決方案：**
1. 執行 `bun run typecheck`
2. 修復類型錯誤
3. 檢查 TypeScript 配置

#### 原因 4：依賴問題
**症狀：**
```
Error: Cannot find module ...
```

**解決方案：**
1. 確認 `bun.lock` 已提交
2. 執行 `bun install --frozen-lockfile`
3. 檢查 peer dependencies

---

## 🔍 CI 驗證步驟

### 本地驗證 CI 配置

```bash
# 1. 進入 atlas 目錄
cd packages/atlas

# 2. 安裝依賴（模擬 CI）
bun install --frozen-lockfile

# 3. 執行類型檢查
bun run typecheck

# 4. 執行測試（含覆蓋率）
bun test:coverage

# 5. 檢查覆蓋率報告
# 覆蓋率應該 ≥ 70%

# 6. 確認所有測試通過
# 應該顯示 "X pass, 0 fail"
```

---

## 📊 覆蓋率監控

### 當前狀態

- **目標覆蓋率：** 70%
- **當前回歸測試完成率：** 64%
- **實際測試覆蓋率：** ✅ **通過 CI 檢查**（執行 `bun test:coverage` 確認）
- **測試狀態：** ✅ 322 pass, 0 fail（2026-01-17 驗證）

### 覆蓋率追蹤

建議在 CI 中添加覆蓋率報告上傳：

```yaml
# .github/workflows/ci.yml (建議添加)
- name: Upload coverage reports
  uses: codecov/codecov-action@v3
  with:
    files: ./packages/atlas/coverage/lcov.info
    flags: atlas
```

---

## 🚨 緊急處理流程

### 如果 CI 持續失敗

1. **檢查 CI 日誌**
   - 查看 GitHub Actions 失敗詳情
   - 確認失敗原因

2. **本地重現問題**
   ```bash
   cd packages/atlas
   bun test:coverage
   ```

3. **臨時解決方案**
   - 如果覆蓋率略低於 70%，可以暫時調整閾值
   - 但必須在後續 PR 中補充測試

4. **長期解決方案**
   - 補充缺失的測試
   - 達到目標覆蓋率

---

## 📝 CI 配置變更記錄

| 日期 | 變更內容 | 原因 |
|------|---------|------|
| 2026-01-17 | 建立 CI 檢查清單 | 確保 CI 功能正常運作 |

---

## 🔗 相關文件

- [測試策略 README](./README.md) - 完整的測試策略與執行指南
- [回歸測試清單](./regression-checklist.md) - 詳細的回歸測試項目與狀態
- [測試執行總結](./TEST_EXECUTION_SUMMARY.md) - 測試執行結果與修復記錄
- [GitHub Actions CI 配置](../../../../.github/workflows/ci.yml) - CI 工作流程定義

---

## ✅ 定期檢查項目

### 每週檢查
- [ ] CI 是否正常執行
- [ ] 測試覆蓋率是否達標（≥ 70%）
- [ ] 是否有持續失敗的測試
- [ ] 檢查 GitHub Actions 狀態

### 每次 PR 前檢查（必須）
- [ ] **本地執行測試**
  ```bash
  cd packages/atlas
  bun test:coverage
  ```
  - 確認：`X pass, 0 fail`
  - 確認：覆蓋率 ≥ 70%（無錯誤訊息）

- [ ] **類型檢查**
  ```bash
  bun run typecheck
  ```
  - 確認：無類型錯誤

- [ ] **檢查測試數量**
  - 當前：322 個測試用例
  - 確認：沒有減少

- [ ] **沒有 console.log 遺留**
  - 檢查生產代碼中是否有 console.log

### 每次 Release 前檢查
- [ ] 所有 CI 檢查通過
- [ ] 測試覆蓋率報告正常
- [ ] 沒有已知的測試問題
- [ ] 回歸測試清單狀態更新

---

## 🚨 緊急處理：如果覆蓋率無法提升

### 情況：覆蓋率低於 70%，但無法立即補充測試

**臨時解決方案：**

1. **檢查實際覆蓋率**
   ```bash
   cd packages/atlas
   bun test:coverage 2>&1 | grep -i "coverage\|threshold"
   ```

2. **如果覆蓋率接近 70%（如 68-69%）**
   - 可以暫時調整閾值至 65%
   - **但必須在後續 PR 中補充測試**

3. **調整 package.json**
   ```json
   "test:coverage": "bun test --coverage --coverage-threshold=65"
   "test:ci": "bun test --coverage --coverage-threshold=65"
   ```

4. **記錄原因**
   - 在 PR 中說明為什麼暫時降低閾值
   - 建立 issue 追蹤測試補充進度

**⚠️ 重要：**
- 這只是臨時措施
- 必須在後續 PR 中恢復至 70%
- 不能長期維持低閾值

---

## 📊 CI 狀態監控

### 檢查 CI 狀態

1. **GitHub Actions 頁面**
   - 網址：`https://github.com/gravito-framework/gravito/actions`
   - 檢查：最新的 CI 執行狀態

2. **本地模擬 CI**
   ```bash
   # 在專案根目錄
   bunx turbo run typecheck test:coverage \
     --filter='./packages/atlas' \
     --concurrency=1
   ```

3. **檢查覆蓋率報告**
   - Bun 會在終端顯示覆蓋率
   - 如果低於閾值，會顯示錯誤

---

## 🔧 故障排除

### 問題：CI 失敗但本地通過

**可能原因：**
1. Bun 版本不同
2. 環境變數差異
3. 快取問題

**解決方案：**
```bash
# 1. 清除快取
rm -rf .turbo node_modules/.cache

# 2. 重新安裝
bun install --frozen-lockfile

# 3. 重新執行
bun test:coverage
```

### 問題：覆蓋率計算不一致

**可能原因：**
1. Bun 版本差異
2. 測試文件被計算在內

**解決方案：**
- 檢查 `bunfig.toml` 配置
- 確認測試文件排除規則
