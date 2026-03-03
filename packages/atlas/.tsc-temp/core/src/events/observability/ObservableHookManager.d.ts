/**
 * @gravito/core - Observable Hook Manager
 *
 * Wraps HookManager with observability support (metrics and tracing).
 */
import { HookManager, type HookManagerConfig } from '../../HookManager'
import type { EventOptions } from '../EventOptions'
import { EventMetrics } from './EventMetrics'
import { EventTracer } from './EventTracer'
import { EventTracing } from './EventTracing'
/**
 * Configuration for observability features.
 * @public
 */
export interface ObservabilityConfig {
  /**
   * Enable observability features.
   * @default false
   */
  enabled?: boolean
  /**
   * MetricsRegistry instance from @gravito/monitor.
   * Required if metrics collection is enabled.
   */
  metrics?: any
  /**
   * Enable OpenTelemetry distributed tracing.
   * @default false
   */
  tracing?: boolean
  /**
   * Prefix for metric names.
   * @default 'gravito_event_'
   */
  metricsPrefix?: string
}
/**
 * Observable Hook Manager - extends HookManager with observability.
 *
 * Provides metrics and distributed tracing for event dispatch and listener execution.
 * Maintains 100% backward compatibility with HookManager.
 *
 * @public
 */
export declare class ObservableHookManager extends HookManager {
  private eventMetrics?
  private eventTracer?
  private eventTracing?
  private obsConfig
  /**
   * Create a new ObservableHookManager instance.
   *
   * @param config - HookManager configuration
   * @param obsConfig - Observability configuration
   */
  constructor(config?: HookManagerConfig, obsConfig?: ObservabilityConfig)
  /**
   * Run all registered actions asynchronously via priority queue with observability.
   *
   * This override adds metrics and tracing to the base implementation.
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   * @param options - Event options for async dispatch.
   */
  doActionAsync<TArgs = unknown>(hook: string, args: TArgs, options?: EventOptions): Promise<void>
  /**
   * Run all registered actions synchronously with observability.
   *
   * This override adds metrics and tracing to the base implementation.
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   */
  doActionSync<TArgs = unknown>(hook: string, args: TArgs): Promise<void>
  /**
   * Get the EventMetrics instance.
   *
   * @returns EventMetrics instance if observability is enabled, undefined otherwise
   */
  getMetrics(): EventMetrics | undefined
  /**
   * Get the EventTracer instance.
   *
   * @returns EventTracer instance if tracing is enabled, undefined otherwise
   */
  getTracer(): EventTracer | undefined
  /**
   * Update observability configuration at runtime.
   *
   * @param config - New observability configuration
   */
  setObservabilityConfig(config: Partial<ObservabilityConfig>): void
  /**
   * Get the EventTracing instance.
   *
   * @returns EventTracing instance if tracing is enabled, undefined otherwise
   */
  getEventTracing(): EventTracing | undefined
  /**
   * Get current observability configuration.
   *
   * @returns Current observability configuration
   */
  getObservabilityConfig(): ObservabilityConfig
}
