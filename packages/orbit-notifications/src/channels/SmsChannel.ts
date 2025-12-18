import type { Notification } from '../Notification'
import type { Notifiable, NotificationChannel } from '../types'

/**
 * SMS channel configuration.
 */
export interface SmsChannelConfig {
  provider: string
  apiKey?: string
  apiSecret?: string
  from?: string
}

/**
 * SMS channel.
 *
 * Sends notifications via an SMS provider.
 * Only a basic interface is provided; real implementations should be extended per provider.
 */
export class SmsChannel implements NotificationChannel {
  constructor(private config: SmsChannelConfig) {}

  async send(notification: Notification, notifiable: Notifiable): Promise<void> {
    if (!notification.toSms) {
      throw new Error('Notification does not implement toSms method')
    }

    const smsMessage = notification.toSms(notifiable)

    // Implement per provider.
    switch (this.config.provider) {
      case 'twilio':
        await this.sendViaTwilio(smsMessage)
        break
      case 'aws-sns':
        await this.sendViaAwsSns(smsMessage)
        break
      default:
        throw new Error(`Unsupported SMS provider: ${this.config.provider}`)
    }
  }

  /**
   * Send SMS via Twilio.
   */
  private async sendViaTwilio(message: import('../types').SmsMessage): Promise<void> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('Twilio API key and secret are required')
    }

    const accountSid = this.config.apiKey
    const authToken = this.config.apiSecret

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: this.config.from || '',
          To: message.to,
          Body: message.message,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send SMS via Twilio: ${error}`)
    }
  }

  /**
   * Send SMS via AWS SNS.
   */
  private async sendViaAwsSns(message: import('../types').SmsMessage): Promise<void> {
    // AWS SNS implementation requires AWS SDK.
    // This is only a placeholder; install `@aws-sdk/client-sns` and implement it.
    throw new Error('AWS SNS SMS provider not yet implemented. Please install @aws-sdk/client-sns')
  }
}
