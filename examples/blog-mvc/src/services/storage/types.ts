export interface StorageDriver {
  name: string
  put(file: File, filename: string): Promise<string>
  url(filename: string): string
}
