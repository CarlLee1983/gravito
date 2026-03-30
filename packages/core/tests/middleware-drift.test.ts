import { expect, test, describe } from "bun:test";
import { BunNativeAdapter } from "../src/adapters/bun/BunNativeAdapter";
import { MiddlewareDriftException } from "../src/exceptions";

describe("BunNativeAdapter Middleware Drift", () => {
  test("should throw MiddlewareDriftException when adding route after serveConfig()", () => {
    const adapter = new BunNativeAdapter();
    adapter.serveConfig();

    expect(() => {
      adapter.route("get", "/test", async () => new Response("ok"));
    }).toThrow(MiddlewareDriftException);
  });

  test("should throw MiddlewareDriftException when adding middleware after serveConfig()", () => {
    const adapter = new BunNativeAdapter();
    adapter.serveConfig();

    expect(() => {
      adapter.use("/test", async (ctx, next) => next());
    }).toThrow(MiddlewareDriftException);
  });

  test("should throw MiddlewareDriftException when adding fast-path after serveConfig()", () => {
    const adapter = new BunNativeAdapter();
    adapter.serveConfig();

    expect(() => {
      adapter.registerFastPath("get", "/fast", async () => new Response("fast"));
    }).toThrow(MiddlewareDriftException);
  });

  test("should NOT throw in production even after serveConfig()", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const adapter = new BunNativeAdapter();
      adapter.serveConfig();

      // Should not throw in production (silent ignore or best effort)
      expect(() => {
        adapter.route("get", "/prod", async () => new Response("ok"));
      }).not.toThrow();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
