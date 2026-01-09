import { type Container, ServiceProvider } from '@gravito/core'
import type { RippleServer } from '@gravito/ripple'

export class SupportServiceProvider extends ServiceProvider {
  register(_container: Container): void {
    // 注入 Repository 與 Use Cases (略，暫時使用 Mock)
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('🎧 Support Satellite is ready for real-time inquiries')

    // 獲取 Ripple 實體
    const ripple = core.container.make<RippleServer>('ripple.server')

    /**
     * 監聽即時通訊事件
     */
    ripple.on(
      'support:client_message',
      async (_socket, payload: { conversationId: string; text: string }) => {
        core.logger.info(`[Support] New message in ${payload.conversationId}`)

        // 廣播至該對話專屬頻道 (讓客服端即時收到)
        ripple.to(`private-support.chat.${payload.conversationId}`).emit('support:new_message', {
          sender: 'CUSTOMER',
          text: payload.text,
          at: new Date(),
        })

        // 同時通知管理員總收件匣
        ripple.to('presence-support.admin.inbox').emit('support:inbox_update', {
          conversationId: payload.conversationId,
          snippet: payload.text,
        })
      }
    )

    // 註冊管理路由
    core.router.prefix('/api/admin/v1/support').group((router) => {
      router.get('/inbox', (ctx) =>
        ctx.json([
          {
            id: 'SESS-001',
            participant: 'Carl',
            contextType: 'ORDER',
            contextId: 'ORD-9921',
            status: 'PENDING',
          },
          {
            id: 'SESS-002',
            participant: 'Guest_12',
            contextType: 'FORM',
            subject: '網站報價詢問',
            status: 'ACTIVE',
          },
          { id: 'SESS-003', participant: 'Alice', contextType: 'GENERAL', status: 'ACTIVE' },
        ])
      )

      router.get('/conversations/:id/messages', (ctx) =>
        ctx.json([
          { id: 'msg-1', sender: 'CUSTOMER', content: '您好，我對這張訂單有疑問', at: new Date() },
        ])
      )
    })
  }
}
