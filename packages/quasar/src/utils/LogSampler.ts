export interface SamplingOptions {
  rate?: number
  threshold?: number
  neverSample?: Array<'info' | 'success' | 'warning' | 'error'>
  adaptive?: boolean
}

export class LogSampler {
  private eventCount = 0
  private lastReset = Date.now()
  private currentRate = 0
  private nextTickCheck = 0

  constructor(private options: SamplingOptions = {}) {
    this.options.rate = options.rate ?? 0.1
    this.options.threshold = options.threshold ?? 500
    this.options.neverSample = options.neverSample ?? ['error', 'warning']
    this.options.adaptive = options.adaptive ?? true
  }

  shouldLog(level: 'info' | 'success' | 'warning' | 'error' = 'info'): boolean {
    if (this.options.neverSample?.includes(level)) {
      return true
    }

    this.eventCount++

    if (this.eventCount >= this.nextTickCheck) {
      const now = Date.now()
      const elapsed = now - this.lastReset

      if (elapsed >= 1000) {
        this.currentRate = this.eventCount / (elapsed / 1000)
        this.eventCount = 0
        this.lastReset = now
        this.nextTickCheck = Math.max(100, Math.floor(this.currentRate / 10))
      } else {
        this.nextTickCheck += 100
      }
    }

    if (this.currentRate <= (this.options.threshold || 500)) {
      return true
    }

    let targetRate = this.options.rate || 0.1

    if (this.options.adaptive) {
      const excessRatio = this.currentRate / (this.options.threshold || 500)
      targetRate = Math.max(0.01, targetRate / excessRatio)
    }

    return Math.random() < targetRate
  }

  updateThreshold(threshold: number): void {
    this.options.threshold = threshold
  }

  getCurrentRate(): number {
    return this.currentRate
  }

  reset(): void {
    this.eventCount = 0
    this.lastReset = Date.now()
    this.currentRate = 0
  }
}
