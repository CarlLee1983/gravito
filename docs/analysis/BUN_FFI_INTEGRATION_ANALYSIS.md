# Gravito 框架 bun:ffi (C 編譯器) 整合分析報告

**分析日期**: 2026-02-24
**分支**: `feat/bun-c-compiler-analysis`
**分析模型**: Claude Opus 4.6

---

## 1. 性能瓶頸識別

基於對框架關鍵模組的深入分析，識別出 5 個 CPU 密集型瓶頸，按優化收益排序。

### 瓶頸 A：序列化/反序列化（收益：極高 ⭐⭐⭐⭐⭐）

**位置**: `packages/stream/src/serializers/BinarySerializer.ts`

**現狀**: 使用 JavaScript 實現的 `cborg` 進行 CBOR 編碼。`MessagePackSerializer.ts` 使用 `@msgpack/msgpack`（同為 JS 實現）。這些序列化器在每次 Job 通過 Redis/RabbitMQ 傳輸時都被調用。

**瓶頸分析**:
- 序列化器處於 Stream 包的 **熱路徑**（每個 Job 至少經過 2 次序列化 + 2 次反序列化）
- `cborg` 和 `@msgpack/msgpack` 都是純 JavaScript 實現
- 在高吞吐場景（限時促銷 flash-sale、批次處理 mass）下，這是主要的 CPU 消耗點

**預估收益**: C 層 CBOR/MessagePack 實現可達 **5-15x** 的序列化速度提升。

---

### 瓶頸 B：雜湊與加密操作（收益：高 ⭐⭐⭐⭐）

**位置**:
- `packages/core/src/security/Encrypter.ts`
- `packages/stasis/src/stores/FileStore.ts` 第 631 行的 `hashKey()` 函數
- `packages/core/src/helpers/Str.ts` 第 133 行的 `random()`

**現狀**:
- FileStore 的每次 `get`/`put` 操作都需要 SHA-256 雜湊（用於檔案路徑映射）
- Encrypter 在每次加密操作中進行 2 次密碼學操作（AES + HMAC）
- 雖然 `node:crypto` 底層已有 C 綁定，但 FFI 可以減少 JS-C 橋接開銷

**預估收益**: 對於小 payload（<1KB）的雜湊操作，直接 FFI 調用可減少 **30-50%** 延遲（消除 Node.js 綁定層的間接成本）。

---

### 瓶頸 C：LRU Cache 鏈結串列操作（收益：中 ⭐⭐⭐）

**位置**: `packages/stasis/src/utils/LRUCache.ts`

**現狀**: 使用純 JavaScript 雙向鏈結串列 + Map 實現 LRU。

**瓶頸分析**:
- 在高頻率快取存取場景（如 PredictiveStore、TieredStore），`moveToHead()` 和 `evict()` 會產生大量 GC 壓力（頻繁的 Node 物件分配/釋放）
- JavaScript 物件的記憶體開銷大（每個 LRUNode 約 80-120 bytes，而 C 結構體可壓縮到 24 bytes）

**預估收益**: C 層實現可減少 **60-70%** 的記憶體佔用，並降低 GC 暫停。

---

### 瓶頸 D：事件模式匹配與去重（收益：中低 ⭐⭐）

**位置**: `packages/core/src/events/aggregation/DeduplicationManager.ts`

**現狀**: 使用 RegExp 進行模式匹配，並維護 Map 進行去重。

**瓶頸分析**:
- `patternToRegex()` 每次遇到新模式都要編譯 RegExp
- `findEventsByPattern()` 需要遍歷所有 patternMap 條目
- 在高事件吞吐量場景下可能成為瓶頸

---

### 瓶頸 E：Radix 路由匹配（收益：低 ⭐）

**位置**: `packages/core/src/adapters/bun/RadixNode.ts`

**現狀**: 使用純 JS Radix Tree。

**瓶頸分析**:
- 路由匹配通常在請求處理的早期階段，影響每次 HTTP 請求
- 但實際匹配時間相對於整個請求處理鏈非常短（通常 <0.1ms）
- 除非達到極高 QPS（>100K），否則不值得 FFI 優化

