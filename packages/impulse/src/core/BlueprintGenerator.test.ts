import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { BlueprintGenerator } from './BlueprintGenerator'

describe('BlueprintGenerator', () => {
  it('should generate blueprint for basic Zod schema', () => {
    const schema = z.object({
      name: z.string().min(2).max(50),
      email: z.string().email(),
      age: z.number().int().min(18).optional(),
      isActive: z.boolean().default(true),
    })

    const blueprint = BlueprintGenerator.generateBlueprint(schema, 'json')

    expect(blueprint.source).toBe('json')
    expect(blueprint.rules).toHaveProperty('name')
    expect(blueprint.rules.name).toEqual({
      type: 'string',
      required: true,
      min: 2,
      max: 50,
    })

    expect(blueprint.rules.email).toEqual({
      type: 'string',
      required: true,
      format: 'email',
    })

    expect(blueprint.rules.age).toEqual({
      type: 'number',
      required: false,
      integer: true,
      min: 18,
    })

    expect(blueprint.rules.isActive).toEqual({
      type: 'boolean',
      required: false,
      default: true,
    })
  })

  it('should handle nested Zod schemas', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          bio: z.string().max(100),
        }),
      }),
    })

    const blueprint = BlueprintGenerator.generateBlueprint(schema, 'json')

    expect(blueprint.source).toBe('json')
    expect(blueprint.rules).toHaveProperty('user')
  })

  it('should return empty rules for non-Zod schemas', () => {
    const schema = { random: 'object' }
    const blueprint = BlueprintGenerator.generateBlueprint(schema, 'json')

    expect(blueprint.source).toBe('json')
    expect(blueprint.rules).toEqual({})
  })
})
