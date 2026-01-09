console.log('🎧 Connecting to log stream...')
const req = await fetch('http://localhost:3000/api/logs/stream')
if (!req.body) throw new Error('No body')

const reader = req.body.getReader()
const decoder = new TextDecoder()

let logCount = 0
const start = Date.now()

// Count for 2 seconds
const DURATION = 2000

console.log(`⏳ Measuring received logs for ${DURATION}ms...`)

async function readStream() {
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    // SSE format: event: log\ndata: ...\n\n
    const matches = chunk.match(/event: log/g)
    if (matches) {
      logCount += matches.length
    }

    if (Date.now() - start > DURATION) {
      break
    }
  }

  console.log(`📊 Result: Received ${logCount} logs in ${(Date.now() - start) / 1000}s`)
  console.log(`ℹ️  Expected max: ~50-60 logs (50/sec limit + potential buffer/history)`)

  if (logCount > 150) {
    console.error('❌ Throttling FAILED! Too many logs received.')
    process.exit(1)
  } else {
    console.log('✅ Throttling PASSED!')
    process.exit(0)
  }
}

readStream()
