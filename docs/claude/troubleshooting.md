# 故障排除手冊

> **用途**：集中的故障排除和問題診斷指南
> **何時查閱**：遇到構建、測試、類型或依賴問題時
> **返回**：[CLAUDE.md](../../CLAUDE.md)

---

## 快速診斷表

| 症狀 | 可能原因 | 快速解法 |
|---|---|---|
| 某個包無法構建 | 依賴版本不一致 | `bun install && bun run version:check` |
| TypeScript 找不到模組 | 路徑別名未配置 | 檢查 `tsconfig.base.json` 中的 paths |
| 提交失敗（pre-commit hook） | 格式化或 lint 問題 | 執行 `bun run check:fix` |
| 推送失敗（pre-push hook） | 受影響的包構建失敗 | `bun run scripts/validate-affected-packages.ts` |
| 測試出現 flaky 失敗 | 非確定性行為或時序問題 | 在 `bun test --verbose` 下重複執行 |
| 快取造成的過時結果 | Turbo 快取污染 | `bun run typecheck:full` 清除快取 |

---

## 循環依賴

### 症狀

- 構建錯誤：`Circular dependencies detected`
- Pre-push hook 失敗
- 模組無法載入

### 診斷步驟

```bash
# 生成依賴圖，視覺化檢查
bun run scripts/generate-dependency-graph.ts

# 查看 pre-push hook 的驗證結果
# 檢查 .git/hooks/pre-push 輸出
```

### 解決方案

**原則**：打破依賴的循環，通常方式：
- 將共用代碼提取到第三個包
- 使用事件總線（Signal）進行跨包通訊
- 重新評估包邊界設計

**例子**：
```
A → B → A  (循環！)
改為：
A → Events → B（透過事件通訊）
```

### 預防

- 新增包時檢查依賴方向
- Satellite 間禁止直接導入
- 使用 `bun run scripts/validate-affected-packages.ts` 預檢查

---

## 類型錯誤

### 單一包類型錯誤

**症狀**
```
TS2304: Cannot find name 'xxx'
TS2322: Type 'X' is not assignable to type 'Y'
```

**解決步驟**

```bash
# 1. 檢查特定包
cd packages/<name>
bun run typecheck

# 2. 查看完整錯誤
bun tsc --noEmit  # 顯示完整堆疊追蹤

# 3. 修復後驗證
bun run typecheck
```

**常見原因**

| 錯誤 | 原因 | 修復 |
|---|---|---|
| `Cannot find name 'X'` | 缺少導入或路徑別名錯誤 | 檢查 `tsconfig.base.json` 的 paths 配置 |
| `Type 'X' is not assignable to 'Y'` | 型別不匹配 | 檢查版本升級的 breaking changes |
| `Property 'X' does not exist` | 依賴版本過舊 | `bun install` 然後 `bun run typecheck:full` |

### 跨包類型傳播問題

**症狀**：修改 A 包，導致 B 包也出現類型錯誤

**解決步驟**

```bash
# 1. 完整類型檢查（清除快取）
bun run typecheck:full

# 2. 查看所有受影響的包
bun run ci:affected

# 3. 驗證整個依賴鏈
bun run scripts/validate-affected-packages.ts
```

### 未使用變數/導入

**症狀**
```
TS6133: 'x' is declared but its value is never used
TS6198: 'x' is declared but never used
```

**解決方案**

```bash
# 移除未使用的導入
# 或者如果有意保留，添加註解：
// eslint-disable-next-line @typescript-eslint/no-unused-vars

# 自動修復（Biome）
bun run check:fix
```

---

## 構建失敗

### TypeScript 編譯失敗

```bash
# 完整類型檢查（清除快取）
bun run typecheck:full

# 檢查特定包的 tsconfig
cd packages/<name>
cat tsconfig.json
```

### Biome Lint 失敗

**症狀**
```
error: Maximum call stack size exceeded
error: rule X: Y failed
```

**解決步驟**

```bash
# 1. 檢查 lint
bun run lint

# 2. 自動修復
bun run check:fix

# 3. 手動檢查 biome.json overrides
cat biome.json | grep -A 10 "overrides"
```

