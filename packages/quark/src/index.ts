/**
 * @gravito/quark - High-performance TCP networking for Gravito Galaxy Architecture
 *
 * Provides type-safe TCP Server and Client built on Bun's native networking APIs.
 * Supports custom frame protocols for message delimiting, automatic retry with exponential backoff,
 * and backpressure management for efficient data streaming.
 *
 * @packageDocumentation
 */

// Errors
export { QuarkError } from './errors/QuarkError'
export { QuarkErrorCodes } from './errors/codes'
export type { QuarkErrorCode } from './errors/codes'
// Integration
export { OrbitQuark } from './OrbitQuark'
// Protocols
export { FrameProtocol, LineProtocol } from './protocols/FrameProtocol'
export { TcpClient } from './TcpClient'
export { TcpConnection } from './TcpConnection'
// Core classes
export { TcpServer } from './TcpServer'
// Type definitions
export type {
  CustomProtocol,
  FrameProtocolConfig,
  ITcpClient,
  ITcpConnection,
  ITcpServer,
  LineProtocolConfig,
  RetryOptions,
  TcpClientOptions,
  TcpServerConfig,
} from './types'
export { ConnectionState } from './types'
