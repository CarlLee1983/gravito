/**
 * Global constants for Quasar Agent.
 *
 * @public
 * @since 3.0.0
 */

export const QUASAR_DEFAULTS = {
  /** Default Redis URL */
  REDIS_URL: 'redis://localhost:6379',
  /** Default heartbeat interval in ms */
  HEARTBEAT_INTERVAL: 10000,
  /** Default probe cache timeout in ms */
  PROBE_CACHE_TIMEOUT: 1000,
} as const

export const QUASAR_KEYS = {
  /** Prefix for node heartbeat keys */
  NODE_PREFIX: 'gravito:quasar:node:',
  /** Prefix for command channels */
  COMMAND_PREFIX: 'gravito:quasar:cmd:',
  /** Prefix for Zenith console logs (legacy support) */
  ZENITH_LOG_PREFIX: 'flux_console:',
} as const

export const QUASAR_CHANNELS = {
  /** Suffix for broadcast commands */
  BROADCAST_SUFFIX: '*',
} as const
