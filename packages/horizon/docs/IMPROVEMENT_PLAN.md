# @gravito/horizon 優化改善計劃

> **目標版本範圍**: v3.1.0 - v3.3.0
> **日期**: 2025-01-23
> **分支**: `dx/horizon-improvement-plan`
> **初版評分**: 8.1/10
> **一審補強後**: 8.5/10（補充安全性、相容性、時程後）
> **二審補強後**: 8.8/10（修正代碼範例、補充遺漏項目、調整版本策略）

---

## 目錄

1. [模組概述](#1-模組概述)
2. [現況分析](#2-現況分析)
3. [問題清單與優先級](#3-問題清單與優先級)
4. [第一階段：緊急修復（P1）](#4-第一階段緊急修復p1)
5. [第二階段：功能強化（P2）](#5-第二階段功能強化p2)
6. [第三階段：長期優化（P3）](#6-第三階段長期優化p3)
7. [測試改善計劃](#7-測試改善計劃)
8. [文檔更新計劃](#8-文檔更新計劃)
9. [執行時程與里程碑](#9-執行時程與里程碑)
10. [風險評估](#10-風險評估)
11. [安全性考量](#11-安全性考量)
12. [向後相容性](#12-向後相容性)
13. [效能基準測試](#13-效能基準測試)
14. [回滾計劃](#14-回滾計劃)

---

## 1. 模組概述

### 1.1 功能定位

**@gravito/horizon** 是 Gravito 框架的分散式任務排程模組，提供：

- Cron 任務排程（標準 Cron 表達式）
- 分散式鎖控制（跨多伺服器單點執行）
- Fluent API（直觀的鏈式配置）
- 節點角色支持（廣播/單點執行模式）
- Shell 命令執行
- Hook 生命週期回調

### 1.2 架構結構

```
horizon/src/
├── index.ts                 # 模組入口
├── OrbitHorizon.ts          # Gravito Orbit 實現
├── SchedulerManager.ts      # 核心排程器
├── TaskSchedule.ts          # Fluent API 實現
├── CronParser.ts            # Cron 表達式解析器
├── SimpleCronParser.ts      # 輕量級 Cron 解析器
├── process/
│   └── Process.ts           # Shell 命令執行
└── locks/
    ├── LockStore.ts         # 鎖存儲介面
    ├── LockManager.ts       # 鎖管理器
    ├── MemoryLockStore.ts   # 記憶體鎖實現
    └── CacheLockStore.ts    # 快取鎖實現
```

### 1.3 依賴關係

| 模組 | 類型 | 必需性 |
|------|------|--------|
| @gravito/core | Peer | 必需 |
| @gravito/stasis | Peer | 可選（快取鎖）|
| cron-parser | 可選 | 非必需 |

---

## 2. 現況分析

### 2.1 代碼品質評分

| 維度 | 評分 | 備註 |
|------|------|------|
| 架構設計 | 8.5/10 | 模組化清晰，鎖設計可改進 |
| 代碼品質 | 8.4/10 | 整體良好，少數輸入驗證問題 |
| 測試覆蓋 | 7.0/10 | 達最低閾值但不充分 |
| 文檔完整性 | 7.5/10 | README 清晰，內部文檔不足 |
| 效能最佳化 | 8.0/10 | 輕量級解析器佳，可添加快取 |
| 類型安全 | 9.0/10 | TypeScript 類型完整一致 |

### 2.2 優勢

- ✅ 單一責任原則遵守良好
- ✅ 檔案大小控制得當（大多 < 100 行）
- ✅ 完善的 try-catch 覆蓋
- ✅ SimpleCronParser 輕量級設計
- ✅ cron-parser 延遲加載

### 2.3 待改善

- ⚠️ `TaskSchedule.at()` 輸入驗證不足
- ⚠️ 缺少到期任務的日誌記錄
- ⚠️ CronParser 雙重解析可優化
- ⚠️ 缺少任務超時控制
- ⚠️ 缺少任務重試機制
- ⚠️ 邊界測試覆蓋不足

---

## 3. 問題清單與優先級

### P1 - 緊急（必須立即修復）

| 編號 | 問題 | 風險等級 | 影響範圍 |
|------|------|----------|----------|
| P1-01 | `TaskSchedule.at()` 無效時間會產生 NaN 表達式 | 高 | 所有使用 at() 的任務 |
| P1-02 | 到期任務無日誌記錄，難以追蹤 | 中 | 生產環境監控 |
| P1-03 | `dailyAt()`, `weeklyOn()`, `monthlyOn()`, `hourlyAt()` 同樣缺乏驗證 | 高 | 所有使用這些方法的任務 |

### P2 - 重要（下一版本修復）

| 編號 | 問題 | 風險等級 | 影響範圍 |
|------|------|----------|----------|
| P2-01 | CronParser 雙重解析效能問題 | 中 | 高頻任務檢查 |
| P2-02 | 缺少任務執行超時控制 | 中 | 長時間任務 |
| P2-03 | `timezone()` 缺乏有效性驗證 | 中 | 使用自訂時區的任務 |
| P2-04 | `cron()` 缺乏表達式格式驗證 | 中 | 使用自訂 cron 的任務 |
| P2-05 | 邊界測試覆蓋不足 | 中 | 代碼可靠性 |
| P2-06 | 記憶體鎖在多機環境警告不足 | 低 | 分散式部署（降級） |

### P3 - 優化（可排入未來版本）

| 編號 | 問題 | 風險等級 | 影響範圍 |
|------|------|----------|----------|
| P3-01 | 缺少任務重試機制 | 低 | 故障恢復 |
| P3-02 | 缺少執行指標監控 | 低 | 營運可觀察性 |
| P3-03 | FireAndForget 模式文檔不完整 | 低 | 開發者體驗 |

---

## 4. 第一階段：緊急修復（P1）

### 4.1 P1-01：修復 `TaskSchedule.at()` 輸入驗證

**檔案**: `src/TaskSchedule.ts`
**行號**: 231-240

**現況代碼**（TaskSchedule.ts:231-240）:
```typescript
at(time: string): this {
  const [hour, minute] = time.split(':')
  const parts = this.task.expression.split(' ')
  if (parts.length >= 5) {
    parts[0] = String(Number(minute))  // 危險：Number('') 返回 0，Number(undefined) 返回 NaN
    parts[1] = String(Number(hour))    // 危險：同上
    this.task.expression = parts.join(' ')
  }
  return this
}
```

**問題分析**：
- `'invalid'.split(':')` 返回 `['invalid']`，導致 `minute = undefined`
- `Number(undefined)` 返回 `NaN`，`String(NaN)` 返回 `'NaN'`
- 最終產生無效表達式如 `'NaN NaN * * *'`，任務永遠不會執行

**修復方案**:
```typescript
at(time: string): this {
  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  if (
    isNaN(hour) ||
    isNaN(minute) ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59
  ) {
    throw new Error(
      `Invalid time format: "${time}". Expected HH:mm (24-hour format, 00:00-23:59)`
    )
  }

  const parts = this.task.expression.split(' ')
  if (parts.length >= 5) {
    parts[0] = String(minute)
    parts[1] = String(hour)
    this.task.expression = parts.join(' ')
  }
  return this
}
```

**驗證測試**:
```typescript
describe('TaskSchedule.at() validation', () => {
  it('should accept valid time formats', () => {
    expect(() => schedule.at('00:00')).not.toThrow()
    expect(() => schedule.at('23:59')).not.toThrow()
    expect(() => schedule.at('12:30')).not.toThrow()
  })

  it('should reject invalid time formats', () => {
    expect(() => schedule.at('25:00')).toThrow(/Invalid time format/)
    expect(() => schedule.at('12:60')).toThrow(/Invalid time format/)
    expect(() => schedule.at('invalid')).toThrow(/Invalid time format/)
    expect(() => schedule.at('')).toThrow(/Invalid time format/)
  })
})
```

---

### 4.2 P1-02：添加到期任務日誌記錄

**檔案**: `src/SchedulerManager.ts`
**行號**: 90-91

**現況代碼**:
```typescript
if (dueTasks.length > 0) {
  // Log found tasks?
}
```

**修復方案**:
```typescript
if (dueTasks.length > 0) {
  this.logger?.debug(
    `[Horizon] Found ${dueTasks.length} due task(s) to execute`,
    {
      tasks: dueTasks.map(t => ({
        name: t.name,
        expression: t.expression,
        background: t.background,
        oneServer: t.shouldRunOnOneServer
      }))
    }
  )
}
```

---

### 4.3 P1-03：修復相關時間方法的輸入驗證

**檔案**: `src/TaskSchedule.ts`

同樣的驗證問題存在於 `hourlyAt()`, `dailyAt()`, `weeklyOn()`, `monthlyOn()` 方法。

**hourlyAt() 修復方案**（第 145-147 行）:
```typescript
hourlyAt(minute: number): this {
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error(
      `Invalid minute: ${minute}. Expected integer 0-59`
    )
  }
  this.task.expression = `${minute} * * * *`
  return this
}
```

**dailyAt() 修復方案**（第 164-167 行）:
```typescript
dailyAt(time: string): this {
  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  if (
    isNaN(hour) ||
    isNaN(minute) ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59
  ) {
    throw new Error(
      `Invalid time format: "${time}". Expected HH:mm (24-hour format, 00:00-23:59)`
    )
  }

  this.task.expression = `${minute} ${hour} * * *`
  return this
}
```

**weeklyOn() 修復方案**:
```typescript
weeklyOn(dayOfWeek: number, time: string): this {
  if (dayOfWeek < 0 || dayOfWeek > 6 || !Number.isInteger(dayOfWeek)) {
    throw new Error(
      `Invalid day of week: ${dayOfWeek}. Expected 0-6 (Sunday=0, Saturday=6)`
    )
  }

  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  if (
    isNaN(hour) ||
    isNaN(minute) ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59
  ) {
    throw new Error(
      `Invalid time format: "${time}". Expected HH:mm (24-hour format, 00:00-23:59)`
    )
  }

  this.task.expression = `${minute} ${hour} * * ${dayOfWeek}`
  return this
}
```

**monthlyOn() 修復方案**:
```typescript
monthlyOn(dayOfMonth: number, time: string): this {
  if (dayOfMonth < 1 || dayOfMonth > 31 || !Number.isInteger(dayOfMonth)) {
    throw new Error(
      `Invalid day of month: ${dayOfMonth}. Expected 1-31`
    )
  }

  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  if (
    isNaN(hour) ||
    isNaN(minute) ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59
  ) {
    throw new Error(
      `Invalid time format: "${time}". Expected HH:mm (24-hour format, 00:00-23:59)`
    )
  }

  this.task.expression = `${minute} ${hour} ${dayOfMonth} * *`
  return this
}
```

**建議**：抽取共用驗證函數
```typescript
// src/utils/validation.ts
export function parseTime(time: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  if (
    isNaN(hour) ||
    isNaN(minute) ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59
  ) {
    throw new Error(
      `Invalid time format: "${time}". Expected HH:mm (24-hour format, 00:00-23:59)`
    )
  }

  return { hour, minute }
}
```

---

## 5. 第二階段：功能強化（P2）

### 5.1 P2-01：實現 Cron 表達式快取

**檔案**: `src/CronParser.ts`

**目標**: 避免重複解析相同的 Cron 表達式

**實現方案**（含 LRU 容量限制）:
```typescript
export class CronParser {
  // 快取已解析的表達式結果（帶時間戳）
  private static cache = new Map<string, {
    result: boolean
    timestamp: number
  }>()

  // 快取配置
  private static readonly CACHE_TTL = 60000      // 1 分鐘
  private static readonly MAX_CACHE_SIZE = 500   // 最大快取數量

  static async isDue(
    expression: string,
    timezone: string,
    date: Date
  ): Promise<boolean> {
    // 快取 key 只使用分鐘精度
    const minuteKey = `${expression}:${timezone}:${Math.floor(date.getTime() / 60000)}`

    const cached = this.cache.get(minuteKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result
    }

    // 現有解析邏輯...
    const result = await this.parseAndCheck(expression, timezone, date)

    this.cache.set(minuteKey, {
      result,
      timestamp: Date.now()
    })

    // 清理過期快取並限制容量
    this.cleanupCache()

    return result
  }

  private static cleanupCache(): void {
    const now = Date.now()

    // 1. 清理過期項目
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key)
      }
    }

    // 2. 如果仍超過容量上限，刪除最舊的項目（LRU）
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = [...this.cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toDelete = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE)
      for (const [key] of toDelete) {
        this.cache.delete(key)
      }
    }
  }

  // 提供清除快取的方法（用於測試）
  static clearCache(): void {
    this.cache.clear()
  }
}
```

---

### 5.2 P2-02：添加任務執行超時控制

**檔案**: `src/TaskSchedule.ts` 與 `src/SchedulerManager.ts`

**TaskSchedule 擴展**:
```typescript
interface ScheduledTask {
  // 現有屬性...
  timeout?: number  // 超時毫秒數
}

export class TaskSchedule {
  /**
   * 設置任務執行超時時間
   * @param ms 超時毫秒數（預設：3600000，即 1 小時）
   */
  timeout(ms: number): this {
    if (ms <= 0) {
      throw new Error('Timeout must be a positive number')
    }
    this.task.timeout = ms
    return this
  }
}
```

**SchedulerManager 修改**:

> **重要說明**：單純的 `Promise.race` 無法取消正在執行的任務，只是「放棄等待」。
> 若需要真正取消任務，callback 必須支援 `AbortSignal`。

**基礎實現（放棄等待模式，含 timer 清理）**:
```typescript
private async executeTask(task: ScheduledTask): Promise<void> {
  const timeout = task.timeout || 3600000  // 預設 1 小時
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Task "${task.name}" timed out after ${timeout}ms`))
    }, timeout)
  })

  try {
    // 注意：這只是放棄等待，task.callback() 仍會繼續執行
    await Promise.race([
      task.callback(),
      timeoutPromise
    ])
  } finally {
    // 重要：確保清理 timer，避免記憶體洩漏
    if (timeoutId) clearTimeout(timeoutId)
  }
}
```

**進階實現（支援真正取消）**:
```typescript
interface TaskCallbackOptions {
  signal?: AbortSignal
}

type TaskCallback = (options?: TaskCallbackOptions) => Promise<void>

private async executeTask(task: ScheduledTask): Promise<void> {
  const timeout = task.timeout || 3600000
  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort()
    this.logger?.warn(
      `[Horizon] Task "${task.name}" timed out after ${timeout}ms, aborting...`
    )
  }, timeout)

  try {
    // callback 需要支援 AbortSignal 才能真正中斷
    await task.callback({ signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
```

**使用範例（支援取消的任務）**:
```typescript
scheduler
  .task('cancellable-task', async ({ signal }) => {
    for (const item of items) {
      if (signal?.aborted) {
        throw new Error('Task was cancelled')
      }
      await processItem(item)
    }
  })
  .hourly()
  .timeout(300000)  // 5 分鐘超時
```

---

### 5.3 P2-03：強化分散式鎖警告

**檔案**: `src/OrbitHorizon.ts`

```typescript
async orbit(core: PlanetCore): Promise<void> {
  const config = this.config

  // 檢測是否為多機環境（透過環境變數或配置）
  const isClusterMode =
    process.env.NODE_CLUSTER === 'true' ||
    process.env.CLUSTER_MODE === 'true' ||
    config.clusterMode === true

  if (config.lockDriver === 'memory' && isClusterMode) {
    core.logger.warn(
      '[Horizon] WARNING: Using memory lock driver in cluster mode! ' +
      'This may cause duplicate task execution. ' +
      'Consider using "cache" or "redis" lock driver for distributed deployments.'
    )
  }

  // 現有邏輯...
}
```

---

### 5.4 P2-03：添加 `timezone()` 驗證

**檔案**: `src/TaskSchedule.ts`

**現況**：`timezone()` 方法直接設置時區，無效時區只會在執行時才發現錯誤。

**修復方案**:
```typescript
timezone(tz: string): this {
  // 驗證時區是否有效
  try {
    new Date().toLocaleString('en-US', { timeZone: tz })
  } catch {
    throw new Error(
      `Invalid timezone: "${tz}". ` +
      `See https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for valid values.`
    )
  }
  this.task.timezone = tz
  return this
}
```

**測試**:
```typescript
describe('TaskSchedule.timezone() validation', () => {
  it('should accept valid timezones', () => {
    const schedule = new TaskSchedule('test', () => {})
    expect(() => schedule.timezone('Asia/Taipei')).not.toThrow()
    expect(() => schedule.timezone('UTC')).not.toThrow()
    expect(() => schedule.timezone('America/New_York')).not.toThrow()
  })

  it('should reject invalid timezones', () => {
    const schedule = new TaskSchedule('test', () => {})
    expect(() => schedule.timezone('Invalid/Timezone')).toThrow(/Invalid timezone/)
    expect(() => schedule.timezone('ABC')).toThrow(/Invalid timezone/)
  })
})
```

---

### 5.5 P2-04：添加 `cron()` 表達式驗證

**檔案**: `src/TaskSchedule.ts`

**現況**：`cron()` 方法直接設置表達式，無任何格式驗證。

**修復方案**:
```typescript
cron(expression: string): this {
  const parts = expression.trim().split(/\s+/)

  if (parts.length !== 5) {
    throw new Error(
      `Invalid cron expression: "${expression}". ` +
      `Expected 5 parts (minute hour day month weekday), got ${parts.length}.`
    )
  }

  // 基本格式驗證（可選：更嚴格的驗證）
  const patterns = [
    /^(\*|[0-9,\-\/]+)$/,  // minute
    /^(\*|[0-9,\-\/]+)$/,  // hour
    /^(\*|[0-9,\-\/]+)$/,  // day
    /^(\*|[0-9,\-\/]+)$/,  // month
    /^(\*|[0-9,\-\/]+)$/   // weekday
  ]

  for (let i = 0; i < 5; i++) {
    if (!patterns[i].test(parts[i])) {
      throw new Error(
        `Invalid cron expression: "${expression}". ` +
        `Part ${i + 1} ("${parts[i]}") contains invalid characters.`
      )
    }
  }

  this.task.expression = expression
  return this
}
```

**測試**:
```typescript
describe('TaskSchedule.cron() validation', () => {
  it('should accept valid expressions', () => {
    const schedule = new TaskSchedule('test', () => {})
    expect(() => schedule.cron('* * * * *')).not.toThrow()
    expect(() => schedule.cron('0 0 * * *')).not.toThrow()
    expect(() => schedule.cron('*/5 9-17 * * 1-5')).not.toThrow()
  })

  it('should reject invalid expressions', () => {
    const schedule = new TaskSchedule('test', () => {})
    expect(() => schedule.cron('* * *')).toThrow(/Expected 5 parts/)
    expect(() => schedule.cron('* * * * * *')).toThrow(/Expected 5 parts/)
    expect(() => schedule.cron('abc * * * *')).toThrow(/invalid characters/)
  })
})
```

---

### 5.6 P2-05：邊界測試補充

**新增測試檔案**: `tests/edge-cases.test.ts`

> **注意**：以下測試代碼已根據實際 API 修正。

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'
import { TaskSchedule } from '../src/TaskSchedule'
import { CronParser } from '../src/CronParser'
import { SimpleCronParser } from '../src/SimpleCronParser'

describe('Edge Cases', () => {
  describe('TaskSchedule.at() edge cases', () => {
    let schedule: TaskSchedule

    beforeEach(() => {
      // 正確的建構函數調用：(name: string, callback: Function)
      schedule = new TaskSchedule('test-task', () => {})
    })

    it('should handle midnight correctly', () => {
      schedule.daily().at('00:00')
      expect(schedule.getTask().expression).toBe('0 0 * * *')
    })

    it('should handle end of day correctly', () => {
      schedule.daily().at('23:59')
      expect(schedule.getTask().expression).toBe('59 23 * * *')
    })

    it('should reject invalid hour 24', () => {
      expect(() => schedule.daily().at('24:00')).toThrow(/Invalid time format/)
    })

    it('should reject negative values', () => {
      expect(() => schedule.daily().at('-1:30')).toThrow(/Invalid time format/)
    })

    it('should reject non-numeric input', () => {
      expect(() => schedule.daily().at('abc:def')).toThrow(/Invalid time format/)
    })
  })

  describe('TaskSchedule.hourlyAt() edge cases', () => {
    it('should accept valid minutes', () => {
      const schedule = new TaskSchedule('test', () => {})
      expect(() => schedule.hourlyAt(0)).not.toThrow()
      expect(() => schedule.hourlyAt(59)).not.toThrow()
    })

    it('should reject invalid minutes', () => {
      const schedule = new TaskSchedule('test', () => {})
      expect(() => schedule.hourlyAt(-1)).toThrow(/Invalid minute/)
      expect(() => schedule.hourlyAt(60)).toThrow(/Invalid minute/)
      expect(() => schedule.hourlyAt(1.5)).toThrow(/Invalid minute/)
    })
  })

  describe('CronParser edge cases', () => {
    it('should handle timezone edge case (DST transition)', async () => {
      // 夏令時轉換測試
      const dstDate = new Date('2024-03-10T02:30:00')
      const result = await CronParser.isDue(
        '30 2 * * *',
        'America/New_York',
        dstDate
      )
      // DST 期間 2:30 可能不存在，應返回 boolean
      expect(typeof result).toBe('boolean')
    })

    it('should handle leap year Feb 29', async () => {
      const leapDate = new Date('2024-02-29T12:00:00')
      const result = await CronParser.isDue(
        '0 12 29 2 *',
        'UTC',
        leapDate
      )
      expect(result).toBe(true)
    })
  })

  describe('SimpleCronParser edge cases', () => {
    it('should throw on empty expression', () => {
      // 注意：SimpleCronParser 對無效表達式會拋出錯誤，而非返回 false
      expect(() => SimpleCronParser.isDue('', new Date())).toThrow()
    })

    it('should throw on malformed expression', () => {
      // 修正：實際行為是拋出錯誤
      expect(() => SimpleCronParser.isDue('not a cron', new Date())).toThrow(/Invalid cron expression/)
    })

    it('should handle very large step values', () => {
      const result = SimpleCronParser.isDue(
        '*/100 * * * *',
        new Date('2024-01-01T00:00:00')
      )
      expect(result).toBe(true) // minute 0 matches */100
    })
  })
})
```

---

## 6. 第三階段：長期優化（P3）

### 6.1 P3-01：任務重試機制

**新增介面與實現**:

```typescript
// src/TaskSchedule.ts
interface RetryConfig {
  times: number      // 重試次數
  delay: number      // 重試間隔（毫秒）
  backoff?: 'linear' | 'exponential'  // 退避策略
}

export class TaskSchedule {
  /**
   * 配置任務重試策略
   * @param times 重試次數
   * @param delay 重試間隔（毫秒）
   * @param backoff 退避策略（預設：exponential）
   */
  retry(times: number, delay: number, backoff: 'linear' | 'exponential' = 'exponential'): this {
    this.task.retry = { times, delay, backoff }
    return this
  }
}

// src/SchedulerManager.ts
private async executeWithRetry(
  task: ScheduledTask,
  attempt = 0
): Promise<void> {
  try {
    await this.executeTask(task)
  } catch (error) {
    const retry = task.retry
    if (retry && attempt < retry.times) {
      const delay = retry.backoff === 'exponential'
        ? retry.delay * Math.pow(2, attempt)
        : retry.delay

      this.logger?.warn(
        `[Horizon] Task "${task.name}" failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retry.times})`,
        error
      )

      await new Promise(resolve => setTimeout(resolve, delay))
      return this.executeWithRetry(task, attempt + 1)
    }
    throw error
  }
}
```

**使用範例**:
```typescript
scheduler
  .task('sync-data', async () => {
    await externalApi.sync()
  })
  .hourly()
  .retry(3, 5000, 'exponential')  // 最多重試 3 次，5s/10s/20s 間隔
```

---

### 6.2 P3-02：執行指標監控

**新增檔案**: `src/metrics/TaskMetrics.ts`

```typescript
export interface TaskExecutionMetrics {
  taskName: string
  startTime: Date
  endTime: Date
  duration: number
  success: boolean
  error?: string
  retryCount: number
}

export class TaskMetricsCollector {
  private metrics: TaskExecutionMetrics[] = []
  private readonly maxHistory = 1000

  record(metric: TaskExecutionMetrics): void {
    this.metrics.push(metric)
    if (this.metrics.length > this.maxHistory) {
      this.metrics.shift()
    }
  }

  getStats(taskName?: string): {
    total: number
    success: number
    failed: number
    avgDuration: number
  } {
    const filtered = taskName
      ? this.metrics.filter(m => m.taskName === taskName)
      : this.metrics

    const success = filtered.filter(m => m.success).length
    const avgDuration = filtered.length > 0
      ? filtered.reduce((sum, m) => sum + m.duration, 0) / filtered.length
      : 0

    return {
      total: filtered.length,
      success,
      failed: filtered.length - success,
      avgDuration
    }
  }

  getRecentFailures(limit = 10): TaskExecutionMetrics[] {
    return this.metrics
      .filter(m => !m.success)
      .slice(-limit)
  }
}
```

---

### 6.3 P3-03：文檔補充

**更新 README.md 添加章節**:

```markdown
## 進階用法

### Fire-and-Forget 執行模式

當任務設置為背景執行時（`background: true`），排程器會：
1. 立即返回，不等待任務完成
2. 任務失敗只記錄錯誤，不影響其他任務
3. 不會阻塞排程器主迴圈

適用場景：
- 長時間執行的批次處理
- 可容忍失敗的非關鍵任務
- 需要高吞吐量的場景

### 分散式鎖的一致性保證

horizon 使用 TTL-based 鎖機制：
- 成功執行的任務會持有鎖直到 TTL 過期
- 失敗的任務會立即釋放鎖
- TTL 預設為 300 秒（5 分鐘）

一致性保證：
- 單點執行：保證同一時刻只有一個節點執行任務
- 故障容錯：如果持有鎖的節點崩潰，TTL 過期後其他節點可接管
- 非 exactly-once：在極端情況下可能有 at-least-once 語義
```

---

## 7. 測試改善計劃

### 7.1 測試覆蓋目標

| 類型 | 現況 | 目標 |
|------|------|------|
| 語句覆蓋率 | ~60% | 80% |
| 分支覆蓋率 | ~55% | 75% |
| 函數覆蓋率 | ~70% | 85% |

### 7.2 新增測試清單

| 測試檔案 | 測試內容 | 優先級 |
|----------|----------|--------|
| `edge-cases.test.ts` | 邊界條件測試 | P2 |
| `integration.test.ts` | OrbitHorizon 整合測試 | P2 |
| `concurrency.test.ts` | 並發鎖競合測試 | P3 |
| `metrics.test.ts` | 指標收集測試 | P3 |

### 7.3 測試執行命令

```bash
# 執行所有測試
bun test

# 執行並生成覆蓋率報告
bun test --coverage

# 執行特定測試檔案
bun test tests/edge-cases.test.ts
```

---

## 8. 文檔更新計劃

### 8.1 需更新的文檔

| 文檔 | 更新內容 | 優先級 |
|------|----------|--------|
| README.md | 添加進階用法章節 | P2 |
| README.zh-TW.md | 同步更新繁體中文版 | P2 |
| CHANGELOG.md | 記錄版本變更 | P1 |
| JSDoc 註解 | 補充公開 API 文檔 | P3 |

### 8.2 CHANGELOG 更新範本

```markdown
## [3.1.0] - YYYY-MM-DD

### BREAKING CHANGES
- `at()`, `hourlyAt()`, `dailyAt()`, `weeklyOn()`, `monthlyOn()` 方法現在會驗證輸入
  - 無效輸入將拋出 Error 而非靜默產生無效表達式
  - 遷移指南：確保時間格式為 "HH:mm"（24 小時制，00:00-23:59）

### Fixed
- 修復 `TaskSchedule.at()` 無效時間格式導致 NaN 表達式的問題 (#P1-01)
- 修復 `hourlyAt()`, `dailyAt()`, `weeklyOn()`, `monthlyOn()` 同樣的驗證問題 (#P1-03)

### Added
- 到期任務的詳細日誌記錄 (#P1-02)

## [3.2.0] - YYYY-MM-DD

### Added
- Cron 表達式解析結果快取機制（含 LRU 容量限制）(#P2-01)
- 任務執行超時控制 `timeout()` 方法 (#P2-02)
- `timezone()` 時區有效性驗證 (#P2-03)
- `cron()` 表達式格式驗證 (#P2-04)
- 分散式環境使用記憶體鎖的警告 (#P2-06)

### Changed
- 提升測試覆蓋率至 80%
```

---

## 9. 執行時程與里程碑

### 9.1 階段規劃

```
┌─────────────────────────────────────────────────────────────────────┐
│ 第一階段 (P1)：緊急修復                                              │
├─────────────────────────────────────────────────────────────────────┤
│ • P1-01: 修復 at() 輸入驗證                                          │
│ • P1-02: 添加任務日誌記錄                                            │
│ • P1-03: 修復 hourlyAt/dailyAt/weeklyOn/monthlyOn 驗證               │
│ • 更新 CHANGELOG                                                     │
│ • 提交 PR 並發布 minor 版本（含 breaking changes）                    │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 第二階段 (P2)：功能強化                                              │
├─────────────────────────────────────────────────────────────────────┤
│ • P2-01: 實現 Cron 快取（含 LRU）                                     │
│ • P2-02: 添加超時控制                                                │
│ • P2-03: 添加 timezone() 驗證                                        │
│ • P2-04: 添加 cron() 驗證                                            │
│ • P2-05: 補充邊界測試                                                │
│ • P2-06: 強化分散式警告                                              │
│ • 更新文檔                                                           │
│ • 提交 PR 並發布 minor 版本                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 第三階段 (P3)：長期優化                                              │
├─────────────────────────────────────────────────────────────────────┤
│ • P3-01: 實現重試機制                                                │
│ • P3-02: 添加執行指標                                                │
│ • P3-03: 完善文檔                                                    │
│ • 發布 minor 版本                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 里程碑與時程估計

| 里程碑 | 目標版本 | 完成標準 | 預估工時 | 人力需求 |
|--------|----------|----------|----------|----------|
| M1 | v3.1.0 | P1 全部完成，測試通過（含 breaking changes） | 1-2 天 | 1 人 |
| M2 | v3.2.0 | P2 全部完成，覆蓋率 ≥ 80% | 3-5 天 | 1 人 |
| M3 | v3.3.0 | P3 全部完成，文檔完整 | 5-7 天 | 1 人 |

### 9.3 任務依賴關係

```
P1-01 (at 驗證)     ──┐
P1-02 (日誌)        ──┼─→ P1 測試 ─→ M1 發布 (v3.1.0)
P1-03 (相關方法驗證) ──┘
                       ↓
P2-01 (Cron 快取)   ──┐
P2-02 (超時控制)    ──┤
P2-03 (timezone驗證) ─┼─→ P2 測試 + 邊界測試 ─→ M2 發布 (v3.2.0)
P2-04 (cron驗證)    ──┤
P2-05 (邊界測試)    ──┤
P2-06 (警告強化)    ──┘
                       ↓
P3-01 (重試機制)    ──┐
P3-02 (執行指標)    ──┼─→ P3 測試 + 文檔更新 ─→ M3 發布 (v3.3.0)
P3-03 (文檔補充)    ──┘
```

### 9.4 驗收標準

| 階段 | 驗收標準 |
|------|----------|
| M1 | 所有 P1 修復完成、單元測試通過、無 regression |
| M2 | 所有 P2 功能完成、測試覆蓋率 ≥ 80%、效能無退化 |
| M3 | 所有 P3 功能完成、文檔完整、API 穩定 |

---

## 10. 風險評估

### 10.1 技術風險

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|----------|
| Cron 快取導致記憶體洩漏 | 低 | 中 | 實現 LRU + TTL 清理機制（已規劃） |
| 超時中斷導致資源洩漏 | 低 | 高 | 使用 AbortController + clearTimeout |
| 重試機制導致重複執行 | 中 | 高 | 確保冪等性或使用鎖 |
| 任務執行超過檢查週期（1分鐘） | 中 | 中 | 使用 `withoutOverlapping()` 或設定 `timeout()` |
| 靜態快取在多執行緒環境的競態 | 低 | 低 | Bun/Node 單執行緒，風險極低 |

### 10.2 相容性風險

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|----------|
| at() 驗證破壞現有使用 | 低 | 中 | 提供詳細錯誤訊息 |
| 新增方法名稱衝突 | 極低 | 低 | 使用描述性命名 |

### 10.3 測試風險

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|----------|
| 並發測試不穩定 | 中 | 中 | 使用確定性測試策略 |
| 時區測試在 CI 失敗 | 中 | 低 | 使用 UTC 或 mock 時區 |

---

## 11. 安全性考量

### 11.1 Shell 命令注入風險

**檔案**: `src/process/Process.ts`

`Process.run()` 直接執行 shell 命令，若 command 來自使用者輸入，存在命令注入風險。

**現況分析**（Process.ts:27-35）:
```typescript
// 當前實現使用 runtime adapter，支援多種運行環境
export async function runProcess(command: string): Promise<ProcessResult> {
  const runtime = getRuntimeAdapter()  // 取得當前運行時適配器
  const proc = runtime.spawn(['sh', '-c', command], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  // ...
}
```

> **注意**：雖然使用了 runtime adapter 抽象層，但底層仍透過 `sh -c` 執行命令，
> 命令注入風險依然存在。

**風險等級**: 中（取決於 command 來源）

**緩解措施**:
1. **文檔警告**：在 README 中明確說明 command 不應來自使用者輸入
2. **驗證機制**（可選）：
```typescript
// 添加指令白名單驗證
const ALLOWED_COMMANDS = ['bun', 'npm', 'node', 'pnpm']

static validateCommand(command: string): boolean {
  const [cmd] = command.split(' ')
  return ALLOWED_COMMANDS.some(allowed => cmd.startsWith(allowed))
}
```

### 11.2 敏感資訊外洩

**風險點**: 任務執行日誌可能包含敏感資訊

**緩解措施**:
- 日誌中不記錄任務 callback 的返回值
- 錯誤訊息應過濾敏感資訊（如 API keys、密碼）
- 建議使用 `core.logger` 的敏感資訊過濾功能

### 11.3 分散式鎖安全

**風險點**: 鎖的 key 使用任務名稱，可能被預測

**現況**: 風險低，因為鎖操作只在內部使用，不對外暴露

**建議**: 若未來需要更高安全性，可考慮在鎖 key 中加入隨機前綴

---

## 12. 向後相容性

### 12.1 Breaking Changes 分析

#### P1-01: `at()` 方法驗證

| 面向 | 舊行為 | 新行為 |
|------|--------|--------|
| 無效輸入 | 靜默產生 NaN 表達式 | 拋出 Error |
| 影響 | 任務不會執行（靜默失敗） | 立即報錯（早期失敗） |

**遷移指南**:
```typescript
// 檢查現有程式碼中的 at() 呼叫
// 確保時間格式為 "HH:mm"（24 小時制）

// 錯誤範例（將會拋出錯誤）
.at('9:30')   // 缺少前導零
.at('25:00')  // 無效小時
.at('12:60')  // 無效分鐘

// 正確範例
.at('09:30')  // 正確
.at('23:59')  // 正確
.at('00:00')  // 正確
```

#### P1-03: `hourlyAt()`, `dailyAt()`, `weeklyOn()`, `monthlyOn()` 驗證

同樣的 breaking change 適用於這些方法。

**建議**:
- 在 CHANGELOG 中明確標記為 Breaking Change
- 在發布說明中提供遷移指南
- 考慮提供 `strict: false` 選項以保持舊行為（不建議）

### 12.2 非 Breaking Changes

以下變更不影響現有程式碼：
- P1-02: 日誌記錄（只增加輸出，不改變行為）
- P2-01: Cron 快取（內部優化，無 API 變更）
- P2-02: 超時控制（新增可選方法）
- P2-03: timezone 驗證（新增驗證，無效值原本也會在執行時失敗）
- P2-04: cron 驗證（新增驗證，Breaking Change）
- P2-05: 邊界測試（只增加測試）
- P2-06: 警告訊息（只增加日誌）
- P3-*: 所有長期優化都是新增功能

### 12.3 版本策略

| 變更類型 | 版本影響 | 說明 |
|----------|----------|------|
| P1 修復 | **minor (x.X.0)** | 含 breaking change（輸入驗證會拋出錯誤） |
| P2 功能 | minor (x.X.0) | 新增功能，P2-03/P2-04 有輕微 breaking change |
| P3 優化 | minor (x.X.0) | 新增功能，無 breaking change |

> **重要**：由於 P1 包含 breaking changes，版本號從 v3.0.1 升至 v3.1.0，
> 而非 patch 版本 v3.0.2。這符合 SemVer 規範。

---

## 13. 效能基準測試

### 13.1 基準測試計劃

| 測試項目 | 測試方法 | 基準值 | 目標值 |
|----------|----------|--------|--------|
| Cron 解析（無快取） | 單次 `isDue()` 呼叫 | ~2ms | - |
| Cron 解析（有快取） | 快取命中時 `isDue()` | - | <0.1ms |
| 任務排程迴圈 | 1000 任務的 `run()` | - | <100ms |
| 鎖取得（記憶體） | `acquire()` 呼叫 | - | <1ms |
| 鎖取得（快取） | `acquire()` 呼叫 | - | <10ms |

### 13.2 測試腳本

```typescript
// benchmarks/cron-parser.bench.ts
import { bench, run } from 'mitata'
import { CronParser } from '../src/CronParser'

bench('CronParser.isDue (uncached)', async () => {
  await CronParser.isDue('*/5 * * * *', 'UTC', new Date())
})

bench('CronParser.isDue (cached)', async () => {
  // 第二次呼叫應命中快取
  await CronParser.isDue('*/5 * * * *', 'UTC', new Date())
})

await run()
```

### 13.3 效能監控指標

實作 P3-02 後，應監控以下指標：

| 指標 | 說明 | 警告閾值 |
|------|------|----------|
| `task.duration.avg` | 平均執行時間 | 視任務而定 |
| `task.failure.rate` | 失敗率 | > 5% |
| `scheduler.loop.duration` | 排程迴圈耗時 | > 1000ms |
| `lock.acquire.duration` | 鎖取得耗時 | > 100ms |

---

## 14. 回滾計劃

### 14.1 發布後問題處理

若發布後發現重大問題：

**步驟 1：評估影響**
- 確認問題影響範圍
- 評估是否需要緊急回滾

**步驟 2：緊急回滾（若需要）**
```bash
# 標記問題版本為 deprecated
npm deprecate @gravito/horizon@3.1.0 "Critical bug found, please use 3.0.1"

# 發布 hotfix 恢復舊行為
git revert <commit-hash>
npm publish --tag hotfix
```

**步驟 3：通知使用者**
- 在 GitHub Releases 中標記問題版本
- 發送通知給已知的大型使用者
- 更新 README 中的已知問題

### 14.2 回滾版本對照

| 問題版本 | 回滾至 | 說明 |
|----------|--------|------|
| v3.1.0 | v3.0.1 | 若 P1 修復（breaking changes）導致問題 |
| v3.2.0 | v3.1.0 | 若 P2 功能導致問題 |
| v3.3.0 | v3.2.0 | 若 P3 功能導致問題 |

### 14.3 回滾測試

在發布前，確保回滾程序已測試：

```bash
# 模擬回滾流程
npm pack  # 打包當前版本
npm install @gravito/horizon@<previous-version>
bun test  # 確認舊版本測試通過
```

### 14.4 Feature Flag 策略（可選）

對於風險較高的變更，可考慮使用 feature flag：

```typescript
// 環境變數控制
const ENABLE_STRICT_VALIDATION = process.env.HORIZON_STRICT_VALIDATION !== 'false'

at(time: string): this {
  if (ENABLE_STRICT_VALIDATION) {
    // 新驗證邏輯
  } else {
    // 舊行為（deprecated warning）
    console.warn('[Horizon] Strict validation disabled. This will be removed in v4.0')
  }
}
```

---

## 附錄

### A. 檔案變更清單

| 檔案路徑 | 變更類型 | 階段 |
|----------|----------|------|
| `src/TaskSchedule.ts` | 修改 | P1, P2, P3 |
| `src/SchedulerManager.ts` | 修改 | P1, P2, P3 |
| `src/CronParser.ts` | 修改 | P2 |
| `src/OrbitHorizon.ts` | 修改 | P2 |
| `src/utils/validation.ts` | 新增 | P1 |
| `src/metrics/TaskMetrics.ts` | 新增 | P3 |
| `tests/edge-cases.test.ts` | 新增 | P2 |
| `tests/integration.test.ts` | 新增 | P2 |
| `tests/time-validation.test.ts` | 新增 | P1 |
| `benchmarks/cron-parser.bench.ts` | 新增 | P2 |
| `README.md` | 修改 | P2, P3 |
| `CHANGELOG.md` | 修改 | P1, P2, P3 |

### B. 相關資源

- [Cron 表達式參考](https://crontab.guru/)
- [分散式鎖最佳實踐](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Gravito 框架文檔](../../../README.md)

---

**文檔版本**: 1.2
**最後更新**: 2025-01-23
**作者**: Claude Code + Carl
**審查狀態**: 二審完成
**審查記錄**:
- v1.0: 初版（評分 8.1/10）
- v1.1: 一審補強 - 補充安全性、相容性、時程、回滾計劃（評分 8.5/10）
- v1.2: 二審補強 - 修正代碼範例、補充遺漏項目、調整版本策略（評分 8.8/10）
