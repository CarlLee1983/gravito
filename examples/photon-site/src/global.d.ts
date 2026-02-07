// Global type definitions for Bun
// Used when bun-types is not available (e.g. in frontend packages)

declare global {
  var Bun: {
    file: (path: string) => Blob
    write: (path: string, content: string | Blob | ArrayBuffer | ArrayBufferView) => Promise<number>
    serve: (options: any) => any
    [key: string]: any
  }
}

export {}
