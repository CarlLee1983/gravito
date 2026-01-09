import type { StorageDriver } from '../types'

export class LocalDriver implements StorageDriver {
  name = 'local'

  constructor(private config: { root: string; url: string }) {}

  async put(file: File, filename: string): Promise<string> {
    const filePath = `${this.config.root}/${filename}`
    await Bun.write(filePath, file)
    return this.url(filename)
  }

  url(filename: string): string {
    return `${this.config.url}/${filename}`
  }
}
