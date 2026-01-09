import { publishOrder } from '../src/publisher'
import type { OrderWorkflowInput } from '../src/workflows/order'

async function main() {
  const orderId = process.argv[2] ?? `order-${Date.now()}`
  const payload: OrderWorkflowInput = {
    orderId,
    userId: 'flux-demo',
    items: [
      { productId: 'widget-a', qty: 1 },
      { productId: 'widget-b', qty: 1 },
    ],
  }

  await publishOrder(payload)
  console.log(`Published order ${orderId} to RabbitMQ/${payload.items.length} items`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
