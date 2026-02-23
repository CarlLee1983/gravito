# 進階 SQL 使用模式

實戰中常見的進階查詢模式與最佳實踐。

## 目錄

1. [複雜 JOIN 與聚合](#複雜-join-與聚合)
2. [窗口函數](#窗口函數)
3. [遞迴查詢](#遞迴查詢)
4. [條件邏輯](#條件邏輯)
5. [子查詢優化](#子查詢優化)

---

## 複雜 JOIN 與聚合

### 多表 JOIN

```typescript
// 取得使用者、文章計數與最新留言
const result = await db.sql<any>`
  SELECT
    u.id,
    u.name,
    COUNT(DISTINCT p.id) as post_count,
    COUNT(DISTINCT c.id) as comment_count,
    MAX(c.createdAt) as last_comment_date
  FROM users u
  LEFT JOIN posts p ON p.authorId = u.id
  LEFT JOIN comments c ON c.postId = p.id
  WHERE u.isActive = ${true}
  GROUP BY u.id, u.name
  ORDER BY post_count DESC
`.all()
```

### 複合條件聚合

```typescript
// 按月份統計銷售額，分類統計
const salesByMonth = await db.sql<any>`
  SELECT
    DATE_TRUNC('month', orderDate) as month,
    category,
    COUNT(*) as order_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
  FROM orders
  WHERE orderDate BETWEEN ${startDate} AND ${endDate}
    AND status = ${'completed'}
  GROUP BY DATE_TRUNC('month', orderDate), category
  HAVING COUNT(*) > ${minOrders}
  ORDER BY month DESC, total_amount DESC
`.all()
```

---

## 窗口函數

### 排名與分排序

```typescript
// 計算使用者在其分類中的排名
const rankedUsers = await db.sql<any>`
  SELECT
    id,
    name,
    department,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rank_in_dept,
    RANK() OVER (ORDER BY salary DESC) as overall_rank
  FROM employees
  WHERE isActive = ${true}
  ORDER BY department, rank_in_dept
`.all()
```

### 累積求和

```typescript
// 計算累積銷售額
const cumulativeSales = await db.sql<any>`
  SELECT
    DATE(orderDate) as order_date,
    amount,
    SUM(amount) OVER (ORDER BY orderDate ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_total
  FROM orders
  WHERE status = ${'completed'}
    AND orderDate >= ${startDate}
  ORDER BY orderDate
`.all()
```

### 移動平均

```typescript
// 計算 7 天移動平均銷售額
const movingAverage = await db.sql<any>`
  SELECT
    DATE(created_at) as date,
    SUM(amount) as daily_total,
    AVG(SUM(amount)) OVER (
      ORDER BY DATE(created_at)
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_7d
  FROM sales
  GROUP BY DATE(created_at)
  ORDER BY date DESC
`.all()
```

---

## 遞迴查詢

### 分層結構

```typescript
// 取得組織層級結構
const hierarchy = await db.sql<any>`
  WITH RECURSIVE org_tree AS (
    -- 基礎情況：根部門
    SELECT id, name, parentId, 0 as level
    FROM departments
    WHERE parentId IS NULL

    UNION ALL

    -- 遞迴：子部門
    SELECT d.id, d.name, d.parentId, ot.level + 1
    FROM departments d
    INNER JOIN org_tree ot ON d.parentId = ot.id
    WHERE ot.level < 10 -- 防止無限遞迴
  )
  SELECT * FROM org_tree
  ORDER BY level, name
`.all()
```

### 路徑追蹤

```typescript
// 取得從節點到根的路徑
const path = await db.sql<any>`
  WITH RECURSIVE path_finder AS (
    SELECT id, name, parentId, CAST(name AS VARCHAR) as path
    FROM categories
    WHERE id = ${categoryId}

    UNION ALL

    SELECT c.id, c.name, c.parentId, CONCAT(c.name, ' > ', pf.path)
    FROM categories c
    INNER JOIN path_finder pf ON c.id = pf.parentId
  )
  SELECT * FROM path_finder
  ORDER BY path
`.all()
```

---

## 條件邏輯

### CASE 表達式

```typescript
// 複雜的狀態分類
const classified = await db.sql<any>`
  SELECT
    id,
    name,
    CASE
      WHEN status = ${'active'} AND balance > ${100} THEN 'premium'
      WHEN status = ${'active'} THEN 'standard'
      WHEN lastLogin > ${thirtyDaysAgo} THEN 'inactive_recent'
      ELSE 'dormant'
    END as user_status,
    CASE
      WHEN age < 18 THEN 'minor'
      WHEN age < 65 THEN 'adult'
      ELSE 'senior'
    END as age_group
  FROM users
  ORDER BY user_status
`.all()
```

### 條件聚合

```typescript
// 按條件分別計算
const conditionalAgg = await db.sql<any>`
  SELECT
    category,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = ${'completed'} THEN 1 END) as completed,
    COUNT(CASE WHEN status = ${'pending'} THEN 1 END) as pending,
    COUNT(CASE WHEN status = ${'cancelled'} THEN 1 END) as cancelled,
    SUM(CASE WHEN status = ${'completed'} THEN amount ELSE 0 END) as revenue
  FROM orders
  GROUP BY category
`.all()
```

---

## 子查詢優化

### EXISTS vs IN

```typescript
// ✅ 推薦：EXISTS（對大型列表更有效）
const result = await db.sql<any>`
  SELECT * FROM users u
  WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.userId = u.id
      AND o.createdAt > ${lastMonth}
  )
`.all()

// ⚠️ 可接受：IN（對小型列表更簡潔）
const result = await db.sql<any>`
  SELECT * FROM users u
  WHERE id IN (
    SELECT DISTINCT userId FROM orders
    WHERE createdAt > ${lastMonth}
  )
`.all()
```

### 相關子查詢

```typescript
// 取得各部門的最高薪資員工
const topEarners = await db.sql<any>`
  SELECT
    id,
    name,
    department,
    salary
  FROM employees e
  WHERE salary = (
    SELECT MAX(salary)
    FROM employees
    WHERE department = e.department
  )
`.all()
```

### 自連接

```typescript
// 找出有相同 email 域的使用者對
const duplicateDomains = await db.sql<any>`
  SELECT DISTINCT
    u1.id as user1_id,
    u1.email as user1_email,
    u2.id as user2_id,
    u2.email as user2_email
  FROM users u1
  JOIN users u2 ON u1.id < u2.id
    AND RIGHT(u1.email, POSITION('@' IN u1.email) - 1) = RIGHT(u2.email, POSITION('@' IN u2.email) - 1)
  WHERE u1.isActive = ${true}
    AND u2.isActive = ${true}
`.all()
```

---

## 效能優化技巧

### 查詢計劃分析

```typescript
// ✅ 檢查查詢計劃
const plan = await db.raw('EXPLAIN SELECT * FROM users WHERE id = ?', [1])

// 查看執行計劃，確保使用了索引
console.log(plan.rows)
```

### 索引提示

```typescript
// ✅ 強制使用特定索引
const result = await db.sql<any>`
  SELECT /*+ INDEX(users idx_email) */ *
  FROM users
  WHERE email = ${email}
`.all()
```

### 批量操作

```typescript
// ✅ 推薦：批量更新而不是逐條
const result = await db.sql`
  UPDATE users
  SET lastLogin = NOW()
  WHERE id IN (${userIds.join(',')})
`.execute()

// ❌ 避免：逐條更新
for (const userId of userIds) {
  await db.sql`UPDATE users SET lastLogin = NOW() WHERE id = ${userId}`.execute()
}
```

---

## 常見陷阱

### N+1 查詢問題

```typescript
// ❌ 不好：N+1 查詢
const posts = await db.table('posts').get()
for (const post of posts) {
  post.author = await db.table('users').where('id', post.authorId).first()
  // N 個額外查詢！
}

// ✅ 好：一次 JOIN
const posts = await db.sql<any>`
  SELECT
    p.*,
    u.name as author_name,
    u.email as author_email
  FROM posts p
  JOIN users u ON u.id = p.authorId
`.all()
```

### 未使用索引的查詢

```typescript
// ❌ 不好：函數在 WHERE 中
const result = await db.sql<any>`
  SELECT * FROM users
  WHERE LOWER(email) = ${email.toLowerCase()}
`.all()
// 不會使用 email 索引

// ✅ 好：直接比較
const result = await db.sql<any>`
  SELECT * FROM users
  WHERE email = ${email}
`.all()
// 使用 email 索引
```

### 隱式類型轉換

```typescript
// ❌ 不好：字符串與數字比較
const result = await db.sql<any>`
  SELECT * FROM orders
  WHERE id = ${stringId} -- '123' vs 123
`.all()

// ✅ 好：明確類型
const result = await db.sql<any>`
  SELECT * FROM orders
  WHERE id = ${parseInt(stringId, 10)}
`.all()
```

---

## 參考資源

- [SafeQueryBuilder](./safe-queries.md)
- [進階功能](./advanced-features.md)
- [Query Builder](./query-builder.md)
