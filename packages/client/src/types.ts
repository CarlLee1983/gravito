// Basic options interface inheriting from RequestInit to support fetch options
export interface GravitoClientOptions extends RequestInit {
  // Reserved for future extensions like:
  // auth?: { type: 'bearer' | 'cookie', token: string }
  // onError?: (error: Error) => void
}
