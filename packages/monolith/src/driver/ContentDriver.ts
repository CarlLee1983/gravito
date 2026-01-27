export interface ContentDriver {
  read(path: string): Promise<string>
  exists(path: string): Promise<boolean>
  list(dir: string): Promise<string[]>
}
