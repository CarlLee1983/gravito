import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { DB } from '@gravito/atlas'
import { bodySizeLimit, PlanetCore, securityHeaders } from '@gravito/core'
import { FileStorage, SpectrumOrbit } from '@gravito/spectrum'

const core = new PlanetCore()

const defaultCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ')
const cspValue = process.env.APP_CSP
const csp = cspValue === 'false' ? false : (cspValue ?? defaultCsp)
const hstsMaxAge = Number.parseInt(process.env.APP_HSTS_MAX_AGE ?? '15552000', 10)
const bodyLimit = Number.parseInt(process.env.APP_BODY_LIMIT ?? '1048576', 10)
const requireLength = process.env.APP_BODY_REQUIRE_LENGTH === 'true'

core.adapter.use(
  '*',
  securityHeaders({
    contentSecurityPolicy: csp,
    hsts:
      process.env.NODE_ENV === 'production'
        ? { maxAge: Number.isNaN(hstsMaxAge) ? 15552000 : hstsMaxAge, includeSubDomains: true }
        : false,
  })
)
if (!Number.isNaN(bodyLimit) && bodyLimit > 0) {
  core.adapter.use('*', bodySizeLimit(bodyLimit, { requireContentLength: requireLength }))
}

// Clean up previous test data
const storageDir = join(process.cwd(), 'examples/spectrum-verification/storage')
try {
  rmSync(storageDir, { recursive: true, force: true })
} catch {}

// 1. Configure Atlas
DB.addConnection('default', {
  driver: 'sqlite',
  database: ':memory:',
})

// 2. Install Spectrum with FileStorage
await core.orbit(
  new SpectrumOrbit({
    storage: new FileStorage({ directory: storageDir }),
    // Simple gate: allow everything (mocking auth)
    gate: () => true,
  })
)

// 3. Define some routes
core.router.get('/hello', (c) => {
  core.logger.info('Hello route accessed')
  return c.json({ message: 'world', timestamp: Date.now() })
})

// 4. Simulate requests
console.log('--- Simulating requests ---')

const fetch = core.liftoff(3000).fetch

// Request 1: /hello
console.log('Requesting /hello...')
const res1 = await fetch(new Request('http://localhost/hello'))
const data1 = await res1.json()
console.log('Original Response:', data1)

// Check spectrum API
console.log('Checking Spectrum API...')
const reqRes = await fetch(new Request('http://localhost/gravito/spectrum/api/requests'))
const requests = await reqRes.json()

if (requests.length === 0) {
  console.error('❌ No requests captured')
  process.exit(1)
}

const capturedReq = requests[0]
console.log('Captured Request ID:', capturedReq.id)

// Test Replay
console.log('Testing Replay...')
const replayRes = await fetch(
  new Request(`http://localhost/gravito/spectrum/api/replay/${capturedReq.id}`, {
    method: 'POST',
  })
)
const replayData = await replayRes.json()
console.log('Replay Result:', replayData)

if (replayData.success && replayData.status === 200) {
  console.log('✅ Replay successful!')
} else {
  console.error('❌ Replay failed:', replayData)
  process.exit(1)
}

// Verify Persistence (create new storage instance and read)
console.log('Verifying Persistence...')
const storage2 = new FileStorage({ directory: storageDir })
await storage2.init()
const savedRequests = await storage2.getRequests()

const found = savedRequests.find((r) => r.id === capturedReq.id)

if (found) {
  console.log('✅ Persistence verified!')
} else {
  console.error('❌ Persistence failed: Request ID not found in saved data')
  process.exit(1)
}

// Verify SSE (Real-time)
console.log('Verifying Real-time SSE...')
const sseRes = await fetch(new Request('http://localhost/gravito/spectrum/api/events'))

if (sseRes.headers.get('Content-Type') !== 'text/event-stream') {
  console.error('❌ SSE failed: Invalid Content-Type', sseRes.headers.get('Content-Type'))
  process.exit(1)
}

const reader = sseRes.body?.getReader()
if (!reader) {
  console.error('❌ SSE failed: No body reader')
  process.exit(1)
}

// Trigger a new request while listening
console.log('Triggering new request for SSE...')
fetch(new Request('http://localhost/hello'))

const { value } = await reader.read()
const text = new TextDecoder().decode(value)
console.log('SSE Received:', text)

if (text.includes('data:') && (text.includes('request') || text.includes('log'))) {
  console.log('✅ SSE Push verified!')
} else {
  console.error('❌ SSE Push failed: Unexpected data format', text)
  process.exit(1)
}

console.log('--- Spectrum Tier 2 Verification Complete! ---')
process.exit(0)
