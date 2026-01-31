import { DomainEvent } from '@gravito/enterprise'

/**
 * Event emitted when a mission is assigned to a rocket.
 *
 * @public
 * @since 3.0.0
 */
export class MissionAssigned extends DomainEvent {
  constructor(
    public readonly rocketId: string,
    public readonly missionId: string
  ) {
    super()
  }
}

/**
 * Event emitted when a rocket starts its mission (application started).
 *
 * @public
 * @since 3.0.0
 */
export class RocketIgnited extends DomainEvent {
  constructor(public readonly rocketId: string) {
    super()
  }
}

/**
 * Event emitted when a rocket mission is completed or terminated.
 *
 * @public
 * @since 3.0.0
 */
export class RocketSplashedDown extends DomainEvent {
  constructor(public readonly rocketId: string) {
    super()
  }
}

/**
 * Event emitted when a rocket has finished the refurbishment process.
 *
 * @public
 * @since 3.0.0
 */
export class RefurbishmentCompleted extends DomainEvent {
  constructor(public readonly rocketId: string) {
    super()
  }
}

/**
 * Event emitted when the rocket pool is exhausted.
 *
 * @public
 * @since 1.3.0
 */
export class PoolExhausted extends DomainEvent {
  constructor(
    public readonly totalRockets: number,
    public readonly maxRockets: number,
    public readonly queueLength: number
  ) {
    super()
  }
}

/**
 * Event emitted when a mission is queued due to pool exhaustion.
 *
 * @public
 * @since 1.3.0
 */
export class MissionQueued extends DomainEvent {
  constructor(
    public readonly missionId: string,
    public readonly queuePosition: number
  ) {
    super()
  }
}

/**
 * Event emitted when a queued mission times out.
 *
 * @public
 * @since 1.3.0
 */
export class MissionQueueTimeout extends DomainEvent {
  constructor(
    public readonly missionId: string,
    public readonly waitTimeMs: number
  ) {
    super()
  }
}
