import { describe, expect, it } from 'bun:test';
import { HTTPException } from 'hono/http-exception';
import {
  abort,
  abortIf,
  abortUnless,
  blank,
  DumpDieError,
  dataGet,
  dataSet,
  dd,
  dump,
  env,
  filled,
  tap,
  throwIf,
  throwUnless,
  value,
} from '../src/index';

describe('helpers', () => {
  it('tap returns original value and runs callback', () => {
    const calls: unknown[] = [];
    const out = tap({ a: 1 }, (v) => {
      calls.push(v);
    });

    expect(out).toEqual({ a: 1 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ a: 1 });
  });

  it('value returns literal or evaluates factory', () => {
    expect(value(123)).toBe(123);
    expect(value(() => 456)).toBe(456);
    expect(value((a: number, b: number) => a + b, 1, 2)).toBe(3);
  });

  it('blank / filled match common Laravel-like semantics', () => {
    expect(blank(null)).toBe(true);
    expect(blank(undefined)).toBe(true);
    expect(blank('')).toBe(true);
    expect(blank('   ')).toBe(true);

    expect(blank('0')).toBe(false);
    expect(blank(0)).toBe(false);
    expect(blank(false)).toBe(false);

    expect(blank([])).toBe(true);
    expect(blank([0])).toBe(false);

    expect(blank({})).toBe(true);
    expect(blank({ a: 1 })).toBe(false);

    expect(blank(new Map())).toBe(true);
    expect(blank(new Map([['a', 1]]))).toBe(false);
    expect(blank(new Set())).toBe(true);
    expect(blank(new Set([1]))).toBe(false);

    expect(blank(new Date())).toBe(false);

    expect(filled('x')).toBe(true);
    expect(filled('   ')).toBe(false);
  });

  it('dataGet reads nested values by dot path and returns default', () => {
    const target = { user: { profile: { name: 'Carl' } }, items: [{ id: 10 }] };

    expect(dataGet(target, 'user.profile.name')).toBe('Carl');
    expect(dataGet(target, 'items.0.id')).toBe(10);
    expect(dataGet(target, 'missing.path', 'fallback')).toBe('fallback');
    expect(dataGet(target, null)).toEqual(target);
  });

  it('dataSet sets nested values, creates containers, and respects overwrite', () => {
    const target: Record<string, unknown> = {};

    dataSet(target, 'user.profile.name', 'Carl');
    expect(target).toEqual({ user: { profile: { name: 'Carl' } } });

    dataSet(target, 'items.0.id', 10);
    expect(target).toEqual({ user: { profile: { name: 'Carl' } }, items: [{ id: 10 }] });

    dataSet(target, 'user.profile.name', 'New', false);
    expect(dataGet(target, 'user.profile.name')).toBe('Carl');
  });

  it('throwIf / throwUnless throw based on condition', () => {
    expect(() => throwIf(false, 'nope')).not.toThrow();
    expect(() => throwIf(true, 'boom')).toThrow('boom');

    expect(() => throwUnless(true, 'nope')).not.toThrow();
    expect(() => throwUnless(false, () => new Error('boom'))).toThrow('boom');
  });

  it('abort helpers throw HTTPException with status', () => {
    try {
      abort(404, 'Not Found');
    } catch (e) {
      expect(e).toBeInstanceOf(HTTPException);
      const err = e as HTTPException;
      expect(err.status).toBe(404);
      expect(err.message).toBe('Not Found');
    }

    expect(() => abortIf(false, 401)).not.toThrow();
    expect(() => abortIf(true, 401, 'Unauthorized')).toThrow(HTTPException);

    expect(() => abortUnless(true, 403)).not.toThrow();
    expect(() => abortUnless(false, 403)).toThrow(HTTPException);
  });

  it('dump writes via console.dir and dd throws DumpDieError', () => {
    const original = console.dir;
    let calls = 0;
    console.dir = () => {
      calls++;
    };

    try {
      dump(1, { a: 2 });
      expect(calls).toBe(2);

      expect(() => dd('x')).toThrow(DumpDieError);
    } finally {
      console.dir = original;
    }
  });

  it('env reads from Bun.env or process.env with default', () => {
    const key = 'GRAVITO_TEST_ENV_HELPER';
    const original = process.env[key];
    process.env[key] = 'hello';

    try {
      expect(env(key)).toBe('hello');
      delete process.env[key];
      expect(env(key, 'fallback')).toBe('fallback');
    } finally {
      process.env[key] = original;
    }
  });
});
