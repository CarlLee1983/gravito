// Basic options interface for Hono client
export interface BeamOptions {
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
  // Reserved for future extensions like:
  // auth?: { type: 'bearer' | 'cookie', token: string }
  // onError?: (error: Error) => void
}
