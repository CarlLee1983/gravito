import { describe, expect, test } from 'bun:test'
import {
  MissionAssigned,
  RefurbishmentCompleted,
  RocketIgnited,
  RocketSplashedDown,
} from '../src/Domain/Events'
import { Mission } from '../src/Domain/Mission'
import { Rocket } from '../src/Domain/Rocket'
import { RocketStatus } from '../src/Domain/RocketStatus'

describe('Rocket', () => {
  test('transitions through mission lifecycle and emits events', () => {
    const mission = Mission.create({
      id: 'mission-1',
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      commitSha: 'abc123',
    })
    const rocket = new Rocket('rocket-1', 'container-1')

    rocket.assignMission(mission)
    expect(rocket.status).toBe(RocketStatus.PREPARING)
    expect(rocket.currentMission).toBe(mission)
    expect(rocket.pullDomainEvents()[0]).toBeInstanceOf(MissionAssigned)

    rocket.ignite()
    expect(rocket.status).toBe(RocketStatus.ORBITING)
    expect(rocket.pullDomainEvents()[0]).toBeInstanceOf(RocketIgnited)

    rocket.splashDown()
    expect(rocket.status).toBe(RocketStatus.REFURBISHING)
    expect(rocket.pullDomainEvents()[0]).toBeInstanceOf(RocketSplashedDown)

    rocket.finishRefurbishment()
    expect(rocket.status).toBe(RocketStatus.IDLE)
    expect(rocket.currentMission).toBeNull()
    expect(rocket.pullDomainEvents()[0]).toBeInstanceOf(RefurbishmentCompleted)
  })

  test('guards invalid transitions', () => {
    const rocket = new Rocket('rocket-2', 'container-2')

    expect(() => rocket.ignite()).toThrow()
    expect(() => rocket.splashDown()).toThrow()
    rocket.decommission()
    expect(rocket.status).toBe(RocketStatus.DECOMMISSIONED)
  })

  test('assigns domain and serializes/deserializes', () => {
    const mission = Mission.create({
      id: 'mission-2',
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      commitSha: 'def456',
    })
    const rocket = new Rocket('rocket-3', 'container-3')

    rocket.assignDomain('rocket-3.dev.local')
    rocket.assignMission(mission)

    const snapshot = rocket.toJSON()
    const restored = Rocket.fromJSON(snapshot)

    expect(rocket.containerId).toBe('container-3')
    expect(rocket.assignedDomain).toBe('rocket-3.dev.local')
    expect(restored.status).toBe(RocketStatus.PREPARING)
    expect(restored.currentMission).toBe(mission)
    expect(restored.assignedDomain).toBe('rocket-3.dev.local')
  })

  test('rejects assigning mission when not idle', () => {
    const mission = Mission.create({
      id: 'mission-3',
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      commitSha: 'ghi789',
    })
    const rocket = new Rocket('rocket-4', 'container-4')

    rocket.assignMission(mission)
    expect(() => rocket.assignMission(mission)).toThrow('非 IDLE')
  })
})
