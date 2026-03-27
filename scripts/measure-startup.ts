import { Container } from '@gravito/core'

async function measureStartup() {
  const times: number[] = []

  for (let i = 0; i < 5; i++) {
    const start = performance.now()
    const _container = new Container()
    const end = performance.now()
    const duration = end - start
    times.push(duration)
    console.log(`Run ${i + 1}: ${duration.toFixed(2)}ms`)
  }

  times.sort((a, b) => a - b)
  const median = times[Math.floor(times.length / 2)]
  const min = times[0]
  const max = times[times.length - 1]
  const avg = times.reduce((a, b) => a + b, 0) / times.length

  console.log(`\nMedian: ${median.toFixed(2)}ms`)
  console.log(`Min: ${min.toFixed(2)}ms`)
  console.log(`Max: ${max.toFixed(2)}ms`)
  console.log(`Average: ${avg.toFixed(2)}ms`)

  return {
    startup_time_ms: Math.round(median * 100) / 100,
    min_ms: Math.round(min * 100) / 100,
    max_ms: Math.round(max * 100) / 100,
    avg_ms: Math.round(avg * 100) / 100,
  }
}

const result = await measureStartup()
console.log(JSON.stringify(result, null, 2))