---

## 2. 整合策略：不破壞模組隔離原則

### 架構設計：FFI Acceleration Layer

```
Galaxy Architecture 新增層：

PlanetCore (@gravito/core)
  └── binary/       ← 已有 BinaryUtils
  └── ffi/          ← 新增：FFI 加速層（運行時感知）
        ├── NativeAccelerator.ts     ← 統一入口
        ├── fallback.ts              ← 純 JS 回退實現
        └── native/
              ├── hash.c             ← SHA-256 加速
              ├── cbor.c             ← CBOR 編碼加速
              └── lru.c              ← LRU Cache 加速
```

### 核心設計原則

**原則 1：運行時自適應（Runtime-Adaptive）**

與現有 BinaryUtils 和 WorkerFactory 的模式保持一致 -- Gravito 已建立了運行時偵測模式（`getRuntimeAdapter()`）。FFI 層應該沿用相同模式：

```typescript
// packages/core/src/ffi/NativeAccelerator.ts
export class NativeAccelerator {
  private static available: boolean | null = null

  static isAvailable(): boolean {
    if (this.available === null) {
      this.available = typeof Bun !== 'undefined'
        && typeof Bun.cc === 'function'
    }
    return this.available
  }

  static getHasher(): HashAccelerator {
    return this.isAvailable()
      ? new NativeHashAccelerator()
      : new JsFallbackHashAccelerator()
  }
}
```

**原則 2：零依賴、零破壞**

FFI 加速始終是**可選的**。所有 FFI 加速函數都有對應的純 JS 回退實現。這確保：
- 在非 Bun 環境中正常運行
- 在 Bun 版本不支持 `bun:ffi` 時自動降級
- 單元測試不依賴 C 編譯器

**原則 3：遵守包邊界**

FFI 加速層只放在 `@gravito/core/ffi`，其他包通過 `@gravito/core` 的公開 API 使用。這遵守了 Galaxy Architecture 的「向心依賴」原則：

```
stream (BinarySerializer) ──┐
stasis (FileStore)          ├──→ core/ffi (NativeAccelerator)
plasma (BunRedisClient)     ┘
```

---

## 3. 具體改進機會（5 個候選）

### 候選 1：CBOR 原生編碼/解碼器（最高優先級 🔴）

**目標模組**: `@gravito/stream` - `BinarySerializer.ts`

**當前實現**: 使用 `cborg`（純 JS CBOR 庫）

**C 實現概要**:

```c
// packages/core/src/ffi/native/cbor.c
#include <stdint.h>
#include <string.h>

// 極簡 CBOR 編碼器 - 針對 Gravito Job 結構優化
// 只支持 map、string、integer、float、bytes、null
typedef struct {
    uint8_t* buffer;
    size_t   capacity;
    size_t   offset;
} CborEncoder;

// 編碼整數（major type 0/1）
static void cbor_encode_uint(CborEncoder* enc, uint64_t val) {
    if (val < 24) {
        enc->buffer[enc->offset++] = (uint8_t)val;
    } else if (val <= 0xFF) {
        enc->buffer[enc->offset++] = 0x18;
        enc->buffer[enc->offset++] = (uint8_t)val;
    }
    // ... 完整實現
}
```

**Bun FFI 整合方式**:

```typescript
import { cc } from 'bun:ffi'

const { symbols } = cc({
  source: './native/cbor.c',
  define: { GRAVITO_CBOR_MAX_DEPTH: '16' },
  symbols: {
    cbor_encode_job: {
      args: ['ptr', 'usize'],  // JSON string input
      returns: 'ptr',           // CBOR bytes output
    },
    cbor_decode_job: {
      args: ['ptr', 'usize'],  // CBOR bytes input
      returns: 'ptr',           // JSON string output
    },
  },
})
```

**預估效果**:
- 序列化速度：5-15x 提升（針對典型 Job payload 500B-10KB）
- payload 體積：維持 CBOR 的 20-40% 優勢
- Worker 傳遞延遲：再降 30-50%

