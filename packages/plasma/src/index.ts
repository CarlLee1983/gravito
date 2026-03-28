/**
 * @gravito/plasma
 * Redis client for Gravito - Bun native, Laravel-style API
 */

export { BunRedisClient } from './clients/BunRedisClient'
export { RedisError } from './errors'
export type { OrbitPlasmaOptions } from './OrbitPlasma'
// Orbit export
export { OrbitPlasma } from './OrbitPlasma'
// Main exports
export { Redis } from './Redis'
export { RedisManager } from './RedisManager'

export * from './errors/codes'

// Type exports
export type {
  PipelineResult,
  RedisClientContract,
  RedisConfig,
  RedisManagerConfig,
  RedisPipelineContract,
  ScanOptions,
  ScanResult,
  SetOptions,
  TLSOptions,
  ZAddOptions,
  ZRangeOptions,
} from './types'
