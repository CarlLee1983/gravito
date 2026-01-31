import type { Notification } from '../Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel, SmsMessage } from '../types'
import { TimeoutChannel } from './TimeoutChannel'

/**
 * 預設 timeout 時間（毫秒）
 */
const DEFAULT_TIMEOUT_MS = 30_000 // 30 秒

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
  /**
   * Timeout 時間（毫秒），預設 30000ms (30秒)。
   */
  timeout?: number
  /**
   * Timeout 發生時的回調函數。
   */
  onTimeout?: (channel: string, notification: Notification) => void
}

/**
 * SMS channel.
 *
 * Sends notifications via an SMS provider.
 */
export class SmsChannel implements NotificationChannel {
  private timeoutChannel: TimeoutChannel

  constructor(private config: SmsChannelConfig) {
    // 建立內部 channel
    const innerChannel: NotificationChannel = {
      send: async (
        notification: Notification,
        notifiable: Notifiable,
        options?: AbortableSendOptions
      ) => {
        if (!notification.toSms) {
          throw new Error('Notification does not implement toSms method')
        }

        const smsMessage = notification.toSms(notifiable)

        // Implement per provider with AbortSignal support
        switch (this.config.provider) {
          case 'twilio':
            await this.sendViaTwilio(smsMessage, options?.signal)
            break
          case 'aws-sns':
            await this.sendViaAwsSns(smsMessage, options?.signal)
            break
          default:
            throw new Error(`Unsupported SMS provider: ${this.config.provider}`)
        }
      },
    }

    // 使用 TimeoutChannel 包裝
    const timeout = this.config.timeout ?? DEFAULT_TIMEOUT_MS
    this.timeoutChannel = new TimeoutChannel(innerChannel, {
      timeout,
      onTimeout: this.config.onTimeout,
    })
  }

  async send(
    notification: Notification,
    notifiable: Notifiable,
    options?: AbortableSendOptions
  ): Promise<void> {
    return this.timeoutChannel.send(notification, notifiable, options)
  }

  /**
   * Send SMS via Twilio with AbortSignal support.
   */
  private async sendViaTwilio(message: SmsMessage, signal?: AbortSignal): Promise<void> {
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
        signal, // 傳遞 AbortSignal 給 fetch
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send SMS via Twilio: ${error}`)
    }
  }

  /**
   * Send SMS via AWS SNS with AbortSignal support.
   */
  private async sendViaAwsSns(message: SmsMessage, signal?: AbortSignal): Promise<void> {
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
      // AWS SDK v3 支援 abortSignal
      await client.send(command, { abortSignal: signal })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      throw new Error(`Failed to send SMS via AWS SNS: ${err.message}`)
    }
  }
}
