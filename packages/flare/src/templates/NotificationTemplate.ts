import { createHtmlRenderCallbacks, getMarkdownAdapter } from '@gravito/core'
import { FlareError } from '../errors/FlareError'
import { FlareErrorCodes } from '../errors/codes'
import { Notification } from '../Notification'
import type { MailMessage, Notifiable, SlackMessage } from '../types'

export interface TemplateData {
  [key: string]: unknown
}

export interface MailTemplate {
  subject: string
  view?: string
  data?: TemplateData
}

export interface SlackTemplate {
  text: string
  channel?: string
  attachments?: Array<{
    color?: string
    title?: string
    text?: string
  }>
}

export abstract class TemplatedNotification extends Notification {
  protected data: TemplateData = {}

  with(data: TemplateData): this {
    this.data = { ...this.data, ...data }
    return this
  }

  protected abstract mailTemplate(): MailTemplate

  protected slackTemplate?(): SlackTemplate

  // Auto-implement toMail
  toMail(notifiable: Notifiable): MailMessage {
    const template = this.mailTemplate()
    return {
      subject: this.interpolate(template.subject),
      view: template.view,
      data: { ...template.data, ...this.data },
      to: this.getRecipientEmail(notifiable),
    }
  }

  // Auto-implement toSlack
  toSlack(_notifiable: Notifiable): SlackMessage {
    if (!this.slackTemplate) {
      throw new FlareError(FlareErrorCodes.TEMPLATE_NOT_DEFINED, 'slackTemplate not defined')
    }
    const template = this.slackTemplate()
    return {
      text: this.interpolate(template.text),
      channel: template.channel,
      attachments: template.attachments,
    }
  }

  /**
   * 將 Markdown 模板渲染為 HTML。
   * 先執行變數插值（`{{var}}`），再將 Markdown 轉為 HTML。
   * 內建 XSS 防護：過濾 script、iframe、event handler 等危險 HTML。
   *
   * 適用於郵件、Slack 等富文本通知頻道。
   *
   * @param template - Markdown 格式的模板字串
   * @returns 安全的 HTML 字串
   *
   * @example
   * ```typescript
   * const html = this.renderMarkdown('# Hello {{name}}')
   * await sendEmail({ htmlBody: html })
   * ```
   */
  protected renderMarkdown(template: string): string {
    if (!template) {
      return ''
    }

    // 1. 執行插值替換
    const interpolated = this.interpolate(template)

    // 2. 取得 Markdown adapter
    const md = getMarkdownAdapter()

    // 3. 使用 render() + sanitizing callbacks 渲染為安全 HTML
    const sanitizeCallbacks = createHtmlRenderCallbacks({
      html: (rawHtml: string) => sanitizeHtml(rawHtml),
    })

    return md.render(interpolated, sanitizeCallbacks)
  }

  protected interpolate(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(this.data[key] ?? `{{${key}}}`))
  }

  private getRecipientEmail(notifiable: Notifiable): string {
    if ('email' in notifiable && typeof (notifiable as any).email === 'string') {
      return (notifiable as any).email
    }
    throw new FlareError(
      FlareErrorCodes.NOTIFIABLE_MISSING_EMAIL,
      'Notifiable does not have an email property'
    )
  }
}

// ============ HTML Sanitization ============

/**
 * 危險 HTML 標籤清單（XSS 防護）
 * @internal
 */
const DANGEROUS_TAGS =
  /^<\/?(?:script|iframe|object|embed|form|input|textarea|button|select|style|link|meta|base)\b[^>]*>$/i

/**
 * HTML event handler 屬性正規表達式
 * @internal
 */
const EVENT_HANDLER_ATTRS = /\s+on\w+\s*=/i

/**
 * 過濾危險的原始 HTML 內容。
 * 移除 script、iframe 等危險標籤以及 event handler 屬性。
 *
 * @param rawHtml - 原始 HTML 字串
 * @returns 過濾後的安全字串（危險內容被替換為空字串）
 * @internal
 */
function sanitizeHtml(rawHtml: string): string {
  // 移除危險標籤
  if (DANGEROUS_TAGS.test(rawHtml.trim())) {
    return ''
  }

  // 移除包含 event handler 的標籤
  if (EVENT_HANDLER_ATTRS.test(rawHtml)) {
    return ''
  }

  return rawHtml
}
