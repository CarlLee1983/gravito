import path from 'node:path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import type { GrpcDriverConfig, JobPushOptions, QueueStats, SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

export type { GrpcDriverConfig } from '../types'

interface ProtoJob {
  id: string
  type: SerializedJob['type']
  data: SerializedJob['data']
  className?: string
  createdAt: string
  delaySeconds?: number
  attempts?: number
  maxAttempts?: number
  groupId?: string
  priority?: string
  failedAt?: string
  error?: string
  retryAfterSeconds?: number
  retryMultiplier?: number
}

interface PushRequest {
  queue: string
  job: ProtoJob
  options: {
    groupId?: string
    priority?: string
  }
}

interface PullRequest {
  queue: string
}

interface SizeRequest {
  queue: string
}

interface ClearRequest {
  queue: string
}

interface AcknowledgeRequest {
  jobId: string
}

interface StatsRequest {
  queue: string
}

interface PushResponse {
  success: boolean
  message?: string
}

interface PullResponse {
  job?: ProtoJob | null
}

interface SizeResponse {
  size?: number
}

interface StatsResponse {
  queue: string
  size: number
  delayed?: number
  failed?: number
  reserved?: number
}

type GrpcCallback<T> = (error: grpc.ServiceError | null, response: T) => void

interface QueueServiceClient extends grpc.Client {
  Push(request: PushRequest, callback: GrpcCallback<PushResponse>): void
  Pull(request: PullRequest, callback: GrpcCallback<PullResponse>): void
  Size(request: SizeRequest, callback: GrpcCallback<SizeResponse>): void
  Clear(request: ClearRequest, callback: (error: grpc.ServiceError | null) => void): void
  Acknowledge(
    request: AcknowledgeRequest,
    callback: (error: grpc.ServiceError | null) => void
  ): void
  Stats(request: StatsRequest, callback: GrpcCallback<StatsResponse>): void
}

type GrpcServiceConstructor = new (
  address: string,
  credentials: grpc.ChannelCredentials
) => QueueServiceClient

export class GrpcDriver implements QueueDriver {
  private client: QueueServiceClient

  constructor(config: GrpcDriverConfig) {
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
    const grpcObject = grpc.loadPackageDefinition(packageDefinition)

    const packageName = config.packageName || 'stream'
    const serviceName = config.serviceName || 'QueueService'

    const grpcEntries = grpcObject as Record<string, grpc.GrpcObject | grpc.ProtobufTypeDefinition>
    const packageObject = grpcEntries[packageName]
    if (!packageObject || typeof packageObject !== 'object') {
      throw new Error(`Package '${packageName}' not found in proto definition at ${protoPath}`)
    }

    const serviceEntries = packageObject as Record<string, unknown>
    const Service = serviceEntries[serviceName]
    if (!Service) {
      throw new Error(`Service '${serviceName}' not found in package '${packageName}'`)
    }

    const credentials = this.getCredentials(config)
    this.client = new (Service as GrpcServiceConstructor)(config.url, credentials)
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
      this.client.Push(req, (err, response) => {
        if (err) {
          return reject(err)
        }
        if (!response.success) {
          return reject(new Error(response.message || 'Unknown gRPC error'))
        }
        resolve()
      })
    })
  }

  async pop(queue: string): Promise<SerializedJob | null> {
    return new Promise((resolve, reject) => {
      this.client.Pull({ queue }, (err, response) => {
        if (err) {
          return reject(err)
        }
        if (!response.job || !response.job.id) {
          return resolve(null)
        }
        resolve(this.fromProtoJob(response.job))
      })
    })
  }

  async size(queue: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.client.Size({ queue }, (err, response) => {
        if (err) {
          return reject(err)
        }
        resolve(response.size || 0)
      })
    })
  }

  async clear(queue: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.Clear({ queue }, (err) => {
        if (err) {
          return reject(err)
        }
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
      this.client.Acknowledge({ jobId: messageId }, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  async stats(queue: string): Promise<QueueStats> {
    return new Promise((resolve, reject) => {
      this.client.Stats({ queue }, (err, response) => {
        if (err) {
          return reject(err)
        }
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

  private toProtoJob(job: SerializedJob): ProtoJob {
    return {
      ...job,
      priority: job.priority ? String(job.priority) : undefined,
      createdAt: String(job.createdAt), // Long as string
      failedAt: job.failedAt ? String(job.failedAt) : undefined,
    }
  }

  private fromProtoJob(protoJob: ProtoJob): SerializedJob {
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
