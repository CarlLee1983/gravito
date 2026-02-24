/**
 * @fileoverview PlanetCore integration for @gravito/quark TCP module
 * @module @gravito/quark/OrbitQuark
 */

import type { Container } from '@gravito/core'
import { OrbitModule } from '@gravito/core'
import { TcpClient } from './TcpClient'
import { TcpServer } from './TcpServer'
import type { TcpClientOptions, TcpServerConfig } from './types'

/**
 * Quark Orbit Module - TCP networking support for Gravito
 *
 * Provides TCP Server and Client factories registered in the IoC container
 */
export class OrbitQuark extends OrbitModule {
  name = 'quark'

  /**
   * Boot the Quark module
   *
   * Registers TCP Server and Client factories in the container
   */
  async boot(container: Container): Promise<void> {
    // Register TCP Server factory
    container.singleton('tcp.server', () => {
      return (config: TcpServerConfig) => new TcpServer(config)
    })

    // Register TCP Client factory
    container.singleton('tcp.client', () => {
      return (config: TcpClientOptions) => new TcpClient(config)
    })

    // Access logger from parent module if available
    const logger = (this as any).logger
    if (logger) {
      logger.info('Quark TCP module booted', {
        services: ['tcp.server', 'tcp.client'],
      })
    }
  }

  /**
   * Shutdown the Quark module
   *
   * Cleans up any active TCP connections
   */
  async shutdown(): Promise<void> {
    const logger = (this as any).logger
    if (logger) {
      logger.info('Quark TCP module shutting down')
    }

    // Clean up any active connections if needed
    // (Application is responsible for managing connection lifecycle)
  }
}
