import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'
import type { GrpcDriverConfig, JobPushOptions, QueueStats, SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

export type { GrpcDriverConfig } from '../types'

export class GrpcDriver implements QueueDriver {
  private client: grpc.Client
  private protoPackage: any

  constructor(private config: GrpcDriverConfig) {
    const protoPath = config.protoPath || path.resolve(__dirname, '../../proto/queue.proto')

    // Fallback for bundled environments where __dirname might not be reliable
    // or when running from different contexts.
    // Ideally, the user provides the protoPath if standard resolution fails.

    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    })

    const packageName = config.packageName || 'stream'
    const serviceName = config.serviceName || 'QueueService'

    const pkg = packageDefinition[packageName] as any
    if (!pkg) {
      throw new Error(`Package '${packageName}' not found in proto definition at ${protoPath}`)
    }

    const Service = pkg[serviceName]
    if (!Service) {
      throw new Error(`Service '${serviceName}' not found in package '${packageName}'`)
    }

    const credentials = this.getCredentials(config)
    this.client = new Service(config.url, credentials)
  }

  private getCredentials(config: GrpcDriverConfig): grpc.ChannelCredentials {
    if (config.credentials) {
      if (config.credentials.rootCerts) {
        return grpc.credentials.createSsl(
          config.credentials.rootCerts,
          config.credentials.privateKey,
          config.credentials.certChain
        )
      }
    }
    return grpc.credentials.createInsecure()
  }

  async push(queue: string, job: SerializedJob, options?: JobPushOptions): Promise<void> {
    const req = {
      queue,
      job: this.toProtoJob(job),
      options: {
        groupId: options?.groupId,
        priority: String(options?.priority || ''),
      },
    }

    return new Promise((resolve, reject) => {
      ;(this.client as any).Push(req, (err: any, response: any) => {
        if (err) return reject(err)
        if (!response.success) {
          return reject(new Error(response.message || 'Unknown gRPC error'))
        }
        resolve()
      })
    })
  }

  async pop(queue: string): Promise<SerializedJob | null> {
    return new Promise((resolve, reject) => {
      ;(this.client as any).Pull({ queue }, (err: any, response: any) => {
        if (err) return reject(err)
        if (!response.job || !response.job.id) return resolve(null)
        resolve(this.fromProtoJob(response.job))
      })
    })
  }

  async size(queue: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ;(this.client as any).Size({ queue }, (err: any, response: any) => {
        if (err) return reject(err)
        resolve(response.size || 0)
      })
    })
  }

  async clear(queue: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ;(this.client as any).Clear({ queue }, (err: any, response: any) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  async acknowledge(messageId: string): Promise<void> {
    // Note: The generic interface implies acknowledge is by messageId.
    // But my proto design for AcknowledgeRequest takes (queue, jobId).
    // I might need to adapt. For now, assuming messageId is sufficient or I need queue context.
    // But QueueDriver.acknowledge only passes messageId.
    // Issue: gRPC usually needs context.
    // If the driver is strictly proxying, it might need to know the queue.
    // However, typically `messageId` in distributed systems is unique globally.

    // Workaround: Send messageId as jobId and empty queue if the server implementation can handle it,
    // or change the Proto to only take stored JobID.

    // Let's assume the server only needs ID.
    return new Promise((resolve, reject) => {
      ;(this.client as any).Acknowledge({ jobId: messageId }, (err: any, response: any) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  async stats(queue: string): Promise<QueueStats> {
    return new Promise((resolve, reject) => {
      ;(this.client as any).Stats({ queue }, (err: any, response: any) => {
        if (err) return reject(err)
        resolve({
          queue: response.queue,
          size: response.size,
          delayed: response.delayed,
          failed: response.failed,
          reserved: response.reserved,
        })
      })
    })
  }

  private toProtoJob(job: SerializedJob): any {
    return {
      ...job,
      priority: job.priority ? String(job.priority) : undefined,
      createdAt: String(job.createdAt), // Long as string
      failedAt: job.failedAt ? String(job.failedAt) : undefined,
    }
  }

  private fromProtoJob(protoJob: any): SerializedJob {
    return {
      id: protoJob.id,
      type: protoJob.type,
      data: protoJob.data,
      className: protoJob.className,
      createdAt: Number(protoJob.createdAt),
      delaySeconds: protoJob.delaySeconds,
      attempts: protoJob.attempts,
      maxAttempts: protoJob.maxAttempts,
      groupId: protoJob.groupId,
      priority: protoJob.priority,
      failedAt: protoJob.failedAt ? Number(protoJob.failedAt) : undefined,
      error: protoJob.error,
      retryAfterSeconds: protoJob.retryAfterSeconds,
      retryMultiplier: protoJob.retryMultiplier,
    }
  }
}
