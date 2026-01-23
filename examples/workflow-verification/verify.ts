import { spawn } from 'node:child_process'
import { join } from 'node:path'

const PORT = 3006
const BASE_URL = `http://localhost:${PORT}`

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('--- Starting Workflow & Validation Verification ---')

  const server = spawn('bun', ['run', 'src/index.ts'], {
    cwd: join(process.cwd(), 'examples/workflow-verification'),
    env: { ...process.env, PORT: PORT.toString() },
    stdio: 'inherit',
  })

  await sleep(2000)

  try {
    console.log('\n[Test 1] Invalid Request (Impulse Validation)')
    const failRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: '', // Invalid
        quantity: -1, // Invalid
        email: 'not-an-email',
      }),
    })
    console.log('Validation status (Expect 422/400):', failRes.status)
    const failData = await failRes.json()
    console.log('Validation errors:', JSON.stringify(failData.errors || failData.error))

    console.log('\n[Test 2] Workflow Step Failure (Flux error handling)')
    const workflowFailRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'out-of-stock',
        quantity: 1,
        email: 'test@example.com',
        paymentToken: 'valid-token',
      }),
    })
    const workflowFailData = (await workflowFailRes.json()) as any
    console.log('Workflow status:', workflowFailRes.status, workflowFailData.error)

    console.log('\n[Test 3] Successful Full Flow (Impulse + Flux)')
    const successRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'iphone-15',
        quantity: 2,
        email: 'customer@example.com',
        paymentToken: 'tok_visa',
      }),
    })
    const successData = (await successRes.json()) as any
    console.log('Success status:', successRes.status)
    console.log('Order Data:', successData.order)
    console.log('Steps Executed:', successData.steps)

    console.log('\n[Test 4] Partial Update Pattern (Schema Composition)')
    // 4.1 Valid partial update
    const updateSuccessRes = await fetch(`${BASE_URL}/orders/123`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity: 5, // Only updating quantity
      }),
    })
    const updateSuccessData = (await updateSuccessRes.json()) as any
    console.log('Update Status (Expect 200):', updateSuccessRes.status, updateSuccessData.message)

    // 4.2 Invalid partial update
    const updateFailRes = await fetch(`${BASE_URL}/orders/123`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity: -5, // Invalid rule from base schema still applies
      }),
    })
    console.log('Invalid Update Status (Expect 422/400):', updateFailRes.status)

    if (
      successData.success &&
      successData.order.status === 'SHIPPED' &&
      updateSuccessRes.status === 200 &&
      (updateFailRes.status === 422 || updateFailRes.status === 400)
    ) {
      console.log('\n✅ VERIFICATION SUCCESSFUL')
    } else {
      console.log('\n❌ VERIFICATION FAILED')
    }
  } catch (e) {
    console.error('Verification failed:', e)
  } finally {
    server.kill()
  }
}

main()
