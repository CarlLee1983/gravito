export class QuasarError extends Error {
  constructor(
    public code: string,
    message: string,
    public cause?: unknown
  ) {
    super(`[${code}] ${message}`)
    this.name = 'QuasarError'
  }
}
