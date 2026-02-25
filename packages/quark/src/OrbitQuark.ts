/**
 * @fileoverview PlanetCore integration for @gravito/quark TCP module
 * @module @gravito/quark/OrbitQuark
 */

import type { Container, PlanetCore } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { TcpClient } from './TcpClient'
import { TcpServer } from './TcpServer'
import type { TcpClientOptions, TcpServerConfig } from './types'

/**
 * Quark Orbit Module - TCP networking support for Gravito
 *
 * Provides TCP Server and Client factories registered in the IoC container
 */
export class OrbitQuark extends ServiceProvider {
  name = 'quark'

  /**
   * Register the Quark module services
   *
   * Registers TCP Server and Client factories in the container
   */
  register(container: Container): void {
    // Register TCP Server factory
    container.singleton('tcp.server', () => {
      return (config: TcpServerConfig) => new TcpServer(config)
    })

    // Register TCP Client factory
    container.singleton('tcp.client', () => {
      return (config: TcpClientOptions) => new TcpClient(config)
    })
  }

  /**
   * Boot the Quark module
   */
  async boot(core: PlanetCore): Promise<void> {
    const logger = (core as any).logger
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
