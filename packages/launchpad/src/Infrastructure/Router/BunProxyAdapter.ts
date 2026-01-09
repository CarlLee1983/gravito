import { getRuntimeAdapter } from '@gravito/core'
import type { IRouterAdapter } from '../../Domain/Interfaces'

export class BunProxyAdapter implements IRouterAdapter {
  private routes = new Map<string, string>() // domain -> targetUrl

  register(domain: string, targetUrl: string): void {
    console.log(`[Proxy] 註冊路由: ${domain} -> ${targetUrl}`)
    this.routes.set(domain.toLowerCase(), targetUrl)
  }

  unregister(domain: string): void {
    console.log(`[Proxy] 註銷路由: ${domain}`)
    this.routes.delete(domain.toLowerCase())
  }

  start(port: number): void {
    const self = this
    const runtime = getRuntimeAdapter()

    runtime.serve({
      port,
      async fetch(request) {
        const host = request.headers.get('host')?.split(':')[0]?.toLowerCase()

        if (!host || !self.routes.has(host)) {
          return new Response('Rocket Not Found or Mission Not Started', { status: 404 })
        }

        const targetBase = self.routes.get(host)!
        const url = new URL(request.url)
        const targetUrl = `${targetBase}${url.pathname}${url.search}`

        console.log(`[Proxy] 轉發: ${host}${url.pathname} -> ${targetUrl}`)

        // 建立轉發請求，克隆標頭與方法
        try {
          const proxyReq = new Request(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
            // @ts-expect-error Bun specific
            duplex: 'half',
          })

          return await fetch(proxyReq)
        } catch (error: any) {
          console.error(`[Proxy] 轉發失敗: ${error.message}`)
          return new Response('Proxy Error', { status: 502 })
        }
      },
    })

    console.log(`[Proxy] 動態路由伺服器已啟動於 Port: ${port}`)
  }
}
