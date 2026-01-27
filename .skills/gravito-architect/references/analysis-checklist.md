# 程式碼分析檢查清單

此文件定義分析程式碼時必須檢查的技術面向，確保識別出潛在問題。

## 必檢項目

### 1. N+1 查詢問題 (N+1 Query Problem)

**定義**：在迴圈中執行重複查詢，導致資料庫連線數爆炸。

**檢查重點**：
- 迴圈內是否有資料庫查詢？
- 關聯資料的載入是否使用 Eager Loading？
- 是否存在「先查主表，再逐筆查關聯表」的模式？

**識別模式**：
```typescript
// ❌ 錯誤：N+1 問題
const users = await User.findAll(); // 1 次查詢
for (const user of users) {
  const posts = await user.posts(); // N 次查詢
}

// ✅ 正確：使用 Eager Loading
const users = await User.query().with('posts').execute(); // 1 次查詢
```

**報告格式**：
```markdown
**N+1 查詢問題**：
- **位置**：`UserService.ts:45-50`
- **現象**：在迴圈中逐筆查詢用戶的文章列表
- **影響**：1000 個用戶會產生 1001 次查詢
- **修正建議**：使用 `.with('posts')` 預載關聯資料
```

---

### 2. Race Condition (競態條件)

**定義**：多個異步操作並發執行時，因執行順序不確定導致結果錯誤。

**檢查重點**：
- 異步操作是否共享可變狀態？
- 是否有「讀取 → 判斷 → 寫入」的非原子性操作？
- 並發更新是否有鎖機制保護？

**識別模式**：
```typescript
// ❌ 錯誤：Race Condition
async function buyTicket(ticketId: string) {
  const ticket = await Ticket.findById(ticketId);
  if (ticket.status === 'available') {
    ticket.status = 'sold'; // 多個請求可能同時進入此處
    await ticket.save();
  }
}

// ✅ 正確：使用樂觀鎖
async function buyTicket(ticketId: string) {
  const updated = await Ticket.updateWhere(
    { id: ticketId, status: 'available', version: ticket.version },
    { status: 'sold', version: ticket.version + 1 }
  );
  if (updated === 0) throw new Error('票券已售出');
}
```

**報告格式**：
```markdown
**Race Condition**：
- **位置**：`TicketService.ts:120-125`
- **現象**：讀取票券狀態後直接更新，無鎖保護
- **影響**：高並發時可能超賣票券
- **修正建議**：使用樂觀鎖（`version` 欄位）或悲觀鎖（`SELECT FOR UPDATE`）
```

---

### 3. 記憶體洩漏 (Memory Leak)

**定義**：物件未被釋放，長期累積導致記憶體耗盡。

**檢查重點**：
- 事件監聽器是否正確移除？
- 定時器（`setInterval`）是否清理？
- 快取是否有淘汰機制？
- 閉包是否持有大物件的參考？

**識別模式**：
```typescript
// ❌ 錯誤：事件監聽器未移除
class DataFetcher {
  constructor() {
    eventBus.on('update', this.handleUpdate);
  }
  // 缺少清理方法，實例銷毀後監聽器仍存在
}

// ✅ 正確：提供清理方法
class DataFetcher {
  constructor() {
    this.handler = this.handleUpdate.bind(this);
    eventBus.on('update', this.handler);
  }

  destroy() {
    eventBus.off('update', this.handler);
  }
}
```

**報告格式**：
```markdown
**記憶體洩漏風險**：
- **位置**：`DataFetcher.ts:15-20`
- **現象**：事件監聽器未在物件銷毀時移除
- **影響**：長時間運行後記憶體持續增長
- **修正建議**：新增 `destroy()` 方法移除監聽器
```

---

### 4. 類型安全問題 (Type Safety)

**檢查重點**：
- 是否濫用 `any` 型別？
- 是否缺少必要的型別斷言？
- 泛型約束是否完整？

