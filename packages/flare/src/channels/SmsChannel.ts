import type { Notification } from '../Notification'
import type { Notifiable, NotificationChannel, SmsMessage } from '../types'

/**
 * SMS channel configuration.
 */
export interface SmsChannelConfig {
  provider: string
  // Twilio
  apiKey?: string
  apiSecret?: string
  from?: string
  // AWS SNS
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
}

/**
 * SMS channel.
 *
 * Sends notifications via an SMS provider.
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
  private async sendViaTwilio(message: SmsMessage): Promise<void> {
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
  private async sendViaAwsSns(message: SmsMessage): Promise<void> {
    // Lazy load AWS SDK
    let SNSClient: typeof import('@aws-sdk/client-sns').SNSClient
    let PublishCommand: typeof import('@aws-sdk/client-sns').PublishCommand

    try {
      const awsSns = await import('@aws-sdk/client-sns')
      SNSClient = awsSns.SNSClient
      PublishCommand = awsSns.PublishCommand
    } catch {
      throw new Error(
        'AWS SNS SMS requires @aws-sdk/client-sns. ' +
          'Install it with: bun add @aws-sdk/client-sns'
      )
    }

    const client = new SNSClient({
      region: this.config.region || 'us-east-1',
      credentials:
        this.config.accessKeyId && this.config.secretAccessKey
          ? {
              accessKeyId: this.config.accessKeyId,
              secretAccessKey: this.config.secretAccessKey,
            }
          : undefined, // Use environment variables or IAM role
    })

    const command = new PublishCommand({
      PhoneNumber: message.to,
      Message: message.message,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: message.from || this.config.from || 'GRAVITO',
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional', // Or 'Promotional'
        },
      },
    })

    try {
      await client.send(command)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      throw new Error(`Failed to send SMS via AWS SNS: ${err.message}`)
    }
  }
}
