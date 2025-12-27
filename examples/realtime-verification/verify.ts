import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const STORAGE_DIR = join(process.cwd(), 'examples/realtime-verification/storage')
const STORAGE_FILE = join(STORAGE_DIR, 'broadcast_log.jsonl')

async function setup() {
  if (!existsSync(STORAGE_DIR)) {
    await mkdir(STORAGE_DIR, { recursive: true })
  }
  // Clean storage
  try {
    await unlink(STORAGE_FILE)
  } catch {} // Ignore error if file doesn't exist
  await writeFile(STORAGE_FILE, '') // Touch file
}

function startProcess(name: string, role: string, port: number): ChildProcess {
  const p = spawn('bun', ['run', 'src/index.ts'], {
    cwd: join(process.cwd(), 'examples/realtime-verification'),
    env: { ...process.env, INSTANCE_NAME: name, NODE_ROLE: role, PORT: port.toString() },
    stdio: 'pipe',
  })

  p.stdout?.on('data', (data) => {
    const lines = data.toString().split('\n')
    for (const line of lines) {
      if (line.trim()) {
        process.stdout.write(`[${name}] ${line}\n`)
      }
      if (line.includes('VERIFIED_RECEIPT')) {
        // We can emit events here if we wrap this in a promise or event emitter
        // For now just logging is fine, we will manually verify or parse logs later?
        // Better to have a callback or something.
      }
    }
  })

  p.stderr?.on('data', (data) => {
    process.stderr.write(`[${name} ERR] ${data}`)
  })

  return p
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function triggerBroadcast(port: number, message: string) {
  try {
    const res = await fetch(
      `http://localhost:${port}/trigger?message=${encodeURIComponent(message)}`
    )
    console.log(`Triggered broadcast on port ${port}:`, await res.text())
  } catch (e) {
    console.error(`Failed to trigger on port ${port}`, e)
  }
}

async function main() {
  console.log('--- Starting Real-time Verification ---')
  await setup()

  const serverA = startProcess('Server-A', 'server', 3001)
  const serverB = startProcess('Server-B', 'server', 3002)

  await sleep(2000) // Wait for servers to boot

  const clientA = startProcess('Client-A', 'client', 3001)
  const clientB = startProcess('Client-B', 'client', 3002)

  await sleep(2000) // Wait for clients to connect

  console.log('\n--- Test 1: Broadcast from Server A -> Client B ---')
  await triggerBroadcast(3001, 'Message from A')

  await sleep(1000)

  console.log('\n--- Test 2: Broadcast from Server B -> Client A ---')
  await triggerBroadcast(3002, 'Message from B')

  await sleep(2000)

  console.log('\n--- Shutting down ---')
  serverA.kill()
  serverB.kill()
  clientA.kill()
  clientB.kill()
}

main().catch(console.error)
