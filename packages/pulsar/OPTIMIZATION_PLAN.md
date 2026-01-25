# @gravito/pulsar 優化執行計劃

> **建立日期**: 2026-01-25
>
> 本文件詳細說明 `@gravito/pulsar` 套件的優化改進計劃，基於完整的代碼審查分析結果。

---

## 執行摘要

| 優化項目 | 當前狀態 | 優先級 | 預期影響 |
|---------|---------|--------|---------|
| SessionService 缺失方法實現 | ❌ 未實現 | 🔴 緊急 | 類型一致性 |
| 敏感信息日誌移除 | ❌ 存在安全隱患 | 🔴 緊急 | 安全性 |
| 未使用變數清理 | ❌ 存在死代碼 | 🟡 重要 | 代碼品質 |
| SQLite 過期清理機制 | ❌ 未實現 | 🟡 重要 | 存儲效能 |
| 代碼重複消除 | ❌ 存在重複 | 🟡 重要 | 可維護性 |
| FileSessionStore 路徑驗證 | ⚠️ 不足 | 🟡 重要 | 安全性 |
| 測試覆蓋率提升 | ⚠️ 基本覆蓋 | 🟢 改進 | 穩定性 |
| 文檔完善 | ⚠️ 可改進 | 🟢 改進 | 開發者體驗 |

**當前代碼品質評分**: 7/10

---

## 🔴 Phase 1: 關鍵問題修復（緊急）

### 1.1 實現 SessionService 缺失方法

**問題描述**：`types.ts` 中定義的 `SessionService` 接口包含三個方法，但 `index.ts` 中未實現。

**影響位置**：
- 類型定義：`src/types.ts:164,183,190`
- 實現缺失：`src/index.ts:149-248`

**缺失方法**：

| 方法 | 類型定義行 | 功能說明 |
|------|-----------|---------|
| `isStarted()` | 164 | 檢查會話是否已啟動 |
| `pull(key, default)` | 183 | 取出並刪除會話數據 |
| `reflash()` | 190 | 重新保留所有 Flash 數據 |

**修復方案**：

```typescript
// src/index.ts - 在 session 物件中添加以下方法

// 1. isStarted() - 行 164 對應
isStarted(): boolean {
  return started
},

// 2. pull(key, defaultValue) - 行 183 對應
pull<T = unknown>(key: string, defaultValue?: T): T {
  const value = session.get<T>(key, defaultValue)
  session.forget(key)
  return value
},

// 3. reflash() - 行 190 對應
reflash(): void {
  const currentFlash = session.getFlash()
  if (currentFlash && typeof currentFlash === 'object') {
    nextFlash = { ...nextFlash, ...currentFlash }
  }
},
```

**驗證**：
```bash
bun run typecheck  # 確保類型一致
bun test          # 確保功能正確
```

---

### 1.2 移除敏感信息控制台日誌

**問題描述**：CSRF 驗證失敗時，令牌值被記錄到控制台，存在安全風險。

**影響位置**：`src/index.ts:288-290`

**當前問題代碼**：
```typescript
console.error('CSRF validation failed', {
  expected: csrfToken,  // ❌ 敏感信息
  received: headerToken || cookieToken,  // ❌ 敏感信息
})
```

**修復方案**：
```typescript
// 選項 A：移除詳細日誌（推薦）
console.error('CSRF validation failed')

// 選項 B：僅記錄非敏感信息
console.error('CSRF validation failed', {
  hasHeaderToken: !!headerToken,
  hasCookieToken: !!cookieToken,
  method: c.req.method,
  path: c.req.path,
})
```

**風險等級**：中等（可能導致令牌洩露於日誌系統）

---

### 1.3 清理未使用的變數

**問題描述**：TypeScript 編譯器報告多個未使用的變數。

**影響位置**：`src/index.ts:84,89,97-99`

