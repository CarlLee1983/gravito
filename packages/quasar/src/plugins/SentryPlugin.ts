import type { QuasarAgent } from '../QuasarAgent'
import type { QuasarPlugin } from './QuasarPlugin'

export interface SentryPluginOptions {
  dsn: string
  environment?: string
  release?: string
  debug?: boolean
}

export class SentryPlugin implements QuasarPlugin {
  name = 'sentry'
  private sentry: any

  constructor(private options: SentryPluginOptions) {}

  onRegister(agent: QuasarAgent): void {
    agent.on('error', (payload: any) => {
      this.reportToSentry(payload)
    })
  }

  async onStart(_agent: QuasarAgent): Promise<void> {
    console.log(`[SentryPlugin] Initializing with DSN: ${this.options.dsn}`)
    this.sentry = {
      captureException: (err: any, context: any) => {
        console.log(`[SentryPlugin] Captured exception: ${err.message}`, context)
      },
    }
  }

  private reportToSentry(payload: any): void {
    if (!this.sentry) {
      return
    }

    const error = new Error(payload.message || 'Unknown Job Error')
    this.sentry.captureException(error, {
      extra: {
        jobId: payload.jobId,
        context: payload.context,
        workerId: payload.workerId,
      },
      tags: {
        service: payload.service,
        level: payload.level,
      },
    })
  }
}
