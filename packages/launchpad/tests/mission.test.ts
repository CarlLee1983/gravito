import { describe, expect, test } from 'bun:test'
import { Mission } from '../src/Domain/Mission'

describe('Mission', () => {
  test('exposes mission properties', () => {
    const mission = Mission.create({
      id: 'm1',
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      commitSha: 'abc123',
    })

    expect(mission.id).toBe('m1')
    expect(mission.repoUrl).toBe('https://example.com/repo.git')
    expect(mission.branch).toBe('main')
    expect(mission.commitSha).toBe('abc123')
  })
})