**待移除變數**：
| 變數名 | 行號 | 原因 |
|--------|------|------|
| `_cacheKey` | 84 | 已棄用的快取鍵配置 |
| `_cookieHttpOnly` | 89 | 未使用的 Cookie 選項 |
| `_csrfCookiePath` | 97 | 未使用的 CSRF Cookie 路徑 |
| `_csrfCookieSameSite` | 98 | 未使用的 SameSite 設定 |
| `_csrfCookieSecure` | 99 | 未使用的 Secure 設定 |

**修復方案**：
1. 確認這些變數確實不再需要
2. 移除相關的解構賦值
3. 如果是保留功能但暫未實現，添加 TODO 註釋

---

## 🟡 Phase 2: 重要改進（1-2 週）

### 2.1 SQLite 驅動添加過期清理機制

**問題描述**：過期的會話記錄永遠不會被刪除，導致數據庫無限增長。

**影響位置**：`src/stores/SqliteSessionStore.ts`

**修復方案**：

```typescript
// 添加清理方法
async cleanup(): Promise<number> {
  const now = Date.now()
  const result = this.db.run(
    'DELETE FROM sessions WHERE expires_at < ?',
    [now]
  )
  return result.changes
}

// 添加自動清理選項
interface SqliteSessionStoreOptions {
  dbPath: string
  autoCleanup?: boolean
  cleanupInterval?: number  // 毫秒
}
```

**實現要點**：
1. 添加 `cleanup()` 公共方法供手動調用
2. 可選的自動清理間隔
3. 在 `read()` 時順便清理過期記錄（機會式清理）

---

### 2.2 提取重複的 Cookie 設置邏輯

**問題描述**：Cookie 設置邏輯在兩處重複出現。

**影響位置**：
- `src/index.ts:309-315`
- `src/index.ts:350-355`

**修復方案**：
```typescript
// 提取為輔助函數
function setCookies(
  c: Context,
  sessionCookie: string,
  csrfCookie: string | null
): void {
  const cookies = [sessionCookie]
  if (csrfCookie) {
    cookies.push(csrfCookie)
  }

  const existing = c.res.headers.get('Set-Cookie')
  if (existing) {
    cookies.unshift(existing)
  }

  c.res.headers.delete('Set-Cookie')
  for (const cookie of cookies) {
    c.res.headers.append('Set-Cookie', cookie)
  }
}
```

---

### 2.3 FileSessionStore 路徑驗證加強

**問題描述**：當前的檔案名稱清理僅移除非字母數字字符，可能存在安全隱患。

**影響位置**：`src/stores/FileSessionStore.ts:31`

**當前代碼**：
```typescript
const filename = sessionId.replace(/[^a-zA-Z0-9]/g, '') + '.json'
```

**修復方案**：
```typescript
// 更嚴格的驗證
private sanitizeSessionId(sessionId: string): string {
  // 1. 驗證長度
  if (sessionId.length < 16 || sessionId.length > 128) {
    throw new Error('Invalid session ID length')
  }

  // 2. 只允許 base64url 字符
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, '')

  // 3. 確保清理後長度一致（防止碰撞）
  if (sanitized.length !== sessionId.length) {
    throw new Error('Invalid session ID characters')
  }

  return sanitized + '.json'
}
```

---

### 2.4 雙重 URL 解碼問題修復

**問題描述**：CSRF 令牌被解碼兩次，可能導致邊界情況問題。

**影響位置**：`src/index.ts:285`

**當前代碼**：
```typescript
const headerToken = decodeURIComponent(rawHeaderToken || '')
```

**評估要點**：
1. 確認是否真的需要解碼（令牌通常是 base64url，不需要解碼）
2. 如果需要，只解碼一次
3. 添加註釋說明為什麼需要解碼

---

## 🟢 Phase 3: 優化改進（持續）

### 3.1 測試覆蓋率提升

**當前狀態**：
- 覆蓋基本功能
- 缺少邊界情況和安全測試

**需要添加的測試**：

