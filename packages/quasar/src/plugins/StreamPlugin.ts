import { WebSocket, WebSocketServer } from 'ws'
import type { QuasarAgent } from '../QuasarAgent'
import type { QuasarPlugin } from './QuasarPlugin'

export interface StreamPluginOptions {
  port?: number
  path?: string
  authKey?: string
}

export class StreamPlugin implements QuasarPlugin {
  name = 'stream'
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()

  constructor(private options: StreamPluginOptions = {}) {}

  onRegister(agent: QuasarAgent): void {
    agent.on('log', (payload: any) => {
      this.broadcast({ type: 'log', data: payload })
    })

    agent.on('error', (payload: any) => {
      this.broadcast({ type: 'error', data: payload })
    })
  }

  async onStart(_agent: QuasarAgent): Promise<void> {
    const port = this.options.port || 9998
    const path = this.options.path || '/stream'

    this.wss = new WebSocketServer({ port, path })

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws)
      console.log(`[StreamPlugin] Client connected. Total: ${this.clients.size}`)

      ws.on('close', () => {
        this.clients.delete(ws)
        console.log(`[StreamPlugin] Client disconnected. Total: ${this.clients.size}`)
      })
    })

    console.log(`[StreamPlugin] WebSocket stream server listening on port ${port}${path}`)
  }

  async onStop(_agent: QuasarAgent): Promise<void> {
    if (this.wss) {
      for (const client of this.clients) {
        client.terminate()
      }
      this.clients.clear()
      await new Promise<void>((resolve) => this.wss?.close(() => resolve()))
      this.wss = null
    }
  }

  private broadcast(message: any): void {
    const data = JSON.stringify(message)
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  }
}
