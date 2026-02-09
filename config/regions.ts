/**
 * 多區域部署配置
 *
 * 定義 4 個全球區域的連接配置
 * 支持地域親和度路由和自動故障轉移
 */

import type { RegionConfig } from '../satellites/flash-sale/src/Infrastructure/Cache/MultiRegionCacheService'

/**
 * 多區域配置
 *
 * 支持 4 個全球區域：
 * - US East (Primary) - 主區域
 * - US West
 * - EU West
 * - AP Southeast
 */
export const regionsConfig: RegionConfig[] = [
  {
    name: 'us-east',
    connectionName: 'redis-us-east',
    prefix: 'flash-sale:us-east:',
    isPrimary: true,
    endpoints: ['https://api-us-east.example.com', 'https://us-east-1.example.com'],
    healthCheckUrl: 'https://api-us-east.example.com/health',
    timezone: 'America/New_York',
  },
  {
    name: 'us-west',
    connectionName: 'redis-us-west',
    prefix: 'flash-sale:us-west:',
    isPrimary: false,
    endpoints: ['https://api-us-west.example.com', 'https://us-west-2.example.com'],
    healthCheckUrl: 'https://api-us-west.example.com/health',
    timezone: 'America/Los_Angeles',
  },
  {
    name: 'eu-west',
    connectionName: 'redis-eu-west',
    prefix: 'flash-sale:eu-west:',
    isPrimary: false,
    endpoints: ['https://api-eu-west.example.com', 'https://eu-west-1.example.com'],
    healthCheckUrl: 'https://api-eu-west.example.com/health',
    timezone: 'Europe/London',
  },
  {
    name: 'ap-southeast',
    connectionName: 'redis-ap-southeast',
    prefix: 'flash-sale:ap-southeast:',
    isPrimary: false,
    endpoints: ['https://api-ap-southeast.example.com', 'https://ap-southeast-1.example.com'],
    healthCheckUrl: 'https://api-ap-southeast.example.com/health',
    timezone: 'Asia/Singapore',
  },
]

export default regionsConfig
