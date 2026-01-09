import { env } from './env'
import { ProcessWorkflowJob } from './jobs/ProcessWorkflowJob'
import { getQueueManager } from './stream'
import type { OrderWorkflowInput } from './workflows/order'

export async function publishOrder(payload: OrderWorkflowInput) {
  const queue = await getQueueManager()

  const job = new ProcessWorkflowJob({
    workflowName: 'flux-enterprise-order',
    input: payload,
  }).onQueue(env.rabbitQueue)

  await queue.push(job)
}
