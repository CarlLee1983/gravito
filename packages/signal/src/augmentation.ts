export {}

// Module augmentation for GravitoVariables (new abstraction)
declare module 'gravito-core' {
  interface GravitoVariables {
    /** Mail service for sending emails */
    mail?: {
      // Use any for params to break circularity in dts generation if any
      send: (mailable: any) => Promise<void>
      queue: (mailable: any) => Promise<void>
    }
  }
}
