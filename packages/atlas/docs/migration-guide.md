# 從 db.raw() 遷移到 db.sql - 完整指南

將現有程式碼中的 `db.raw()` 遷移到新的 `db.sql` 標籤樣板 API，獲得 SQL Injection 保護和改善的參數綁定。

## 目錄

1. [概述](#概述)
2. [為什麼要遷移](#為什麼要遷移)
3. [遷移步驟](#遷移步驟)
4. [自動遷移（Codemod）](#自動遷移codemod)
5. [手動遷移案例](#手動遷移案例)
6. [驗證和測試](#驗證和測試)
7. [常見問題](#常見問題)

---

## 概述

### 舊方式：db.raw()

```typescript
// 簡單查詢
const result = await db.raw('SELECT * FROM users')

// 參數化查詢
const users = await db.raw('SELECT * FROM users WHERE id = ?', [userId])

// 字符串拼接（危險！）
const query = await db.raw('SELECT * FROM ' + table + ' WHERE id = ?')
```

### 新方式：db.sql

```typescript
// 簡單查詢
const result = await db.sql`SELECT * FROM users`

// 參數綁定
const users = await db.sql`SELECT * FROM users WHERE id = ${userId}`

// 動態表名（使用 identifier()）
const query = await db.sql`SELECT * FROM ${identifier(table)} WHERE id = ${userId}`
```

### 主要優勢

✅ **SQL Injection 防護**：參數自動綁定，防止 SQL 注入
✅ **類型安全**：TypeScript 完整支援
✅ **更易讀**：使用樣板字符串，SQL 看起來更自然
✅ **參數清晰**：`${}` 佔位符明確顯示參數位置
✅ **靜態分析**：ESLint 規則檢查常見錯誤

---

## 為什麼要遷移

### 1. SQL Injection 漏洞風險

❌ **危險**：字符串拼接容易引發 SQL 注入
```typescript
// ❌ 高風險
const query = db.raw('SELECT * FROM users WHERE email = ' + userEmail)
// 攻擊者輸入: admin@test.com' OR '1'='1
// 結果: SELECT * FROM users WHERE email = admin@test.com' OR '1'='1
```

✅ **安全**：參數綁定防止 SQL 注入
```typescript
// ✅ 安全
const query = db.sql`SELECT * FROM users WHERE email = ${userEmail}`
// 攻擊者輸入被視為字符串值，不會修改 SQL 結構
```

### 2. 參數綁定更清晰

❌ 舊方式需要手動計算 `?` 的順序
```typescript
// 容易出錯：誰是第一個參數？
const result = await db.raw(
  'SELECT * FROM users WHERE status = ? AND age > ? AND role = ?',
  [status, minAge, role]
)
```

✅ 新方式直接看到對應的值
```typescript
// 清晰：每個 ${...} 明確對應變數
const result = await db.sql`
  SELECT * FROM users
  WHERE status = ${status}
    AND age > ${minAge}
    AND role = ${role}
`
```

### 3. 靜態分析和工具支援

```typescript
// ESLint 規則檢查：
// ❌ no-unsafe-raw：檢測不安全的 raw() 調用
// ❌ sql-injection-risk：檢測潛在的 SQL 注入

// IDE 支援：
// ✅ SQL 語法高亮
// ✅ 自動補全
// ✅ 類型檢查
```

---

## 遷移步驟

### 方案 A：自動遷移（推薦）

適合 80-90% 的情況。

#### 前置條件

```bash
# 安裝 jscodeshift
npm install -g jscodeshift
# 或
bun add -g jscodeshift
```

#### 執行遷移

```bash
# 在項目根目錄執行
jscodeshift -t packages/atlas/scripts/codemods/raw-to-sql.codemod.ts \
  --parser=typescript \
  'src/**/*.ts'

# 或指定 dry-run 預覽變更
jscodeshift -t packages/atlas/scripts/codemods/raw-to-sql.codemod.ts \
  --parser=typescript \
  --dry \
  'src/**/*.ts'
```

#### 檢查結果

自動遷移後，檢查標記為 `TODO: Manual review` 的代碼：

```bash
# 搜索需要手動檢查的代碼
grep -r "TODO: Manual review" src/
```

### 方案 B：手動遷移

適合需要精細控制或複雜情況。

---

## 自動遷移（Codemod）

### 支援的轉換模式

#### ✅ 自動轉換

**1. 字符串字面量**
```typescript
// 輸入
const result = db.raw('SELECT * FROM users')

// 輸出
const result = db.sql`SELECT * FROM users`
```

**2. 不含表達式的樣板**
```typescript
// 輸入
const result = db.raw(`SELECT * FROM users`)

// 輸出
const result = db.sql`SELECT * FROM users`
```

**3. 簡單參數化查詢（無 `?` 佔位符）**
```typescript
// 輸入
const result = db.raw('SELECT * FROM posts', [])

// 輸出
const result = db.sql`SELECT * FROM posts`
```

#### ⚠️ 標記為手動審查

**1. 樣板中有變數**
```typescript
// 輸入
const result = db.raw(`SELECT * FROM ${tableName} WHERE id = ?`)

// 輸出（標記為手動審查）
// TODO: Manual review - Template has unsafe expressions...
const result = db.raw(`SELECT * FROM ${tableName} WHERE id = ?`)

// 修正方式
import { identifier } from '@gravito/atlas'
const result = db.sql`SELECT * FROM ${identifier(tableName)} WHERE id = ?`
```

**2. 字符串拼接**
```typescript
// 輸入
const query = db.raw('SELECT * FROM ' + table + ' WHERE status = ' + status)

// 輸出（標記為手動審查）
// TODO: Manual review - Uses string concatenation...

// 修正方式 1：字面量表名
const query = db.sql`SELECT * FROM users WHERE status = ${status}`

// 修正方式 2：動態表名
import { identifier } from '@gravito/atlas'
const query = db.sql`SELECT * FROM ${identifier(table)} WHERE status = ${status}`
```

**3. 帶 `?` 佔位符的參數化查詢**
```typescript
// 輸入
const result = db.raw('SELECT * FROM users WHERE id = ?', [userId])

// 輸出（標記為手動審查）
// TODO: Manual review - Uses parameterized query...

// 修正方式
const result = db.sql`SELECT * FROM users WHERE id = ${userId}`
```

---

## 手動遷移案例

### 案例 1：動態表名

```typescript
// ❌ 不安全：容易 SQL 注入
function getUsersByTable(table: string) {
  return db.raw('SELECT * FROM ' + table)
}

// ✅ 安全：使用 identifier()
import { identifier } from '@gravito/atlas'

function getUsersByTable(table: string) {
  return db.sql`SELECT * FROM ${identifier(table)}`
}
```

### 案例 2：條件查詢

```typescript
// ❌ 舊方式
function findUsers(status?: string, minAge?: number) {
  let sql = 'SELECT * FROM users WHERE 1=1'
  const params: unknown[] = []

  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }

  if (minAge) {
    sql += ' AND age > ?'
    params.push(minAge)
  }

  return db.raw(sql, params)
}

// ✅ 新方式（更清晰）
function findUsers(status?: string, minAge?: number) {
  let query = db.sql`SELECT * FROM users WHERE 1=1`

  if (status) {
    query = db.sql`${query} AND status = ${status}`
  }

  if (minAge) {
    query = db.sql`${query} AND age > ${minAge}`
  }

  return query
}
```

### 案例 3：複雜 JOIN

```typescript
// ❌ 舊方式
const result = await db.raw(`
  SELECT u.id, u.name, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON p.authorId = u.id
  WHERE u.status = ?
  GROUP BY u.id, u.name
  ORDER BY post_count DESC
`, [status])

// ✅ 新方式
const result = await db.sql`
  SELECT u.id, u.name, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON p.authorId = u.id
  WHERE u.status = ${status}
  GROUP BY u.id, u.name
  ORDER BY post_count DESC
`
```

### 案例 4：動態列名

```typescript
// ❌ 不安全
function getSortedUsers(sortBy: string) {
  return db.raw('SELECT * FROM users ORDER BY ' + sortBy)
}

// ✅ 安全：使用 identifier() 和白名單驗證
import { identifier } from '@gravito/atlas'

const ALLOWED_SORT_FIELDS = ['id', 'name', 'createdAt', 'status']

function getSortedUsers(sortBy: string) {
  if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
    throw new Error('Invalid sort field')
  }
  return db.sql`SELECT * FROM users ORDER BY ${identifier(sortBy)}`
}
```

### 案例 5：IN 子句

```typescript
// ❌ 舊方式（參數位置容易錯誤）
const userIds = [1, 2, 3, 4, 5]
const result = await db.raw(
  'SELECT * FROM users WHERE id IN (?, ?, ?, ?, ?)',
  userIds
)

// ✅ 新方式（更動態更清晰）
const result = await db.sql`
  SELECT * FROM users WHERE id IN (${userIds.join(',')})
`
// 或使用 ANY (PostgreSQL)
const result = await db.sql`
  SELECT * FROM users WHERE id = ANY(${userIds})
`
```

---

## 驗證和測試

### 1. 語法驗證

遷移後執行類型檢查：

```bash
bun run typecheck
```

### 2. 測試現有測試

執行現有測試確保功能未破損：

```bash
bun test
```

### 3. 查找遺漏的遷移

搜索剩餘的 `db.raw()` 調用：

```bash
grep -r "\.raw(" src/ --include="*.ts" --include="*.tsx"
```

### 4. 安全審計

使用 ESLint 規則檢查：

```bash
bun run lint --rule no-unsafe-raw --rule sql-injection-risk
```

### 5. 功能測試

運行端到端測試確保查詢邏輯正確：

```bash
bun test:e2e
```

---

## 常見問題

### Q1：我應該遷移所有 `db.raw()` 呼叫嗎？

**是的**。雖然 `db.raw()` 在技術上仍受支援，但新專案應使用 `db.sql`。優點包括：
- 更好的 SQL 注入防護
- 更清晰的語法
- IDE 更好的支援
- 靜態分析和 ESLint 檢查

### Q2：遷移會改變查詢行為嗎？

**不會**。兩種 API 都執行相同的參數綁定。查詢結果完全相同。

### Q3：我應該使用 `identifier()` 何時使用？

使用 `identifier()` 當：
- **表名是動態的**
  ```typescript
  db.sql`SELECT * FROM ${identifier(tableName)}`
  ```
- **列名是動態的**
  ```typescript
  db.sql`SELECT ${identifier(columnName)} FROM users`
  ```
- **任何 SQL 結構化元素是動態的**

不使用 `identifier()` 當：
- **值/數據**
  ```typescript
  db.sql`WHERE name = ${userName}`  // 不需要 identifier()
  ```

### Q4：手動審查（TODO: Manual review）是什麼意思？

代碼模式可能包含 SQL 注入風險。檢查並修正：

```typescript
// ❌ 被標記為手動審查
const result = db.raw(`SELECT * FROM ${table}`)

// ✅ 已修正
import { identifier } from '@gravito/atlas'
const result = db.sql`SELECT * FROM ${identifier(table)}`
```

### Q5：如何處理複雜的條件查詢？

拆分為多個較小的查詢或使用條件助手：

```typescript
// 方式 1：多個查詢
let whereClause = ''
const params: unknown[] = []

if (status) {
  whereClause += 'AND status = ?'
  params.push(status)
}

// 方式 2：使用 QueryBuilder（推薦）
const result = await db
  .from('users')
  .where('status', status)
  .where('age', '>', minAge)
  .get()
```

### Q6：舊程式碼中的 `db.raw()` 還能用嗎？

是的，向後相容性保證。但新程式碼應使用 `db.sql`。

### Q7：遷移大型專案需要多久？

- **小型專案**（<1000 行）：30 分鐘
- **中型專案**（1000-10000 行）：2-3 小時
- **大型專案**（>10000 行）：半天到一天

自動遷移可節省 80% 的時間。

### Q8：遷移期間出錯怎麼辦？

1. 執行 `git checkout` 恢復變更
2. 修正問題並重新運行遷移
3. 手動檢查和修正任何問題

```bash
# 恢復所有變更
git checkout -- src/

# 重新運行遷移
jscodeshift -t scripts/codemods/raw-to-sql.codemod.ts src/
```

### Q9：我可以混用 `db.raw()` 和 `db.sql` 嗎？

可以。沒有強制全部遷移的要求。但推薦完全遷移以獲得最佳安全性和可維護性。

### Q10：性能會改變嗎？

**不會**。兩種 API 都使用相同的參數綁定機制和查詢執行路徑。性能特性相同。

---

## 最佳實踐

### 1. 漸進式遷移

不需要一次遷移所有程式碼。可以逐檔案或逐功能遷移：

```bash
# 遷移單個檔案
jscodeshift -t scripts/codemods/raw-to-sql.codemod.ts src/repositories/UserRepository.ts

# 遷移單個目錄
jscodeshift -t scripts/codemods/raw-to-sql.codemod.ts src/repositories/
```

### 2. 在提交前審查

```bash
# 執行 dry-run 預覽變更
jscodeshift -t scripts/codemods/raw-to-sql.codemod.ts --dry src/

# 檢查變更
git diff

# 提交前運行測試
bun test
```

### 3. 使用類型檢查

遷移後執行完整的類型檢查：

```bash
bun run typecheck
```

### 4. 文檔註釋

在複雜查詢上添加說明：

```typescript
// 按月份統計銷售額
const monthlySales = await db.sql`
  SELECT
    DATE_TRUNC('month', orderDate) as month,
    SUM(amount) as total
  FROM orders
  WHERE orderDate >= ${startDate}
  GROUP BY DATE_TRUNC('month', orderDate)
`
```

### 5. 單元測試

為遷移後的複雜查詢添加測試：

```typescript
describe('User Repository', () => {
  it('finds active users by status', async () => {
    const result = await db.sql`
      SELECT * FROM users WHERE status = ${status}
    `
    expect(result).toHaveLength(expectedCount)
  })
})
```

---

## 下一步

✅ 完成遷移後：

1. 執行 `bun run check` - Lint 和格式檢查
2. 執行 `bun test` - 完整測試套件
3. 執行 `bun run typecheck` - TypeScript 驗證
4. 提交並推送分支

遷移完成！現在享受更安全、更清晰的 SQL 查詢。 🎉