| 測試類型 | 測試場景 | 優先級 |
|---------|---------|--------|
| 功能測試 | `isStarted()` 方法 | 高 |
| 功能測試 | `pull()` 方法 | 高 |
| 功能測試 | `reflash()` 方法 | 高 |
| 邊界測試 | 大型會話數據（>1MB） | 中 |
| 並發測試 | 多個並發會話 | 中 |
| 安全測試 | 原型污染攻擊向量 | 中 |
| 安全測試 | Session fixation | 中 |
| 配置測試 | 各種 Cookie 選項組合 | 低 |

**目標覆蓋率**：80%+

---

### 3.2 文檔完善

**README.md 改進**：

1. **安全最佳實踐章節**
   ```markdown
   ## 安全最佳實踐

   - 始終在生產環境啟用 HTTPS
   - 設置適當的 Cookie 過期時間
   - 定期執行會話清理
   - 監控異常的會話活動
   ```

2. **性能調優指南**
   ```markdown
   ## 性能調優

   - `touchIntervalSeconds`: 減少存儲寫入頻率
   - 選擇合適的存儲驅動（Redis > SQLite > File > Memory）
   - 控制會話數據大小
   ```

3. **Flash 數據使用範例**
   ```markdown
   ## Flash 數據

   Flash 數據僅在下一次請求中可用：

   ```typescript
   // 設置 Flash 消息
   session.flash('success', '操作完成！')

   // 下一個請求中讀取
   const message = session.getFlash('success')
   ```

4. **故障排查章節**

---

### 3.3 JSDoc 增強

**需要增強的區域**：

| 位置 | 改進內容 |
|------|---------|
| `src/index.ts:149-248` | 添加 `@throws` 標籤 |
| `src/types.ts` | Flash 數據結構的詳細說明 |
| `src/stores/*` | 各驅動的性能特性說明 |

---

### 3.4 代碼複雜度優化

**會話物件工廠函數提取**：

將 `src/index.ts:149-248` 的會話物件定義提取為獨立函數：

```typescript
// 建議結構
function createSessionService(
  sessionData: SessionRecord,
  store: SessionStore,
  options: InternalOptions
): SessionService {
  // ... 會話服務實現
}
```

**CSRF 邏輯提取**：

將 `src/index.ts:263-330` 的 CSRF 驗證邏輯提取為獨立函數：

```typescript
async function validateCsrf(
  c: Context,
  csrfToken: string,
  options: CsrfOptions
): Promise<boolean> {
  // ... CSRF 驗證邏輯
}
```

---

## 驗證命令

```bash
cd packages/pulsar

# 執行測試
bun test

# 檢查覆蓋率
bun test --coverage

# 類型檢查
bun run typecheck

# 構建驗證
bun run build

# Lint 檢查
bun run lint
```

---

## 時程規劃

### 第一階段（緊急）- 本週
- [ ] 實現 `isStarted()`、`pull()`、`reflash()` 方法
- [ ] 移除敏感信息日誌
- [ ] 清理未使用變數
- [ ] 添加缺失方法的測試

### 第二階段（重要）- 下週
- [ ] SQLite 過期清理機制
- [ ] 提取重複的 Cookie 邏輯
- [ ] FileSessionStore 路徑驗證加強
- [ ] 評估雙重 URL 解碼問題

### 第三階段（持續改進）
- [ ] 測試覆蓋率提升至 80%+
- [ ] README 文檔完善
- [ ] JSDoc 增強
- [ ] 代碼複雜度優化

---

## 相關文件參考

| 文件 | 用途 | 行數 |
|------|------|------|
| `src/index.ts` | 主要實現 | 371 |
| `src/types.ts` | 類型定義 | 211 |
| `src/helpers.ts` | 工具函數 | 109 |
| `src/stores/*.ts` | 存儲驅動 | 325 |
| `tests/*.test.ts` | 測試套件 | 559 |

---

## 結論

`@gravito/pulsar` 是一個功能完善的會話管理套件，架構設計良好。本優化計劃專注於：

1. **修復類型與實現的不一致**（最高優先級）
2. **消除安全隱患**（敏感信息日誌）
3. **提升代碼品質**（移除死代碼、消除重複）
4. **完善文檔與測試**（持續改進）

完成所有優化後，預期代碼品質評分可從 **7/10** 提升至 **9/10**。
