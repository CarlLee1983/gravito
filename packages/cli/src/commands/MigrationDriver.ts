export interface MigrationResult {
  success: boolean
  message: string
  migrations?: string[]
  error?: string
}

export interface MigrationStatus {
  pending: string[]
  applied: string[]
}

export interface MigrationDriver {
  generate(name: string): Promise<MigrationResult>
  migrate(): Promise<MigrationResult>
  fresh(): Promise<MigrationResult>
  status(): Promise<MigrationStatus>
}
