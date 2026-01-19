import { DirtyTracker } from '../../src/orm/model/DirtyTracker'

function bench(name: string, fn: () => void, iterations = 10000) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  const duration = end - start
  console.log(`${name}: ${duration.toFixed(2)}ms (${(duration / iterations).toFixed(4)}ms/op)`)
}

console.log('--- DirtyTracker Benchmark ---')

const tracker = new DirtyTracker()
const data = generateLargeObject(100)
tracker.setOriginal(data)

bench(
  'mark dirty (100 attrs)',
  () => {
    tracker.mark('prop50', 'New Value')
  },
  5000
)

const obj1 = { nested: { deep: { value: 'test' } } }
const obj2 = { nested: { deep: { value: 'test' } } }

bench(
  'isEqual (deep)',
  () => {
    ;(tracker as any).isEqual(obj1, obj2)
  },
  5000
)

const largeObj = generateLargeObject(100)
bench(
  'cloneValue (large obj)',
  () => {
    ;(tracker as any).cloneValue(largeObj)
  },
  5000
)

function generateLargeObject(size: number): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (let i = 0; i < size; i++) {
    obj[`prop${i}`] = `value${i}`
  }
  return obj
}
