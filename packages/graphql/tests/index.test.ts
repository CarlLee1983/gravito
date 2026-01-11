import { describe, expect, it } from 'bun:test'
import { OrbitGraphQL } from '../src/index'

describe('OrbitGraphQL', () => {
  it('should be defined', () => {
    expect(OrbitGraphQL).toBeDefined()
  })

  it('should instantiate with config', () => {
    const orbit = new OrbitGraphQL({ path: '/api/graphql' })
    expect(orbit).toBeInstanceOf(OrbitGraphQL)
  })
})
