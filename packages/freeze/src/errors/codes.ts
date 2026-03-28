/**
 * Error codes for the freeze package.
 * @public
 */
export const FreezeErrorCodes = {
  INVALID_ABSOLUTE_PATH: 'freeze.invalid_absolute_path',
} as const

export type FreezeErrorCode = (typeof FreezeErrorCodes)[keyof typeof FreezeErrorCodes]