---

### 候選 2：SHA-256 快速雜湊（高優先級 🔴）

**目標模組**: `@gravito/stasis` - `FileStore.ts` 的 `hashKey()` 函數

**當前實現**:
```typescript
// FileStore.ts 第 631 行
function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}
```

每次快取操作（get/put/forget/ttl）都要經過這個函數。

**C 實現概要**:

```c
// packages/core/src/ffi/native/hash.c
#include <string.h>

typedef struct {
    uint32_t state[8];
    uint8_t  buffer[64];
    uint64_t count;
} SHA256_CTX;

// 對短 key 的專用快速路徑
void sha256_short(const char* input, size_t len, char* hex_output) {
    SHA256_CTX ctx;
    sha256_init(&ctx);
    sha256_update(&ctx, input, len);
    uint8_t hash[32];
    sha256_final(&ctx, hash);
    // 直接輸出 hex
    for (int i = 0; i < 32; i++) {
        hex_output[i*2]   = "0123456789abcdef"[hash[i] >> 4];
        hex_output[i*2+1] = "0123456789abcdef"[hash[i] & 0xf];
    }
    hex_output[64] = 0;
}
```

**預估效果**:
- 對於短 key（<100 bytes），比 `node:crypto` 快 2-3x（省去 N-API 橋接開銷）
- FileStore 每次操作延遲減少 10-20us

---

### 候選 3：原生 LRU Cache（中優先級 🟡）

**目標模組**: `@gravito/stasis` - `LRUCache.ts`

**當前實現**: 純 JS 雙向鏈結串列 + Map

**C 實現概要**: 使用 C 結構體陣列實現固定容量 LRU，避免 GC 壓力

```c
// packages/core/src/ffi/native/lru.c
typedef struct {
    uint32_t prev;
    uint32_t next;
    uint64_t key_hash;
    uint32_t value_offset;
    uint16_t key_len;
    uint16_t flags;
} LRUEntry;  // 20 bytes，比 JS 的 ~120 bytes 小 6 倍

typedef struct {
    LRUEntry* entries;
    uint32_t  capacity;
    uint32_t  size;
    uint32_t  head;
    uint32_t  tail;
    uint32_t* hash_table;
    uint32_t  hash_mask;
} NativeLRU;
```

**預估效果**:
- 記憶體佔用減少 60-70%
- GC 暫停時間顯著降低
- get/set 操作延遲降低 40-60%

---

### 候選 4：Redis Protocol 編碼加速（中低優先級 🟡）

**目標模組**: `@gravito/plasma` - `BunRedisClient.ts`

**C 實現概要**: 直接構建 RESP3 二進制協議，避免字串拼接

```c
// 直接構建 RESP3 二進制協議
size_t resp3_encode_array(char* buf, size_t capacity,
                          const char** commands, size_t count) {
    size_t offset = 0;
    buf[offset++] = '*';
    offset += itoa_fast(count, buf + offset);
    buf[offset++] = '\r'; buf[offset++] = '\n';
    // ... 批量編碼
    return offset;
}
```

**預估效果**:
- Pipeline 操作速度提升 2-3x
- 減少批量操作的字串分配

---

### 候選 5：事件 Bloom Filter 去重（低優先級 🠠）

**目標模組**: `@gravito/core` - `DeduplicationManager.ts`

**當前實現**: 使用 `Map<string, EventTask>` 精確去重

**C 實現概要**: 使用 C 層 Bloom Filter 作為快速預篩選層

**預估效果**:
- 查詢延遲從 O(n) Map 遍歷降低到 O(1) Bloom 檢查
- 在高事件吞吐量下（>10K events/s）可減少 50% 的 Map 操作

---

## 4. 架構風險與緩解方案

### 風險 1：平台可移植性喪失 -- 嚴重性：高 🔴

**描述**: bun:ffi 的 C 編譯器依賴 TinyCC，僅支持 Linux/macOS x64/arm64。在其他平台或非 Bun 環境中完全無法使用。

