import { describe, expect, it, mock } from 'bun:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { FormRequest, validateRequest } from '../src/FormRequest';

// Test Request Classes
class StoreUserRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    age: z.number().min(18).optional(),
  });
}

class QuerySearchRequest extends FormRequest {
  source = 'query' as const;
  schema = z.object({
    q: z.string().min(1),
    page: z.coerce.number().default(1),
  });
}

class AuthorizedRequest extends FormRequest {
  schema = z.object({
    data: z.string(),
  });

  authorize(ctx: any) {
    return ctx.req.header('X-Admin') === 'true';
  }
}

describe('FormRequest', () => {
  it('should validate JSON body successfully', async () => {
    const app = new Hono();
    app.post('/users', validateRequest(StoreUserRequest), (c) => {
      const data = c.get('validated');
      return c.json({ success: true, data });
    });

    const res = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Carl', email: 'carl@example.com' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Carl');
    expect(json.data.email).toBe('carl@example.com');
  });

  it('should return validation errors for invalid data', async () => {
    const app = new Hono();
    app.post('/users', validateRequest(StoreUserRequest), (c) => {
      return c.json({ success: true });
    });

    const res = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'invalid' }),
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.length).toBeGreaterThan(0);
  });

  it('should validate query parameters', async () => {
    const app = new Hono();
    app.get('/search', validateRequest(QuerySearchRequest), (c) => {
      const data = c.get('validated') as { q: string; page: number };
      return c.json({ query: data.q, page: data.page });
    });

    const res = await app.request('/search?q=hello&page=2');

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.query).toBe('hello');
    expect(json.page).toBe(2);
  });

  it('should reject unauthorized requests', async () => {
    const app = new Hono();
    app.post('/admin', validateRequest(AuthorizedRequest), (c) => {
      return c.json({ success: true });
    });

    // Without X-Admin header
    const res1 = await app.request('/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    });

    expect(res1.status).toBe(403);
    const json1 = await res1.json();
    expect(json1.error.code).toBe('AUTHORIZATION_ERROR');

    // With X-Admin header
    const res2 = await app.request('/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin': 'true' },
      body: JSON.stringify({ data: 'test' }),
    });

    expect(res2.status).toBe(200);
  });

  it('should include field path in error details', async () => {
    class NestedRequest extends FormRequest {
      schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(2),
          }),
        }),
      });
    }

    const app = new Hono();
    app.post('/nested', validateRequest(NestedRequest), (c) => {
      return c.json({ success: true });
    });

    const res = await app.request('/nested', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { profile: { name: 'A' } } }),
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.details[0].field).toBe('user.profile.name');
  });
});
