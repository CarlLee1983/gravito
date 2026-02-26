/**
 * @gravito/core - Prometheus Integration Tests
 *
 * Tests for Prometheus metrics export via OpenTelemetry.
 * Phase 2.2: These tests have been moved to @gravito/monitor
 *
 * @deprecated Tests moved to @gravito/monitor/tests for Phase 2.2
 */

import { describe, it } from 'bun:test'

// Phase 2.2: Prometheus integration tests are now in @gravito/monitor
// Skipping core tests in favor of monitor's comprehensive test suite
describe.skip('Prometheus Integration (Moved to @gravito/monitor)', () => {
  it('placeholder - tests moved to monitor package', () => {
    // Tests moved to @gravito/monitor for Phase 2.2
    // See: @gravito/monitor/tests/adapters/observability-adapter.test.ts
  })
})