**緩解方案**:
- **強制回退機制**: 每個 FFI 加速函數都必須有對應的純 JS 實現
- **Feature Detection**: 使用 `typeof Bun?.cc === 'function'` 在啟動時偵測
- **CI 矩陣測試**: 同時在 Bun（有 FFI）和 Node.js（無 FFI）環境下運行測試
- **效能標記**: 透過 `@gravito/monitor` 記錄是否使用了 FFI 加速，便於診斷

---

### 風險 2：記憶體安全問題 -- 嚴重性：高 🔴

**描述**: C 代碼中的 buffer overflow、use-after-free 等問題可能導致整個 Bun 程序崩潰。

**緩解方案**:
- **邊界檢查**: 所有 C 函數在入口處檢查 buffer 大小
- **固定大小 buffer**: 對輸出使用預分配的固定大小 buffer（如 SHA-256 永遠是 64 字元 hex）
- **模糊測試**: 為 C 代碼編寫 fuzz test
- **Sanitizer 測試**: 在 CI 中使用 AddressSanitizer 和 UndefinedBehaviorSanitizer
- **限制 C 代碼範圍**: 只實現純計算函數，不在 C 中進行記憶體分配

---

### 風險 3：調試困難 -- 嚴重性：中 🟡

**描述**: FFI 調用鏈中的錯誤難以追蹤，堆疊資訊可能不完整。

**緩解方案**:
- **包裝層錯誤處理**: TypeScript 包裝層捕獲所有 FFI 異常並轉換為標準錯誤
- **除錯模式**: 提供 `GRAVITO_FFI_DEBUG=1` 環境變量，啟用詳細日誌
- **性能計數器**: 透過 EventMetrics 追蹤 FFI 調用次數和延遲

---

### 風險 4：TinyCC 限制 -- 嚴重性：中 🟡

**描述**: TinyCC 不支持某些 C 特性（如 SSE/AVX intrinsics、某些 C11 特性），且優化等級有限。

**緩解方案**:
- **保持代碼簡單**: 只使用 C99 標準特性，不依賴編譯器優化
- **手動展開關鍵循環**: 在 SHA-256 和 CBOR 編碼的內層循環手動展開
- **必要時使用預編譯庫**: 對於需要高度優化的部分，使用 `dlopen` 方式鏈接預編譯的 `.so/.dylib`

---

### 風險 5：維護成本增加 -- 嚴重性：中 🟡

**描述**: 框架現有的 64 個包全部是 TypeScript，引入 C 代碼增加了技術棧複雜度。

**緩解方案**:
- **最小化 C 代碼量**: 限制 C 代碼在 500 行以內
- **完整的 JS 回退**: C 代碼可以隨時移除，不影響功能
- **獨立模組**: 所有 C 代碼集中在 `core/ffi/native/` 目錄
- **文檔與註解**: C 代碼必須有詳盡的繁體中文註解

---

## 5. 實現路線圖

### Phase 1：CBOR 原生編碼（2 週）-- 最高 ROI

**目標**: 替換 `BinarySerializer.ts` 中的 `cborg` JavaScript 實現

**具體任務**:
1. 在 `packages/core/src/ffi/` 建立 FFI 基礎設施
   - `NativeAccelerator.ts`：統一入口 + 運行時偵測
   - `types.ts`：FFI 類型定義
2. 實現 `native/cbor.c`（~200 行）
   - 支持：map、string、uint、float64、bytes、null、boolean
   - 針對 Gravito Job 結構的典型 payload 優化
3. 實現 `CborNativeSerializer.ts`
   - 實現 `JobSerializer` 介面
   - 自動偵測並使用 FFI 或回退到 `cborg`
4. 修改 `BinarySerializer.ts`
   - 優先使用 `NativeAccelerator.getCborSerializer()`
5. 基準測試
   - 擴展 `/packages/stream/tests/benchmarks/` 中現有的基準測試
   - 對比 JSON vs cborg vs Native CBOR
6. 整合測試
   - 確保 RedisDriver、RabbitMQDriver、BunWorker 正常工作

