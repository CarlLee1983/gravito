import type { QueueProbe, QueueSnapshot } from './types'

// Minimal interface for SQS Client to avoid heavy dependency
export interface SQSClientLike {
  send(command: any): Promise<any>
}

export class SQSProbe implements QueueProbe {
  constructor(
    private client: SQSClientLike,
    private queueUrl: string
  ) {}

  async getSnapshot(): Promise<QueueSnapshot> {
    try {
      // Dynamic import to avoid runtime error if package is missing
      // But here we assume user provides the client instance
      // We need to construct the command.
      // Since we don't want to import from @aws-sdk/client-sqs, we rely on the user passing a client
      // that accepts command objects.
      // However, usually we need to import the Command class.
      // If we want to avoid dependency, we can't instantiate GetQueueAttributesCommand.
      // So we must assume the user passes a callback or similar?
      // Or we assume the user has the package and we can import it?
      // But peerDependency is not enforced.

      // Alternative: User passes a function that returns attributes.
      // But the requirement says "Implement SQSProbe class... constructor(client, queueUrl)".

      // If I can't import GetQueueAttributesCommand, I can't use the standard AWS SDK V3 pattern easily
      // unless I assume the environment has it.
      // For now, I'll assume the environment has it available globally or I'll use a dynamic import.
      // Actually, standard practice for optional integrations is dynamic import.

      const { GetQueueAttributesCommand } = await import('@aws-sdk/client-sqs')

      const command = new GetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        AttributeNames: [
          'ApproximateNumberOfMessages',
          'ApproximateNumberOfMessagesNotVisible',
          'ApproximateNumberOfMessagesDelayed',
        ],
      })

      const response = await this.client.send(command)
      const attributes = response.Attributes || {}

      return {
        name: this.queueUrl.split('/').pop() || 'sqs-queue',
        driver: 'sqs',
        size: {
          waiting: parseInt(attributes.ApproximateNumberOfMessages || '0', 10),
          active: parseInt(attributes.ApproximateNumberOfMessagesNotVisible || '0', 10),
          delayed: parseInt(attributes.ApproximateNumberOfMessagesDelayed || '0', 10),
          failed: 0, // SQS doesn't track failed counts directly (DLQ is separate)
        },
      }
    } catch (err) {
      console.warn(`[SQSProbe] Failed to fetch metrics for ${this.queueUrl}`, err)
      return {
        name: this.queueUrl,
        driver: 'sqs',
        size: { waiting: 0, active: 0, failed: 0, delayed: 0 },
      }
    }
  }
}
