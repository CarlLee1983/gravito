import '@gravito/core'

declare module '@gravito/core' {
  interface GravitoContext {
    auth?: any
  }
}

declare module '@gravito/cosmos'
