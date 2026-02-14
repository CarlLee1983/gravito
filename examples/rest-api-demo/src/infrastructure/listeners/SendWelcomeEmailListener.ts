/**
 * 發送歡迎郵件監聽器
 * 監聽 user:created 事件，新用戶建立後發送歡迎郵件
 */
import type { UserCreated } from '../../domain/user/events/UserCreated'

export class SendWelcomeEmailListener {
  async handle(event: UserCreated): Promise<void> {
    const { email, name } = event.payload

    // 模擬發送歡迎郵件
    console.log(`[Email] 發送歡迎郵件到 ${email}...`)

    // 在實際應用中，這裡應該調用郵件服務
    // await this.emailService.send({
    //   to: email,
    //   subject: '歡迎加入我們！',
    //   template: 'welcome',
    //   data: { name }
    // })

    console.log(`[Email] ✅ 歡迎郵件已發送給 ${name} (${email})`)
  }

  /**
   * 指定此監聽器監聽的事件名稱
   */
  static get events(): string[] {
    return ['user:created']
  }
}
