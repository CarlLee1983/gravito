/**
 * CBOR 性能基準測試
 *
 * 對比三種實現：
 * 1. CborNative (C FFI) - 透過 NativeAccelerator
 * 2. CborFallback (JS) - CborFallbackEncoder
 * 3. JSON (原生 JSON.stringify/parse)
 *
 * 測試場景：
 * - Small Payload (~200B)
 * - Medium Payload (~2KB)
 * - Large Payload (~10KB)
 * - Round-trip 完整性
 */

import { bench, group, run } from 'mitata'
import { CborFallbackEncoder } from '../../src/ffi'
import { NativeAccelerator } from '../../src/ffi/NativeAccelerator'

// ──────────────────────────────────────────────────────────────────────────────
// 初始化
// ──────────────────────────────────────────────────────────────────────────────

NativeAccelerator.reset()
const nativeAccelerator = NativeAccelerator.getCborAccelerator()
const fallbackEncoder = new CborFallbackEncoder()
const status = NativeAccelerator.getStatus()

console.log('='.repeat(60))
console.log('CBOR 性能基準測試')
console.log(`後端: ${status.runtime} (${status.version})`)
console.log(`FFI 可用: ${status.available}`)
console.log('='.repeat(60))

// ──────────────────────────────────────────────────────────────────────────────
// 測試資料
// ──────────────────────────────────────────────────────────────────────────────

/** Small Payload (~200B JSON) */
const smallPayload = {
  id: 'job-small-001',
  name: 'test-item',
  count: 42,
  active: true,
  tags: ['tag1', 'tag2', 'tag3'],
  metadata: { created: 1700000000000 },
}

/** Medium Payload (~2KB JSON) */
const mediumPayload = {
  id: 'job-medium-001',
  items: Array.from({ length: 30 }, (_, i) => ({
    id: i,
    name: `item-${i}`,
    description: `This is item number ${i} with some description text`,
    price: i * 10.5,
    active: i % 2 === 0,
  })),
}

/** Large Payload (~10KB JSON) */
const largePayload = {
  id: 'job-large-001',
  data: {
    items: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `item-${i}`,
      value: `test-data-${i}-padding-${'x'.repeat(50)}`,
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: [`tag-${i}-a`, `tag-${i}-b`],
      },
    })),
  },
}

// 預計算各格式的序列化結果（用於反序列化基準測試）
const smallJson = JSON.stringify(smallPayload)
const mediumJson = JSON.stringify(mediumPayload)
const largeJson = JSON.stringify(largePayload)

const smallNativeCbor = nativeAccelerator.encode(smallPayload)
const mediumNativeCbor = nativeAccelerator.encode(mediumPayload)
const largeNativeCbor = nativeAccelerator.encode(largePayload)

const smallFallbackCbor = fallbackEncoder.encode(smallPayload)
const mediumFallbackCbor = fallbackEncoder.encode(mediumPayload)
const largeFallbackCbor = fallbackEncoder.encode(largePayload)

console.log('\n--- Payload 大小比較 ---')
console.log(
  `Small:  JSON=${smallJson.length}B | Native CBOR=${smallNativeCbor.length}B | Fallback CBOR=${smallFallbackCbor.length}B`
)
console.log(
  `Medium: JSON=${mediumJson.length}B | Native CBOR=${mediumNativeCbor.length}B | Fallback CBOR=${mediumFallbackCbor.length}B`
)
console.log(
  `Large:  JSON=${largeJson.length}B | Native CBOR=${largeNativeCbor.length}B | Fallback CBOR=${largeFallbackCbor.length}B`
)
console.log('')

// ──────────────────────────────────────────────────────────────────────────────
// 序列化基準測試
// ──────────────────────────────────────────────────────────────────────────────

group('Encode - Small Payload (~200B)', () => {
  bench('JSON.stringify', () => {
    JSON.stringify(smallPayload)
  })
  bench('CborFallback (JS)', () => {
    fallbackEncoder.encode(smallPayload)
  })
  bench('CborNative (C/FFI)', () => {
    nativeAccelerator.encode(smallPayload)
  })
})

group('Encode - Medium Payload (~2KB)', () => {
  bench('JSON.stringify', () => {
    JSON.stringify(mediumPayload)
  })
  bench('CborFallback (JS)', () => {
    fallbackEncoder.encode(mediumPayload)
  })
  bench('CborNative (C/FFI)', () => {
    nativeAccelerator.encode(mediumPayload)
  })
})

group('Encode - Large Payload (~10KB)', () => {
  bench('JSON.stringify', () => {
    JSON.stringify(largePayload)
  })
  bench('CborFallback (JS)', () => {
    fallbackEncoder.encode(largePayload)
  })
  bench('CborNative (C/FFI)', () => {
    nativeAccelerator.encode(largePayload)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// 反序列化基準測試
// ──────────────────────────────────────────────────────────────────────────────

group('Decode - Small Payload (~200B)', () => {
  bench('JSON.parse', () => {
    JSON.parse(smallJson)
  })
  bench('CborFallback (JS)', () => {
    fallbackEncoder.decode(smallFallbackCbor)
  })
  bench('CborNative (C/FFI)', () => {
    nativeAccelerator.decode(smallNativeCbor)
  })
})

group('Decode - Medium Payload (~2KB)', () => {
  bench('JSON.parse', () => {
    JSON.parse(mediumJson)
  })
  bench('CborFallback (JS)', () => {
    fallbackEncoder.decode(mediumFallbackCbor)
  })
  bench('CborNative (C/FFI)', () => {
    nativeAccelerator.decode(mediumNativeCbor)
  })
})

group('Decode - Large Payload (~10KB)', () => {
  bench('JSON.parse', () => {
    JSON.parse(largeJson)
  })
  bench('CborFallback (JS)', () => {
    fallbackEncoder.decode(largeFallbackCbor)
  })
  bench('CborNative (C/FFI)', () => {
    nativeAccelerator.decode(largeNativeCbor)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Round-trip 基準測試
// ──────────────────────────────────────────────────────────────────────────────

group('Round-trip - Small Payload', () => {
  bench('JSON', () => {
    JSON.parse(JSON.stringify(smallPayload))
  })
  bench('CborFallback (JS)', () => {
    fallbackEncoder.decode(fallbackEncoder.encode(smallPayload))
  })
  bench('CborNative (C/FFI)', () => {
    nativeAccelerator.decode(nativeAccelerator.encode(smallPayload))
  })
})

group('Round-trip - Medium Payload', () => {
  bench('JSON', () => {
    JSON.parse(JSON.stringify(mediumPayload))
  })
  bench('CborFallback (JS)', () => {
    fallbackEncoder.decode(fallbackEncoder.encode(mediumPayload))
  })
  bench('CborNative (C/FFI)', () => {
    nativeAccelerator.decode(nativeAccelerator.encode(mediumPayload))
  })
})

group('Round-trip - Large Payload', () => {
  bench('JSON', () => {
    JSON.parse(JSON.stringify(largePayload))
  })
  bench('CborFallback (JS)', () => {
    fallbackEncoder.decode(fallbackEncoder.encode(largePayload))
  })
  bench('CborNative (C/FFI)', () => {
    nativeAccelerator.decode(nativeAccelerator.encode(largePayload))
  })
})

await run()
