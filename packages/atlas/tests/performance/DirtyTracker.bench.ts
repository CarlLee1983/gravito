import { bench, describe } from 'bun:test'
import { DirtyTracker } from '../../src/orm/model/DirtyTracker'

describe('DirtyTracker Performance', () => {
  const tracker = new DirtyTracker()
  const data = generateLargeObject(100)
  tracker.setOriginal(data)

  bench('mark dirty - 100 attributes', () => {
    tracker.mark('prop0', 'New Value')
    tracker.mark('prop0', 'value0') // Revert
  })

  bench('isEqual - deep objects (shallow)', () => {
    const obj1 = { a: 1, b: 2, c: 3 }
    const obj2 = { a: 1, b: 2, c: 3 }
    ;(tracker as any).isEqual(obj1, obj2)
  })

  bench('cloneValue - large object', () => {
    const obj = generateLargeObject(100)
    ;(tracker as any).cloneValue(obj)
  })
})

function generateLargeObject(size: number): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (let i = 0; i < size; i++) {
    obj[`prop${i}`] = `value${i}`
  }
  return obj
}
