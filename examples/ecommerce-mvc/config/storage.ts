/**
 * Storage Configuration
 *
 * Configure S3-compatible storage for product images and assets.
 * Uses MinIO for local development simulation.
 */

export const storageConfig = {
  /**
   * Default storage disk
   */
  default: process.env.STORAGE_DISK || 's3',

  /**
   * Storage disks
   */
  disks: {
    /**
     * S3-compatible storage (MinIO for development)
     */
    s3: {
      driver: 's3' as const,
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      bucket: process.env.S3_BUCKET || 'ecommerce',
      accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      region: process.env.S3_REGION || 'us-east-1',
      forcePathStyle: true, // Required for MinIO
    },

    /**
     * Local filesystem storage (fallback)
     */
    local: {
      driver: 'local' as const,
      root: './storage/uploads',
      publicUrl: '/uploads',
    },
  },

  /**
   * Upload configurations
   */
  uploads: {
    products: {
      path: 'products',
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    categories: {
      path: 'categories',
      maxSize: 2 * 1024 * 1024, // 2MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  },
}

export type StorageConfig = typeof storageConfig