**識別模式**：
```typescript
// ❌ 錯誤：使用 any 跳過型別檢查
function process(data: any) {
  return data.value.toUpperCase(); // 執行時可能報錯
}

// ✅ 正確：使用具體型別
interface Data {
  value: string;
}
function process(data: Data) {
  return data.value.toUpperCase();
}
```

**報告格式**：
```markdown
**類型安全問題**：
- **位置**：`DataProcessor.ts:30`
- **現象**：參數使用 `any` 型別
- **影響**：無法在編譯時發現錯誤
- **修正建議**：定義 `ProcessInput` 介面替換 `any`
```

---

### 5. 異常處理缺失 (Missing Error Handling)

**檢查重點**：
- 異步操作是否有 `try-catch`？
- 錯誤訊息是否洩漏敏感資訊？
- 是否有全域錯誤處理機制？

**識別模式**：
```typescript
// ❌ 錯誤：未處理異常
async function fetchData(url: string) {
  const res = await fetch(url); // 網路錯誤會導致程序崩潰
  return res.json();
}

// ✅ 正確：完整錯誤處理
async function fetchData(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (error) {
    console.error('資料取得失敗:', error);
    throw new FetchError('無法取得資料');
  }
}
```

---

### 6. 效能瓶頸 (Performance Bottleneck)

**檢查重點**：
- 是否有不必要的巢狀迴圈（O(n²) 以上）？
- 是否頻繁操作 DOM？
- 是否有大量物件創建與銷毀？

**識別模式**：
```typescript
// ❌ 錯誤：O(n²) 複雜度
function findDuplicates(arr: number[]) {
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) duplicates.push(arr[i]);
    }
  }
  return duplicates;
}

// ✅ 正確：O(n) 複雜度
function findDuplicates(arr: number[]) {
  const seen = new Set<number>();
  const duplicates = new Set<number>();
  for (const num of arr) {
    if (seen.has(num)) duplicates.add(num);
    seen.add(num);
  }
  return Array.from(duplicates);
}
```

**報告格式**：
```markdown
**效能瓶頸**：
- **位置**：`ArrayUtils.ts:55-62`
- **現象**：使用巢狀迴圈查找重複值
- **影響**：10,000 筆資料需執行 1 億次比對
- **修正建議**：使用 `Set` 將複雜度從 O(n²) 降至 O(n)
```

---

### 7. 安全性問題 (Security Issues)

**檢查重點**：
- 是否有 SQL Injection 風險？
- 使用者輸入是否經過驗證？
- 敏感資訊是否正確加密？

**識別模式**：
```typescript
// ❌ 錯誤：SQL Injection 風險
async function getUser(username: string) {
  const sql = `SELECT * FROM users WHERE name = '${username}'`;
  return db.query(sql);
}

// ✅ 正確：使用參數化查詢
async function getUser(username: string) {
  return db.query('SELECT * FROM users WHERE name = ?', [username]);
}
```

---

## 分析流程

執行程式碼分析時，按以下順序檢查：

1. **架構層級**：
   - 模組職責是否清晰？
   - 是否有循環依賴？
   - 資料流向是否合理？

2. **實作層級**：
   - 執行上述 7 項必檢項目
   - 標註每個問題的嚴重程度（Critical / High / Medium / Low）

3. **測試覆蓋**：
   - 是否有單元測試？
   - 邊際案例是否測試？
   - 測試覆蓋率是否達標（80%+）？

---

## 輸出格式

分析結果應包含：

```markdown
## 潛在問題清單

### Critical（必須修正）

1. **[問題類型]**：[簡述問題]
   - **位置**：`檔案名稱:行號`
   - **修正建議**：[具體建議]

### High（建議修正）

...

### Medium（可選修正）

...
```

---

## 特別注意事項

1. **不要過度報告**：避免列出無關緊要的小問題（如：變數命名風格）
2. **提供可執行建議**：修正建議必須具體，最好附上程式碼範例
3. **量化影響**：說明問題的影響範圍（如：「影響 1000+ 用戶的查詢效能」）
