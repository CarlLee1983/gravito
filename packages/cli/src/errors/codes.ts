export const CliErrorCodes = {
  // Command errors
  COMMAND_NOT_FOUND: 'cli.command_not_found',
  EXECUTION_FAILED: 'cli.execution_failed',
  PARSE_ERROR: 'cli.parse_error',
  // Config errors
  CONFIG_ERROR: 'cli.config_error',
  CONFIG_MISSING: 'cli.config_missing',
  ENV_WRITE_FAILED: 'cli.env_write_failed',
  // Entry file errors
  ENTRY_FILE_NOT_FOUND: 'cli.entry_file_not_found',
  ENTRY_FILE_OUTSIDE_PROJECT: 'cli.entry_file_outside_project',
  ENTRY_FILE_INVALID_TYPE: 'cli.entry_file_invalid_type',
  // Database errors
  DATABASE_SERVICE_NOT_FOUND: 'cli.database_service_not_found',
  DATABASE_NO_DEPLOY: 'cli.database_no_deploy',
  // Make command errors
  STUB_NOT_FOUND: 'cli.stub_not_found',
  UNKNOWN_TYPE: 'cli.unknown_type',
  MAKE_FAILED: 'cli.make_failed',
  // Version errors
  HTTP_ERROR: 'cli.http_error',
  // Route errors
  ROUTE_EXPORT_NOT_FOUND: 'cli.route_export_not_found',
  APP_INSTANCE_NOT_FOUND: 'cli.app_instance_not_found',
  SCHEMA_CONVERSION_FAILED: 'cli.schema_conversion_failed',
  // Install errors
  INSTALL_FAILED: 'cli.install_failed',
} as const

export type CliErrorCode = (typeof CliErrorCodes)[keyof typeof CliErrorCodes]
