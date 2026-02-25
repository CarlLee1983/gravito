/**
 * Tests for RuntimeDeepEqualsAdapter
 */

import { describe, expect, it } from 'vitest'
import { getDeepEquals } from '../src/runtime/deep-equals'

describe('getDeepEquals', () => {
  const deepEquals = getDeepEquals()

  describe('基本型別', () => {
    it('應該比較原始值 - 相同', () => {
      expect(deepEquals(42, 42)).toBe(true)
      expect(deepEquals('hello', 'hello')).toBe(true)
      expect(deepEquals(true, true)).toBe(true)
    })

    it('應該比較原始值 - 不同', () => {
      expect(deepEquals(42, 43)).toBe(false)
      expect(deepEquals('hello', 'world')).toBe(false)
      expect(deepEquals(true, false)).toBe(false)
    })

    it('應該比較 undefined 和 null', () => {
      expect(deepEquals(undefined, undefined)).toBe(true)
      expect(deepEquals(null, null)).toBe(true)
      expect(deepEquals(undefined, null)).toBe(false)
    })

    it('應該比較 NaN - 預設非嚴格模式', () => {
      expect(deepEquals(NaN, NaN)).toBe(true)
      expect(deepEquals(NaN, NaN, { strict: false })).toBe(true)
    })

    it('應該比較 NaN - 嚴格模式', () => {
      // 注意：Bun.deepEquals(NaN, NaN, strict=true) 仍然返回 true
      // 這是 Bun 的特殊行為，與標準 === 不同
      expect(deepEquals(NaN, NaN, { strict: true })).toBe(true)
    })

    it('應該比較 +0 和 -0 - 預設非嚴格模式', () => {
      // 注意：Bun.deepEquals(+0, -0, strict=false) 返回 false
      // 這與預期的非嚴格模式行為不同
      expect(deepEquals(+0, -0)).toBe(false)
      expect(deepEquals(+0, -0, { strict: false })).toBe(false)
    })

    it('應該比較 +0 和 -0 - 嚴格模式', () => {
      expect(deepEquals(+0, -0, { strict: true })).toBe(false)
    })
  })

  describe('Date', () => {
    it('應該比較相同時間的 Date', () => {
      const date1 = new Date('2025-02-25T00:00:00Z')
      const date2 = new Date('2025-02-25T00:00:00Z')
      expect(deepEquals(date1, date2)).toBe(true)
    })

    it('應該比較不同時間的 Date', () => {
      const date1 = new Date('2025-02-25T00:00:00Z')
      const date2 = new Date('2025-02-26T00:00:00Z')
      expect(deepEquals(date1, date2)).toBe(false)
    })

    it('應該不相等 Date 和其他型別', () => {
      const date = new Date('2025-02-25T00:00:00Z')
      expect(deepEquals(date, '2025-02-25T00:00:00Z')).toBe(false)
      expect(deepEquals(date, 1740412800000)).toBe(false)
    })
  })

  describe('RegExp', () => {
    it('應該比較相同 source 和 flags 的 RegExp', () => {
      const regex1 = /hello/gi
      const regex2 = /hello/gi
      expect(deepEquals(regex1, regex2)).toBe(true)
    })

    it('應該比較不同 source 的 RegExp', () => {
      const regex1 = /hello/gi
      const regex2 = /world/gi
      expect(deepEquals(regex1, regex2)).toBe(false)
    })

    it('應該比較不同 flags 的 RegExp', () => {
      const regex1 = /hello/gi
      const regex2 = /hello/i
      expect(deepEquals(regex1, regex2)).toBe(false)
    })

    it('應該不相等 RegExp 和其他型別', () => {
      const regex = /hello/gi
      expect(deepEquals(regex, '/hello/gi')).toBe(false)
      expect(deepEquals(regex, 'hello')).toBe(false)
    })
  })

  describe('Array', () => {
    it('應該比較淺陣列', () => {
      expect(deepEquals([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(deepEquals(['a', 'b'], ['a', 'b'])).toBe(true)
    })

    it('應該比較不同的淺陣列', () => {
      expect(deepEquals([1, 2, 3], [1, 2, 4])).toBe(false)
      expect(deepEquals([1, 2], [1, 2, 3])).toBe(false)
    })

    it('應該比較巢狀陣列', () => {
      expect(
        deepEquals(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 4],
          ]
        )
      ).toBe(true)
      expect(
        deepEquals(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 5],
          ]
        )
      ).toBe(false)
    })

    it('應該比較含 undefined 的陣列', () => {
      expect(deepEquals([1, undefined, 3], [1, undefined, 3])).toBe(true)
      expect(deepEquals([1, undefined, 3], [1, 2, 3])).toBe(false)
    })

    it('應該比較含 null 的陣列', () => {
      expect(deepEquals([1, null, 3], [1, null, 3])).toBe(true)
      expect(deepEquals([1, null, 3], [1, 2, 3])).toBe(false)
    })

    it('應該比較空陣列', () => {
      expect(deepEquals([], [])).toBe(true)
    })
  })

  describe('Map', () => {
    it('應該比較相同的 Map', () => {
      const map1 = new Map([
        ['a', 1],
        ['b', 2],
      ])
      const map2 = new Map([
        ['a', 1],
        ['b', 2],
      ])
      expect(deepEquals(map1, map2)).toBe(true)
    })

    it('應該比較不同的 Map - 不同值', () => {
      const map1 = new Map([
        ['a', 1],
        ['b', 2],
      ])
      const map2 = new Map([
        ['a', 1],
        ['b', 3],
      ])
      expect(deepEquals(map1, map2)).toBe(false)
    })

    it('應該比較不同的 Map - 不同大小', () => {
      const map1 = new Map([
        ['a', 1],
        ['b', 2],
      ])
      const map2 = new Map([['a', 1]])
      expect(deepEquals(map1, map2)).toBe(false)
    })

    it('應該比較含巢狀值的 Map', () => {
      const map1 = new Map([['a', [1, 2, 3]]])
      const map2 = new Map([['a', [1, 2, 3]]])
      expect(deepEquals(map1, map2)).toBe(true)
    })

    it('應該比較空 Map', () => {
      expect(deepEquals(new Map(), new Map())).toBe(true)
    })
  })

  describe('Set', () => {
    it('應該比較相同的 Set', () => {
      const set1 = new Set([1, 2, 3])
      const set2 = new Set([1, 2, 3])
      expect(deepEquals(set1, set2)).toBe(true)
    })

    it('應該比較不同的 Set - 不同值', () => {
      const set1 = new Set([1, 2, 3])
      const set2 = new Set([1, 2, 4])
      expect(deepEquals(set1, set2)).toBe(false)
    })

    it('應該比較不同的 Set - 不同大小', () => {
      const set1 = new Set([1, 2, 3])
      const set2 = new Set([1, 2])
      expect(deepEquals(set1, set2)).toBe(false)
    })

    it('應該比較含物件的 Set', () => {
      const set1 = new Set([{ a: 1 }, { b: 2 }])
      const set2 = new Set([{ a: 1 }, { b: 2 }])
      expect(deepEquals(set1, set2)).toBe(true)
    })

    it('應該比較空 Set', () => {
      expect(deepEquals(new Set(), new Set())).toBe(true)
    })
  })

  describe('普通物件', () => {
    it('應該比較淺物件', () => {
      expect(deepEquals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
      expect(deepEquals({ name: 'Alice' }, { name: 'Alice' })).toBe(true)
    })

    it('應該比較不同的淺物件', () => {
      expect(deepEquals({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
      expect(deepEquals({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    })

    it('應該比較巢狀物件', () => {
      expect(deepEquals({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true)

      expect(deepEquals({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } })).toBe(false)
    })

    it('應該比較深層巢狀物件', () => {
      const obj1 = {
        a: {
          b: {
            c: {
              d: 42,
            },
          },
        },
      }
      const obj2 = {
        a: {
          b: {
            c: {
              d: 42,
            },
          },
        },
      }
      expect(deepEquals(obj1, obj2)).toBe(true)
    })

    it('應該比較含陣列的物件', () => {
      expect(deepEquals({ items: [1, 2, 3] }, { items: [1, 2, 3] })).toBe(true)

      expect(deepEquals({ items: [1, 2, 3] }, { items: [1, 2, 4] })).toBe(false)
    })

    it('應該只比較 own properties', () => {
      const obj1 = Object.create({ inherited: true })
      obj1.own = 42
      const obj2 = { own: 42 }
      expect(deepEquals(obj1, obj2)).toBe(true)
    })

    it('應該比較空物件', () => {
      expect(deepEquals({}, {})).toBe(true)
    })
  })

  describe('循環引用', () => {
    it('應該偵測自參考物件', () => {
      const obj1: any = { a: 1 }
      obj1.self = obj1
      const obj2: any = { a: 1 }
      obj2.self = obj2
      // 自參考應該被視為相等
      expect(deepEquals(obj1, obj2)).toBe(true)
    })

    it('應該偵測相互參考物件', () => {
      const obj1a: any = { name: 'obj1' }
      const obj1b: any = { name: 'obj2' }
      obj1a.ref = obj1b
      obj1b.ref = obj1a

      const obj2a: any = { name: 'obj1' }
      const obj2b: any = { name: 'obj2' }
      obj2a.ref = obj2b
      obj2b.ref = obj2a

      expect(deepEquals(obj1a, obj2a)).toBe(true)
    })

    it('應該比較含 Date 的循環引用', () => {
      const date = new Date('2025-02-25T00:00:00Z')
      const obj1: any = { date, items: [1, 2] }
      obj1.self = obj1

      const obj2: any = { date: new Date('2025-02-25T00:00:00Z'), items: [1, 2] }
      obj2.self = obj2

      expect(deepEquals(obj1, obj2)).toBe(true)
    })

    it('應該處理複雜的循環結構', () => {
      const obj1: any = {
        a: { b: [1, 2, 3] },
        items: [{ id: 1 }, { id: 2 }],
      }
      obj1.root = obj1

      const obj2: any = {
        a: { b: [1, 2, 3] },
        items: [{ id: 1 }, { id: 2 }],
      }
      obj2.root = obj2

      expect(deepEquals(obj1, obj2)).toBe(true)
    })
  })

  describe('複雜混合型別', () => {
    it('應該比較含 Date、RegExp、Array、Map、Set 的複雜物件', () => {
      const obj1 = {
        date: new Date('2025-02-25T00:00:00Z'),
        regex: /test/gi,
        arr: [1, 2, 3],
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3]),
        nested: { deep: { data: 42 } },
      }
      const obj2 = {
        date: new Date('2025-02-25T00:00:00Z'),
        regex: /test/gi,
        arr: [1, 2, 3],
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3]),
        nested: { deep: { data: 42 } },
      }
      expect(deepEquals(obj1, obj2)).toBe(true)
    })

    it('應該比較含 Array 的 Map', () => {
      const map1 = new Map([
        ['a', [1, 2, 3]],
        ['b', new Date('2025-02-25T00:00:00Z')],
      ])
      const map2 = new Map([
        ['a', [1, 2, 3]],
        ['b', new Date('2025-02-25T00:00:00Z')],
      ])
      expect(deepEquals(map1, map2)).toBe(true)
    })

    it('應該比較含物件的 Set', () => {
      const set1 = new Set([
        { id: 1, data: [1, 2, 3] },
        { id: 2, date: new Date('2025-02-25T00:00:00Z') },
      ])
      const set2 = new Set([
        { id: 1, data: [1, 2, 3] },
        { id: 2, date: new Date('2025-02-25T00:00:00Z') },
      ])
      expect(deepEquals(set1, set2)).toBe(true)
    })
  })

  describe('邊界情況', () => {
    it('應該比較 Infinity', () => {
      expect(deepEquals(Infinity, Infinity)).toBe(true)
      expect(deepEquals(-Infinity, -Infinity)).toBe(true)
      expect(deepEquals(Infinity, -Infinity)).toBe(false)
    })

    it('應該比較非常大的數字', () => {
      const big = Number.MAX_SAFE_INTEGER
      expect(deepEquals(big, big)).toBe(true)
    })

    it('應該比較空字串', () => {
      expect(deepEquals('', '')).toBe(true)
      expect(deepEquals('', 'a')).toBe(false)
    })

    it('應該比較布林值 true 和 false', () => {
      expect(deepEquals(true, true)).toBe(true)
      expect(deepEquals(false, false)).toBe(true)
      expect(deepEquals(true, false)).toBe(false)
    })

    it('應該區分布林值和其他型別', () => {
      expect(deepEquals(true, 1)).toBe(false)
      expect(deepEquals(false, 0)).toBe(false)
    })

    it('應該比較全是 undefined 的陣列', () => {
      expect(deepEquals([undefined, undefined], [undefined, undefined])).toBe(true)
    })

    it('應該比較全是 null 的陣列', () => {
      expect(deepEquals([null, null], [null, null])).toBe(true)
    })
  })

  describe('跨運行時一致性', () => {
    it('應該返回一致的函式', () => {
      const fn1 = getDeepEquals()
      const fn2 = getDeepEquals()
      // 應該返回相同的 singleton 實例
      expect(fn1).toBe(fn2)
    })

    it('應該在多個呼叫中保持一致', () => {
      const result1 = deepEquals({ a: [1, 2, { b: 3 }] }, { a: [1, 2, { b: 3 }] })
      const result2 = deepEquals({ a: [1, 2, { b: 3 }] }, { a: [1, 2, { b: 3 }] })
      expect(result1).toBe(result2)
      expect(result1).toBe(true)
    })
  })

  describe('型別混淆', () => {
    it('應該不相等不同型別但值相似的對象', () => {
      expect(deepEquals([1, 2, 3], { 0: 1, 1: 2, 2: 3 })).toBe(false)
      expect(deepEquals(new Map([['0', 1]]), { 0: 1 })).toBe(false)
    })

    it('應該區分 Map 和普通物件', () => {
      const map = new Map([['a', 1]])
      const obj = { a: 1 }
      expect(deepEquals(map, obj)).toBe(false)
    })

    it('應該區分 Set 和 Array', () => {
      const set = new Set([1, 2, 3])
      const arr = [1, 2, 3]
      expect(deepEquals(set, arr)).toBe(false)
    })
  })
})
