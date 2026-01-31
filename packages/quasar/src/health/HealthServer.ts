import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { QuasarAgent } from '../QuasarAgent'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  connections: {
    transport: string
    monitor: string
  }
  nodeId?: string
  service: string
}

export class HealthServer {
  private server: ReturnType<typeof createServer> | null = null

  constructor(
    private agent: QuasarAgent,
    private port = 9999
  ) {}

  async start(): Promise<void> {
    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.url === '/health' || req.url === '/') {
        const status = this.getStatus()
        const statusCode = status.status === 'healthy' ? 200 : 503

        res.writeHead(statusCode, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(status))
      } else if (req.url === '/cluster') {
        this.agent
          .getClusterStatus()
          .then((cluster) => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                nodes: cluster,
                isLeader: this.agent.isLeader(),
                timestamp: Date.now(),
              })
            )
          })
          .catch((_err) => {
            res.writeHead(500)
            res.end(JSON.stringify({ error: 'Failed to fetch cluster status' }))
          })
      } else if (req.url === '/metrics') {
        const status = this.agent.getStatus()
        const metrics = status.metrics

        if (req.headers.accept?.includes('application/json')) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(metrics))
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          const prometheusMetrics = this.agent.getPrometheusMetrics()
          res.end(prometheusMetrics)
        }
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    return new Promise((resolve) => {
      this.server?.listen(this.port, () => {
        console.log(`[Quasar] Health server listening on port ${this.port}`)
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve()
        return
      }
      this.server.close((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  getStatus(): HealthStatus {
    const agentStatus = this.agent.getStatus()

    let status: HealthStatus['status'] = 'healthy'

    if (agentStatus.transport !== 'ready') {
      status = 'unhealthy'
    } else if (agentStatus.monitor !== 'ready' && agentStatus.monitor !== 'not_configured') {
      status = 'degraded'
    }

    return {
      status,
      uptime: process.uptime(),
      connections: {
        transport: agentStatus.transport,
        monitor: agentStatus.monitor,
      },
      nodeId: agentStatus.nodeId,
      service: agentStatus.service,
    }
  }
}