**驗收標準**:
- 序列化速度 >= 5x 提升（vs cborg）
- 所有現有 BinarySerializer 測試通過
- 在 Bun 和非 Bun 環境下均可運行

---

### Phase 2：雜湊加速 + LRU 優化（2 週）

**目標**: 加速 FileStore 的 SHA-256 雜湊和 Stasis 的 LRU 快取

**具體任務**:
1. 實現 `native/hash.c`（~150 行）
2. 實現 `NativeHasher.ts`
3. 修改 FileStore 的 `hashKey()` 使用 NativeHasher
4. 實現 `native/lru.c`（~200 行）
5. 實現 `NativeLRUCache.ts`
6. 修改 Stasis 包使用 NativeLRU（可選配置）

**驗收標準**:
- hashKey 延遲 <= 現有的 50%
- LRU 記憶體佔用 <= 現有的 40%
- 所有 FileStore 和 LRUCache 測試通過

---

### Phase 3：進階整合 + 生態系統（2 週）

**目標**: Redis 協議加速、Bloom Filter、整合觀測性

**具體任務**:
1. Redis Pipeline RESP3 編碼加速
2. Bloom Filter 預篩選層整合到 DeduplicationManager
3. 透過 `@gravito/monitor` 整合 FFI 性能計數器
4. 在 `@gravito/scaffold` 中新增 FFI 配置選項
5. 文檔更新

**驗收標準**:
- Pipeline 批量操作 >= 2x 提升
- 完整的觀測性指標
- 文檔和配置系統完善

---

## 架構決策記錄（ADR）

### ADR: 在 @gravito/core 中引入 bun:ffi 加速層

**Context**: Gravito 框架在 Stream 序列化、Stasis 快取、和 Plasma Redis 通訊等熱路徑上存在 CPU 密集型操作。已完成的 Phase 1-2 Bun 二進制數據優化（CBOR + BinaryUtils）奠定了二進制處理基礎，但序列化層仍使用純 JavaScript 實現。

**Decision**: 在 `@gravito/core/ffi` 建立運行時自適應的 FFI 加速層，使用 Bun 的 C 編譯器（TinyCC）直接編譯和執行性能關鍵的 C 代碼。所有加速函數必須有純 JS 回退。

**Consequences**:

| 面向 | 正面 | 負面 |
|------|------|------|
| **性能** | 序列化 5-15x、雜湊 2-3x、LRU 記憶體 -60% | TinyCC 優化有限，不如 GCC/Clang |
| **維護** | 集中在 core 包、代碼量小（<500 行 C） | 增加技術棧複雜度、需要 C 知識 |
| **可移植** | 純 JS 回退確保跨平台 | Bun 專屬特性，非 Bun 環境無加速 |
| **安全** | 純計算函數、無記憶體分配 | 潛在的記憶體安全風險 |
| **架構** | 遵守 Galaxy Architecture 向心依賴 | 新概念（FFI 層）需要團隊學習 |

**Status**: 已批准，開始 Phase 1

---

## 總結

Gravito 框架最有價值的 bun:ffi 整合點是 **CBOR 序列化加速**（Phase 1），因為它處於 Stream 包的絕對熱路徑，且現有實現（純 JS cborg）有明確的性能上限。其次是 **SHA-256 雜湊加速**（Phase 2），因為 FileStore 的每次操作都依賴它。

關鍵架構原則是：FFI 加速層必須是**可選的、透明的、向心依賴的**。它放在 `@gravito/core/ffi`，其他包通過公開 API 使用，不感知底層是 C 還是 JavaScript 實現。這與框架已建立的運行時自適應模式（BinaryUtils、RuntimeAdapter、WorkerFactory）完全一致。

---

**文檔維護人**: Claude Code + Opus 4.6
**最後更新**: 2026-02-24
**實施進展**:
- Phase 1 (CBOR) ✅ 完成 (2026-02-24)
- Phase 2 (Hash) → **Phase 4 NativeHasher** ✅ 完成 (2026-02-24)
- Phase 3+ 待排期
**下一階段**: Phase 5 - LRU 快取加速或 Redis RESP3 協議加速