**常見規則違反**

| 規則 | 修復方式 |
|---|---|
| 未使用變數 | 刪除或添加 `// eslint-disable-next-line` |
| 空行過多 | 自動修復：`bun run check:fix` |
| 導入排序 | 自動修復：`bun run check:fix` |
| 行長過長 | 換行或拆分邏輯 |

### 依賴版本不一致

**症狀**
```
error: Found 2 different versions of 'package-x'
```

**解決步驟**

```bash
# 檢查版本一致性
bun run version:check

# 更新依賴
bun install

# 確認所有包都在使用相同版本
bun list --all | grep <package-name>
```

---

## 測試失敗

### 單一包測試失敗

```bash
# 詳細輸出
cd packages/<name>
bun test --verbose

# 查看覆蓋率
bun test --coverage

# 重複執行（排除 flaky 測試）
bun test  # 執行多次
```

### 測試超時

**症狀**
```
Test suite timeout exceeded
```

**解決方案**

```bash
# 增加超時時間（在測試中）
test('should complete', async () => {
  // test code
}, { timeout: 30000 })  // 30 秒

# 或在命令行
bun test --timeout=30000
```

### 覆蓋率不足

**症狀**
```
Coverage threshold not met: 75%
```

**解決步驟**

```bash
# 查看覆蓋率詳情
bun test --coverage

# 查看哪些行未被覆蓋
cat coverage/coverage-final.json

# 添加測試以提高覆蓋率
# 目標：大多數包 75%+，核心包更高
```

---

## Git Hook 問題

### Pre-commit Hook 失敗

**症狀**：提交被阻止

**常見原因**

| 原因 | 症狀 | 解決方案 |
|---|---|---|
| 格式化問題 | `biome check --write` 失敗 | `bun run check:fix` |
| Lint 錯誤 | 代碼風格違反 | `bun run check:fix` |
| 文件未暫存 | Hook 修改了檔案但未添加 | `git add .` 然後重新提交 |

**修復步驟**

```bash
# 1. 自動修復
bun run check:fix

# 2. 添加修復後的文件
git add .

# 3. 重新提交
git commit -m "feat: description"
```

### Pre-push Hook 失敗

**症狀**：推送被阻止（通常是受影響的包構建失敗）

**解決步驟**

```bash
# 1. 查看受影響的包
bun run ci:affected

# 2. 驗證它們是否構建成功
bun run scripts/validate-affected-packages.ts

# 3. 修復失敗的包
cd packages/<failing-package>
bun run typecheck
bun test
bun run build

# 4. 重新推送
git push
```

### Simple-git-hooks 配置問題

**症狀**：Hook 沒有執行

**解決步驟**

```bash
# 重新安裝 hooks
npx simple-git-hooks

# 驗證 hooks 已安裝
ls .git/hooks/pre-commit
ls .git/hooks/pre-push

# 檢查 package.json 的 simple-git-hooks 配置
cat package.json | grep -A 5 "simple-git-hooks"
```

---

## 清快取與重新初始化

```bash
# 清除 Turbo 快取
rm -rf .turbo

# 清除 node_modules 和 bun.lockb
rm -rf node_modules bun.lockb

# 重新初始化
bun install
bun run typecheck:full
bun run test
```

---

## 常見原因檢查清單

遇到問題時，按順序檢查：

- [ ] `bun install` 執行過且沒有錯誤
- [ ] `bun run typecheck:full` 通過
- [ ] `bun run check` 通過（無格式化或 lint 問題）
- [ ] 受影響的包能正常構建：`cd packages/<name> && bun run build`
- [ ] 相關測試通過：`bun run test`
- [ ] `.git/hooks/` 中的 hooks 可執行
- [ ] 依賴版本一致：`bun run version:check`

---

## 相關文件

- [返回 CLAUDE.md](../../CLAUDE.md)
- [所有命令參考](./commands.md)
- [開發工作流程](./development.md)
- [工具配置詳情](./config.md)
- [docs/operations/DEVELOPMENT_GUIDE.md](../operations/DEVELOPMENT_GUIDE.md) - 更詳細的開發指南
