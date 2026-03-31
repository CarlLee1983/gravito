import { describe, expect, test } from 'bun:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { openapiGenerate } from '../src/commands/openapiGenerate'

async function createFixture() {
  const dir = await fs.mkdtemp(path.join(import.meta.dir, 'temp-openapi-'))
  return {
    dir,
    entry: path.join(dir, 'app.ts'),
    output: path.join(dir, 'openapi.json'),
  }
}

describe('OpenAPI Generation (Phase 30)', () => {
  test('should generate openapi.json with zod schemas', async () => {
    const fixture = await createFixture()

    try {
      const appContent = `
import { PlanetCore } from "${path.resolve(process.cwd(), 'packages/core/src/index.ts')}";
import { z } from "zod";

const core = new PlanetCore();
core.router.get("/users/:id", (c) => c.text("ok"))
  .name("users.show")
  .schema({
    params: z.object({ id: z.string() }),
    response: z.object({ name: z.string() })
  });

export { core };
`
      await fs.writeFile(fixture.entry, appContent)

      await openapiGenerate({ entry: fixture.entry, output: fixture.output })

      const spec = JSON.parse(await fs.readFile(fixture.output, 'utf-8'))

      expect(spec.openapi).toBe('3.1.0')
      expect(spec.paths['/users/{id}']).toBeDefined()
      expect(spec.paths['/users/{id}'].get.operationId).toBe('users.show')
      expect(spec.paths['/users/{id}'].get.parameters).toBeDefined()
      expect(spec.paths['/users/{id}'].get.parameters[0].name).toBe('id')
    } finally {
      await fs.rm(fixture.dir, { recursive: true, force: true })
    }
  })

  test('should produce correct types for number, boolean, and optional fields', async () => {
    const fixture = await createFixture()

    try {
      const appContent = `
import { PlanetCore } from "${path.resolve(process.cwd(), 'packages/core/src/index.ts')}";
import { z } from "zod";

const core = new PlanetCore();
core.router.post("/items", (c) => c.text("ok"))
  .schema({
    body: z.object({
      title: z.string(),
      count: z.number(),
      active: z.boolean().optional(),
    }),
  });

export { core };
`
      await fs.writeFile(fixture.entry, appContent)

      await openapiGenerate({ entry: fixture.entry, output: fixture.output })

      const spec = JSON.parse(await fs.readFile(fixture.output, 'utf-8'))
      const bodySchema = spec.paths['/items'].post.requestBody.content['application/json'].schema

      expect(bodySchema.properties.count.type).toBe('number')
      expect(bodySchema.properties.active.type).toBe('boolean')
      expect(bodySchema.required).toContain('title')
      expect(bodySchema.required).toContain('count')
      expect(bodySchema.required).not.toContain('active')
    } finally {
      await fs.rm(fixture.dir, { recursive: true, force: true })
    }
  })

  test('should include routes without schemas with empty bodies', async () => {
    const fixture = await createFixture()

    try {
      const appContent = `
import { PlanetCore } from "${path.resolve(process.cwd(), 'packages/core/src/index.ts')}";
import { z } from "zod";

const core = new PlanetCore();
core.router.get("/schema", (c) => c.text("ok"))
  .schema({ response: z.object({ ok: z.boolean() }) });
core.router.get("/plain", (c) => c.text("plain"));

export { core };
`
      await fs.writeFile(fixture.entry, appContent)

      await openapiGenerate({ entry: fixture.entry, output: fixture.output })

      const spec = JSON.parse(await fs.readFile(fixture.output, 'utf-8'))
      const plainRoute = spec.paths['/plain'].get
      const schemaRoute = spec.paths['/schema'].get

      expect(schemaRoute).toBeDefined()
      expect(plainRoute).toBeDefined()
      expect(plainRoute.responses['200'].description).toBe('Successful response')
      expect(plainRoute.requestBody).toBeUndefined()
    } finally {
      await fs.rm(fixture.dir, { recursive: true, force: true })
    }
  })

  test('should include response schema when provided', async () => {
    const fixture = await createFixture()

    try {
      const appContent = `
import { PlanetCore } from "${path.resolve(process.cwd(), 'packages/core/src/index.ts')}";
import { z } from "zod";

const core = new PlanetCore();
core.router.get("/users/:id", (c) => c.text("ok"))
  .schema({
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
  });

export { core };
`
      await fs.writeFile(fixture.entry, appContent)

      await openapiGenerate({ entry: fixture.entry, output: fixture.output })

      const spec = JSON.parse(await fs.readFile(fixture.output, 'utf-8'))
      const responseSchema =
        spec.paths['/users/{id}'].get.responses['200'].content['application/json'].schema

      expect(responseSchema.properties.id.type).toBe('number')
      expect(responseSchema.properties.name.type).toBe('string')
    } finally {
      await fs.rm(fixture.dir, { recursive: true, force: true })
    }
  })

  test('should exit non-zero when schema conversion fails', async () => {
    const fixture = await createFixture()
    const originalExit = process.exit

    try {
      const appContent = `
import { PlanetCore } from "${path.resolve(process.cwd(), 'packages/core/src/index.ts')}";

const core = new PlanetCore();
core.router.post("/broken", (c) => c.text("ok"))
  .schema({
    body: { _def: { typeName: "BrokenSchema" } },
  });

export { core };
`
      await fs.writeFile(fixture.entry, appContent)

      let exitCode: number | undefined
      process.exit = ((code?: number) => {
        exitCode = code
        throw new Error(`process.exit:${String(code)}`)
      }) as typeof process.exit

      await expect(
        openapiGenerate({ entry: fixture.entry, output: fixture.output })
      ).rejects.toThrow('process.exit:1')
      expect(exitCode).toBe(1)
    } finally {
      process.exit = originalExit
      await fs.rm(fixture.dir, { recursive: true, force: true })
    }
  })
})
