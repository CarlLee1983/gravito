/**
 * @gravito/nebula-s3
 *
 * S3 storage driver for @gravito/nebula
 *
 * Supports AWS S3, Cloudflare R2, MinIO, and other S3-compatible services.
 *
 * @packageDocumentation
 */

export { S3Store, type S3StoreOptions } from './S3Store'
export { NebulaS3Error } from './errors/NebulaS3Error'
export { NebulaS3ErrorCodes, type NebulaS3ErrorCode } from './errors/codes'
