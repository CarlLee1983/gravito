import type { StorageDriver } from '../types'

export class MockCloudDriver implements StorageDriver {
  name = 's3-mock'

  constructor(private config: { bucket: string; region: string; cdnUrl: string }) {}

  async put(file: File, filename: string): Promise<string> {
    console.log(`[MockCloud] Starting upload for ${filename} (${file.size} bytes)`)
    console.log(
      `[MockCloud] Destination: s3://${this.config.bucket}/${this.config.region}/${filename}`
    )

    // Simulate network latency (500ms - 1500ms)
    const latency = 500 + Math.random() * 1000
    await new Promise((resolve) => setTimeout(resolve, latency))

    console.log(`[MockCloud] Upload complete after ${Math.round(latency)}ms`)

    return this.url(filename)
  }

  url(filename: string): string {
    return `${this.config.cdnUrl}/${filename}`
  }
}
