import type { QueueBridge } from '../bridges/types'
import type { QuasarAgent } from '../QuasarAgent'
import type { QueueProbe } from '../types'

export interface QuasarPlugin {
  name: string
  onRegister?(agent: QuasarAgent): void
  onStart?(agent: QuasarAgent): Promise<void>
  onStop?(agent: QuasarAgent): Promise<void>
  /**
   * Called when the agent configuration is updated at runtime.
   *
   * Allows the plugin to react to configuration changes (e.g., updating local thresholds)
   * without needing a full agent restart.
   *
   * @param agent - The QuasarAgent instance.
   * @param options - Partial options containing the updated configuration fields.
   * @since 9.0.0
   */
  onConfigUpdate?(agent: QuasarAgent, options: any): void
}

export class PluginRegistry {
  private probeFactories = new Map<string, (monitorRedis: any, name: string) => QueueProbe>()
  private bridgeFactories = new Map<
    string,
    (redis: any, prefix: string, workerId: string, options: any) => QueueBridge
  >()

  registerProbe(type: string, factory: (monitorRedis: any, name: string) => QueueProbe): void {
    this.probeFactories.set(type, factory)
  }

  registerBridge(
    type: string,
    factory: (redis: any, prefix: string, workerId: string, options: any) => QueueBridge
  ): void {
    this.bridgeFactories.set(type, factory)
  }

  getProbe(type: string, monitorRedis: any, name: string): QueueProbe | undefined {
    const factory = this.probeFactories.get(type)
    return factory ? factory(monitorRedis, name) : undefined
  }

  getBridge(
    type: string,
    redis: any,
    prefix: string,
    workerId: string,
    options: any
  ): QueueBridge | undefined {
    const factory = this.bridgeFactories.get(type)
    return factory ? factory(redis, prefix, workerId, options) : undefined
  }
}
