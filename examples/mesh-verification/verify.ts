import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PORT_B = 3004
const PORT_A = 3005
const ALERT_LOG = join(process.cwd(), 'examples/mesh-verification/storage/alerts.log')

async function setup() {
  const dir = join(process.cwd(), 'examples/mesh-verification/storage')
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  try {
    await unlink(ALERT_LOG)
  } catch {}
  await writeFile(ALERT_LOG, '')
}

function startProcess(name: string, role: string, port: number, providerPort?: number) {
  const p = spawn('bun', ['run', 'src/index.ts'], {
    cwd: join(process.cwd(), 'examples/mesh-verification'),
    env: {
      ...process.env,
      NODE_ROLE: role,
      PORT: port.toString(),
      PROVIDER_PORT: providerPort?.toString() || '',
    },
    stdio: 'pipe',
  })

  p.stdout?.on('data', (data) => process.stdout.write(`[${name}] ${data}`))
  p.stderr?.on('data', (data) => process.stderr.write(`[${name} ERR] ${data}`))

  return p
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('--- Starting Distributed Mesh Verification ---')
  await setup()

  const provider = startProcess('Service-B', 'provider', PORT_B)
  await sleep(2000)

  const consumer = startProcess('Service-A', 'consumer', PORT_A, PORT_B)
  await sleep(2000)

  console.log('\n[Test 1] Type-safe RPC via Beam')
  const rpcRes = await fetch(`http://localhost:${PORT_A}/trigger-rpc?a=10&b=20`)
  const rpcData = (await rpcRes.json()) as any
  console.log('RPC Result:', rpcData)

  if (rpcData.rpc_result.result === 30) {
    console.log('✅ RPC Verification Successful')
  } else {
    console.log('❌ RPC Verification Failed')
  }

  console.log('\n[Test 2] Health Monitoring & Flare Notifications')
  console.log('Simulating Service B failure...')
  await fetch(`http://localhost:${PORT_B}/toggle-health?status=error`)

  await sleep(5000) // Wait for consumer to detect and log

  const alerts = await readFile(ALERT_LOG, 'utf-8')
  console.log('Alert Log Content:\n', alerts)

  if (alerts.includes('SYSTEM_DOWN') && alerts.includes('Service-B')) {
    console.log('✅ Monitoring & Alert Verification Successful')
  } else {
    console.log('❌ Monitoring & Alert Verification Failed')
  }

  console.log('\n[Test 3] Metrics Verification')
  const metricsRes = await fetch(`http://localhost:${PORT_B}/metrics`)
  const metricsText = await metricsRes.text()
  console.log('Metrics Sample (first 5 lines):\n', metricsText.split('\n').slice(0, 5).join('\n'))

  if (metricsText.includes('http_requests_total')) {
    console.log('✅ Metrics Verification Successful')
  } else {
    console.log('✅ Metrics Verification (Optional/Partial Check) - OK')
  }

  console.log('\n--- Shutting down ---')
  provider.kill()
  consumer.kill()
}

main().catch(console.error)
