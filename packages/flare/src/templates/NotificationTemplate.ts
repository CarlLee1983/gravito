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
      throw new Error('slackTemplate not defined')
    }
    const template = this.slackTemplate()
    return {
      text: this.interpolate(template.text),
      channel: template.channel,
      attachments: template.attachments,
    }
  }

  private interpolate(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(this.data[key] ?? `{{${key}}}`))
  }

  private getRecipientEmail(notifiable: Notifiable): string {
    if ('email' in notifiable && typeof (notifiable as any).email === 'string') {
      return (notifiable as any).email
    }
    throw new Error('Notifiable does not have an email property')
  }
}
