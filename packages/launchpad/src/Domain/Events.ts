import { DomainEvent } from '@gravito/enterprise'

export class MissionAssigned extends DomainEvent {
  constructor(
    public readonly rocketId: string,
    public readonly missionId: string
  ) {
    super()
  }
}

export class RocketIgnited extends DomainEvent {
  constructor(public readonly rocketId: string) {
    super()
  }
}

export class RocketSplashedDown extends DomainEvent {
  constructor(public readonly rocketId: string) {
    super()
  }
}

export class RefurbishmentCompleted extends DomainEvent {
  constructor(public readonly rocketId: string) {
    super()
  }
}
