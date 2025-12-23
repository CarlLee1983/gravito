import { createRequire } from "node:module";
var __require = /* @__PURE__ */ createRequire(import.meta.url);
// ../core/package.json
var package_default = {
  name: "gravito-core",
  version: "1.0.0-beta.2",
  description: "",
  module: "./dist/index.mjs",
  main: "./dist/index.cjs",
  type: "module",
  types: "./dist/index.d.ts",
  exports: {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.mjs",
      require: "./dist/index.cjs"
    },
    "./compat": {
      types: "./dist/compat.d.ts",
      import: "./dist/compat.mjs",
      require: "./dist/compat.cjs"
    }
  },
  files: [
    "dist",
    "README.md",
    "LICENSE"
  ],
  scripts: {
    build: "bun run build.ts",
    test: "bun test",
    "test:coverage": "bun test --coverage",
    "test:ci": "bun test --coverage --coverage-threshold=100",
    lint: "biome lint ./src ./tests",
    "lint:fix": "biome lint --write ./src ./tests",
    format: "biome format --write ./src ./tests",
    "format:check": "biome format ./src ./tests",
    check: "biome check ./src ./tests",
    "check:fix": "biome check --write ./src ./tests",
    typecheck: "tsc --noEmit",
    prepublishOnly: "bun run typecheck && bun run test && bun run build"
  },
  keywords: [],
  author: "Carl Lee <carllee0520@gmail.com>",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/gravito-framework/gravito.git",
    directory: "packages/core"
  },
  bugs: {
    url: "https://github.com/gravito-framework/gravito/issues"
  },
  homepage: "https://github.com/gravito-framework/gravito#readme",
  engines: {
    node: ">=18.0.0"
  },
  devDependencies: {
    "bun-types": "latest",
    typescript: "^5.9.3"
  },
  publishConfig: {
    access: "public",
    registry: "https://registry.npmjs.org/"
  },
  dependencies: {
    hono: "^4.11.1"
  }
};

// ../core/src/adapters/HonoAdapter.ts
class HonoRequestWrapper {
  honoCtx;
  constructor(honoCtx) {
    this.honoCtx = honoCtx;
  }
  get url() {
    return this.honoCtx.req.url;
  }
  get method() {
    return this.honoCtx.req.method;
  }
  get path() {
    return this.honoCtx.req.path;
  }
  param(name) {
    return this.honoCtx.req.param(name);
  }
  params() {
    return this.honoCtx.req.param();
  }
  query(name) {
    return this.honoCtx.req.query(name);
  }
  queries() {
    return this.honoCtx.req.queries();
  }
  header(name) {
    if (name) {
      return this.honoCtx.req.header(name);
    }
    return this.honoCtx.req.header();
  }
  async json() {
    return this.honoCtx.req.json();
  }
  async text() {
    return this.honoCtx.req.text();
  }
  async formData() {
    return this.honoCtx.req.formData();
  }
  async arrayBuffer() {
    return this.honoCtx.req.arrayBuffer();
  }
  get raw() {
    return this.honoCtx.req.raw;
  }
  valid(target) {
    return this.honoCtx.req.valid(target);
  }
}

class HonoContextWrapper {
  honoCtx;
  _req;
  constructor(honoCtx) {
    this.honoCtx = honoCtx;
    this._req = new HonoRequestWrapper(honoCtx);
  }
  static create(honoCtx) {
    const instance = new HonoContextWrapper(honoCtx);
    return new Proxy(instance, {
      get(target, prop, receiver) {
        if (prop in target) {
          const value = Reflect.get(target, prop, receiver);
          if (typeof value === "function") {
            return value.bind(target);
          }
          return value;
        }
        if (typeof prop === "string") {
          return target.get(prop);
        }
        return;
      }
    });
  }
  get req() {
    return this._req;
  }
  json(data, status) {
    if (status !== undefined) {
      return this.honoCtx.json(data, status);
    }
    return this.honoCtx.json(data);
  }
  text(text, status) {
    if (status !== undefined) {
      return this.honoCtx.text(text, status);
    }
    return this.honoCtx.text(text);
  }
  html(html, status) {
    if (status !== undefined) {
      return this.honoCtx.html(html, status);
    }
    return this.honoCtx.html(html);
  }
  redirect(url, status = 302) {
    return this.honoCtx.redirect(url, status);
  }
  body(data, status) {
    if (data === null) {
      return this.honoCtx.body(null, status);
    }
    return new Response(data, {
      status: status ?? 200,
      headers: new Headers
    });
  }
  stream(stream, status) {
    return new Response(stream, {
      status: status ?? 200,
      headers: {
        "Content-Type": "application/octet-stream"
      }
    });
  }
  header(name, value, options) {
    if (value !== undefined) {
      if (options?.append) {
        this.honoCtx.header(name, value, { append: true });
      } else {
        this.honoCtx.header(name, value);
      }
      return;
    }
    return this.honoCtx.req.header(name);
  }
  status(code) {
    this.honoCtx.status(code);
  }
  get(key) {
    return this.honoCtx.get(key);
  }
  set(key, value) {
    this.honoCtx.set(key, value);
  }
  get executionCtx() {
    return this.honoCtx.executionCtx;
  }
  get env() {
    return this.honoCtx.env;
  }
  get native() {
    return this.honoCtx;
  }
}
function toHonoMiddleware(middleware) {
  return async (c, next) => {
    const ctx = HonoContextWrapper.create(c);
    const gravitoNext = async () => {
      await next();
    };
    return middleware(ctx, gravitoNext);
  };
}
function toHonoErrorHandler(handler) {
  return async (err, c) => {
    const ctx = HonoContextWrapper.create(c);
    return handler(err, ctx);
  };
}

class HonoAdapter {
  config;
  name = "hono";
  version = "1.0.0";
  app;
  constructor(config = {}, honoInstance) {
    this.config = config;
    if (honoInstance) {
      this.app = honoInstance;
    } else {
      const { Hono: HonoClass } = __require("hono");
      this.app = new HonoClass;
    }
  }
  get native() {
    return this.app;
  }
  setNative(app) {
    this.app = app;
  }
  route(method, path, ...handlers) {
    const fullPath = (this.config.basePath || "") + path;
    const honoHandlers = handlers.map((h) => toHonoMiddleware(h));
    const methodFn = this.app[method];
    if (typeof methodFn !== "function") {
      throw new Error(`Unsupported HTTP method: ${method}`);
    }
    methodFn.call(this.app, fullPath, ...honoHandlers);
  }
  routes(routes) {
    for (const routeDef of routes) {
      const middlewareHandlers = (routeDef.middleware || []).map((m) => m);
      const allHandlers = [
        ...middlewareHandlers,
        ...routeDef.handlers
      ];
      this.route(routeDef.method, routeDef.path, ...allHandlers);
    }
  }
  use(path, ...middleware) {
    const fullPath = (this.config.basePath || "") + path;
    const honoMiddleware = middleware.map((m) => toHonoMiddleware(m));
    for (const m of honoMiddleware) {
      this.app.use(fullPath, m);
    }
  }
  useGlobal(...middleware) {
    this.use("*", ...middleware);
  }
  mount(path, subAdapter) {
    if (subAdapter.name === "hono") {
      this.app.route(path, subAdapter.native);
    } else {
      this.use(`${path}/*`, async (ctx) => {
        const response = await subAdapter.fetch(ctx.req.raw);
        return response;
      });
    }
  }
  onError(handler) {
    this.app.onError(toHonoErrorHandler(handler));
  }
  onNotFound(handler) {
    this.app.notFound(async (c) => {
      const ctx = HonoContextWrapper.create(c);
      return handler(ctx);
    });
  }
  fetch = (request, server) => {
    return this.app.fetch(request, server);
  };
  createContext(_request) {
    throw new Error("HonoAdapter.createContext() should not be called directly. " + "Use the router pipeline instead.");
  }
  async init() {}
  async shutdown() {}
}
// ../core/src/ConfigManager.ts
class ConfigManager {
  config = new Map;
  constructor(initialConfig = {}) {
    for (const [key, value] of Object.entries(initialConfig)) {
      this.config.set(key, value);
    }
    this.loadEnv();
  }
  loadEnv() {
    const env = Bun.env;
    for (const key of Object.keys(env)) {
      if (env[key] !== undefined) {
        this.config.set(key, env[key]);
      }
    }
  }
  get(key, defaultValue) {
    if (this.config.has(key)) {
      return this.config.get(key);
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Config key '${key}' not found`);
  }
  set(key, value) {
    this.config.set(key, value);
  }
  has(key) {
    return this.config.has(key);
  }
}
// ../core/src/Container.ts
class Container {
  bindings = new Map;
  instances = new Map;
  bind(key, factory) {
    this.bindings.set(key, { factory, shared: false });
  }
  singleton(key, factory) {
    this.bindings.set(key, { factory, shared: true });
  }
  instance(key, instance) {
    this.instances.set(key, instance);
  }
  make(key) {
    if (this.instances.has(key)) {
      return this.instances.get(key);
    }
    const binding = this.bindings.get(key);
    if (!binding) {
      throw new Error(`Service '${key}' not found in container`);
    }
    const instance = binding.factory(this);
    if (binding.shared) {
      this.instances.set(key, instance);
    }
    return instance;
  }
  has(key) {
    return this.bindings.has(key) || this.instances.has(key);
  }
  flush() {
    this.bindings.clear();
    this.instances.clear();
  }
  forget(key) {
    this.instances.delete(key);
  }
}
// ../core/src/types/events.ts
class Event {
  shouldBroadcast() {
    return "broadcastOn" in this && typeof this.broadcastOn === "function";
  }
  getBroadcastChannel() {
    if (this.shouldBroadcast()) {
      return this.broadcastOn();
    }
    return null;
  }
  getBroadcastData() {
    if (this.shouldBroadcast()) {
      const broadcast = this;
      if (broadcast.broadcastWith) {
        return broadcast.broadcastWith();
      }
      const data = {};
      for (const [key, value] of Object.entries(this)) {
        if (!key.startsWith("_") && typeof value !== "function") {
          data[key] = value;
        }
      }
      return data;
    }
    return {};
  }
  getBroadcastEventName() {
    if (this.shouldBroadcast()) {
      const broadcast = this;
      if (broadcast.broadcastAs) {
        return broadcast.broadcastAs();
      }
    }
    return this.constructor.name;
  }
}
// ../core/src/EventManager.ts
class EventManager {
  core;
  listeners = new Map;
  broadcastManager;
  queueManager;
  constructor(core) {
    this.core = core;
  }
  setBroadcastManager(manager) {
    this.broadcastManager = manager;
  }
  setQueueManager(manager) {
    this.queueManager = manager;
  }
  listen(event, listener, options) {
    const eventKey = typeof event === "string" ? event : event;
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, []);
    }
    const registration = {
      listener,
      ...options
    };
    this.listeners.get(eventKey)?.push(registration);
  }
  unlisten(event, listener) {
    const eventKey = typeof event === "string" ? event : event;
    const registrations = this.listeners.get(eventKey);
    if (!registrations) {
      return;
    }
    const filtered = registrations.filter((reg) => reg.listener !== listener);
    if (filtered.length === 0) {
      this.listeners.delete(eventKey);
    } else {
      this.listeners.set(eventKey, filtered);
    }
  }
  async dispatch(event) {
    const eventKey = event.constructor;
    const eventName = event.constructor.name;
    await this.core.hooks.doAction(`event:${eventName}`, event);
    await this.core.hooks.doAction("event:dispatched", { event, eventName });
    if (event instanceof Event && event.shouldBroadcast() && this.broadcastManager) {
      const channel = event.getBroadcastChannel();
      if (channel) {
        const channelName = typeof channel === "string" ? channel : channel.name;
        const channelType = typeof channel === "string" ? "public" : channel.type;
        const data = event.getBroadcastData();
        const broadcastEventName = event.getBroadcastEventName();
        await this.broadcastManager.broadcast(event, { name: channelName, type: channelType }, data, broadcastEventName).catch((error) => {
          this.core.logger.error(`[EventManager] Failed to broadcast event ${eventName}:`, error);
        });
      }
    }
    const registrations = this.listeners.get(eventKey) || [];
    const stringRegistrations = this.listeners.get(eventName) || [];
    const allRegistrations = [...registrations, ...stringRegistrations];
    for (const registration of allRegistrations) {
      try {
        let listenerInstance;
        if (typeof registration.listener === "function") {
          listenerInstance = new registration.listener;
        } else {
          listenerInstance = registration.listener;
        }
        const shouldQueue = "queue" in listenerInstance || registration.queue !== undefined || registration.connection !== undefined || registration.delay !== undefined;
        if (shouldQueue && this.queueManager) {
          const queue = listenerInstance.queue || registration.queue;
          const connection = listenerInstance.connection || registration.connection;
          const delay = listenerInstance.delay || registration.delay;
          const queueJob = {
            type: "event-listener",
            event: eventName,
            listener: listenerInstance.constructor.name,
            eventData: this.serializeEvent(event),
            handle: async () => {
              await listenerInstance.handle(event);
            }
          };
          await this.queueManager.push(queueJob, queue, connection, delay);
        } else {
          await listenerInstance.handle(event);
        }
      } catch (error) {
        this.core.logger.error(`[EventManager] Error in listener for event ${eventName}:`, error);
      }
    }
  }
  serializeEvent(event) {
    const data = {};
    for (const [key, value] of Object.entries(event)) {
      if (!key.startsWith("_") && typeof value !== "function") {
        data[key] = value;
      }
    }
    return data;
  }
  getListeners(event) {
    if (event) {
      const eventKey = typeof event === "string" ? event : event;
      return this.listeners.get(eventKey) || [];
    }
    const all = [];
    for (const registrations of this.listeners.values()) {
      all.push(...registrations);
    }
    return all;
  }
  clear() {
    this.listeners.clear();
  }
}
// ../core/src/exceptions/GravitoException.ts
class GravitoException extends Error {
  status;
  code;
  i18nKey;
  i18nParams;
  constructor(status, code, options = {}) {
    super(options.message);
    this.name = "GravitoException";
    this.status = status;
    this.cause = options.cause;
    this.code = code;
    if (options.i18nKey) {
      this.i18nKey = options.i18nKey;
    }
    if (options.i18nParams) {
      this.i18nParams = options.i18nParams;
    }
  }
  getLocalizedMessage(t) {
    if (this.i18nKey) {
      return t(this.i18nKey, this.i18nParams);
    }
    return this.message;
  }
}
// ../core/src/exceptions/HttpException.ts
class HttpException extends GravitoException {
  constructor(status, options = {}) {
    super(status, "HTTP_ERROR", options);
    this.name = "HttpException";
  }
}
// ../core/src/exceptions/ModelNotFoundException.ts
class ModelNotFoundException extends GravitoException {
  model;
  id;
  constructor(model, id) {
    super(404, "NOT_FOUND", {
      message: `${model} not found.`,
      i18nKey: "errors.model.not_found",
      i18nParams: { model, id: String(id ?? "") }
    });
    this.model = model;
    if (id !== undefined) {
      this.id = id;
    }
  }
}
// ../core/src/exceptions/ValidationException.ts
class ValidationException extends GravitoException {
  errors;
  redirectTo;
  input;
  constructor(errors, message = "Validation failed") {
    super(422, "VALIDATION_ERROR", {
      message,
      i18nKey: "errors.validation.failed"
    });
    this.errors = errors;
  }
  withRedirect(url) {
    this.redirectTo = url;
    return this;
  }
  withInput(input) {
    this.input = input;
    return this;
  }
}
// ../core/src/GlobalErrorHandlers.ts
var stateKey = Symbol.for("gravito.core.globalErrorHandlers");
function getGlobalState() {
  const g = globalThis;
  const existing = g[stateKey];
  if (existing) {
    return existing;
  }
  const created = {
    nextId: 1,
    sinks: new Map,
    listenersInstalled: false,
    onUnhandledRejection: undefined,
    onUncaughtException: undefined
  };
  g[stateKey] = created;
  return created;
}
function offProcess(event, listener) {
  const p = process;
  if (typeof p.off === "function") {
    p.off(event, listener);
    return;
  }
  if (typeof p.removeListener === "function") {
    p.removeListener(event, listener);
  }
}
function safeMessageFromUnknown(error) {
  if (error instanceof Error) {
    return error.message || "Error";
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
async function handleProcessError(kind, error) {
  const state = getGlobalState();
  if (state.sinks.size === 0) {
    return;
  }
  const isProduction = false;
  let shouldExit = false;
  let exitCode = 1;
  let exitTimer;
  try {
    const sinks = Array.from(state.sinks.values());
    const prepared = await Promise.all(sinks.map(async (sink) => {
      const defaultExit = sink.mode === "exit" || sink.mode === "exitInProduction" && isProduction;
      let ctx = {
        ...sink.core ? { core: sink.core } : {},
        kind,
        error,
        isProduction,
        timestamp: Date.now(),
        exit: defaultExit,
        exitCode: sink.exitCode ?? 1,
        gracePeriodMs: sink.gracePeriodMs ?? 250
      };
      if (sink.core) {
        ctx = await sink.core.hooks.applyFilters("processError:context", ctx);
      }
      return { sink, ctx };
    }));
    const exitTargets = prepared.map((p) => p.ctx).filter((ctx) => (ctx.exit ?? false) && (ctx.exitCode ?? 1) >= 0);
    shouldExit = exitTargets.length > 0;
    const gracePeriodMs = Math.max(0, ...exitTargets.map((c) => c.gracePeriodMs ?? 250));
    exitCode = Math.max(0, ...exitTargets.map((c) => c.exitCode ?? 1));
    if (shouldExit) {
      exitTimer = setTimeout(() => {
        process.exit(exitCode);
      }, gracePeriodMs);
      exitTimer.unref?.();
    }
    await Promise.all(prepared.map(async ({ sink, ctx }) => {
      const logger = sink.logger ?? sink.core?.logger;
      const logLevel = ctx.logLevel ?? "error";
      if (logger && logLevel !== "none") {
        const message = safeMessageFromUnknown(ctx.error);
        const msg = ctx.logMessage ?? `[${ctx.kind}] ${message}`;
        if (logLevel === "error") {
          logger.error(msg, ctx.error);
        } else if (logLevel === "warn") {
          logger.warn(msg, ctx.error);
        } else {
          logger.info(msg, ctx.error);
        }
      }
      if (sink.core) {
        await sink.core.hooks.doAction("processError:report", ctx);
      }
    }));
  } catch (e) {
    console.error("[gravito-core] Failed to handle process-level error:", e);
  } finally {
    if (shouldExit) {
      clearTimeout(exitTimer);
      process.exit(exitCode);
    }
  }
}
function ensureListenersInstalled() {
  const state = getGlobalState();
  if (state.listenersInstalled) {
    return;
  }
  if (typeof process === "undefined" || typeof process.on !== "function") {
    return;
  }
  state.onUnhandledRejection = (reason) => {
    handleProcessError("unhandledRejection", reason);
  };
  state.onUncaughtException = (error) => {
    handleProcessError("uncaughtException", error);
  };
  process.on("unhandledRejection", state.onUnhandledRejection);
  process.on("uncaughtException", state.onUncaughtException);
  state.listenersInstalled = true;
}
function teardownListenersIfUnused() {
  const state = getGlobalState();
  if (!state.listenersInstalled || state.sinks.size > 0) {
    return;
  }
  if (state.onUnhandledRejection) {
    offProcess("unhandledRejection", state.onUnhandledRejection);
  }
  if (state.onUncaughtException) {
    offProcess("uncaughtException", state.onUncaughtException);
  }
  state.onUnhandledRejection = undefined;
  state.onUncaughtException = undefined;
  state.listenersInstalled = false;
}
function registerGlobalErrorHandlers(options = {}) {
  const state = getGlobalState();
  ensureListenersInstalled();
  const id = state.nextId++;
  state.sinks.set(id, {
    ...options,
    mode: options.mode ?? "exitInProduction"
  });
  return () => {
    state.sinks.delete(id);
    teardownListenersIfUnused();
  };
}
// ../core/src/HookManager.ts
class HookManager {
  filters = new Map;
  actions = new Map;
  addFilter(hook, callback) {
    if (!this.filters.has(hook)) {
      this.filters.set(hook, []);
    }
    this.filters.get(hook)?.push(callback);
  }
  async applyFilters(hook, initialValue, ...args) {
    const callbacks = this.filters.get(hook) || [];
    let value = initialValue;
    for (const callback of callbacks) {
      try {
        value = await callback(value, ...args);
      } catch (error) {
        console.error(`[HookManager] Error in filter '${hook}':`, error);
      }
    }
    return value;
  }
  addAction(hook, callback) {
    if (!this.actions.has(hook)) {
      this.actions.set(hook, []);
    }
    this.actions.get(hook)?.push(callback);
  }
  async doAction(hook, args) {
    const callbacks = this.actions.get(hook) || [];
    for (const callback of callbacks) {
      try {
        await callback(args);
      } catch (error) {
        console.error(`[HookManager] Error in action '${hook}':`, error);
      }
    }
  }
}
// ../core/src/helpers/response.ts
function fail(message, code, details) {
  const error = { message };
  if (code !== undefined) {
    error.code = code;
  }
  if (details !== undefined) {
    error.details = details;
  }
  return { success: false, error };
}
// ../core/src/http/CookieJar.ts
class CookieJar {
  encrypter;
  queued = new Map;
  constructor(encrypter) {
    this.encrypter = encrypter;
  }
  queue(name, value, minutes = 60, options = {}) {
    if (minutes && !options.maxAge) {
      options.maxAge = minutes * 60;
    }
    let finalValue = value;
    if (options.encrypt) {
      if (!this.encrypter) {
        throw new Error("Encryption is not available. Ensure APP_KEY is set.");
      }
      finalValue = this.encrypter.encrypt(value);
    }
    this.queued.set(name, { value: finalValue, options });
  }
  forever(name, value, options = {}) {
    this.queue(name, value, 2628000, options);
  }
  forget(name, options = {}) {
    this.queue(name, "", 0, { ...options, maxAge: 0, expires: new Date(0) });
  }
  serializeCookie(name, value, opts) {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    if (opts.maxAge !== undefined) {
      parts.push(`Max-Age=${opts.maxAge}`);
    }
    if (opts.expires) {
      parts.push(`Expires=${opts.expires.toUTCString()}`);
    }
    if (opts.path) {
      parts.push(`Path=${opts.path}`);
    }
    if (opts.domain) {
      parts.push(`Domain=${opts.domain}`);
    }
    if (opts.secure) {
      parts.push("Secure");
    }
    if (opts.httpOnly) {
      parts.push("HttpOnly");
    }
    if (opts.sameSite) {
      parts.push(`SameSite=${opts.sameSite}`);
    }
    return parts.join("; ");
  }
  attach(c) {
    for (const [name, { value, options }] of this.queued) {
      c.header("Set-Cookie", this.serializeCookie(name, value, options), { append: true });
    }
  }
}
// ../core/src/Logger.ts
class ConsoleLogger {
  debug(message, ...args) {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
  info(message, ...args) {
    console.info(`[INFO] ${message}`, ...args);
  }
  warn(message, ...args) {
    console.warn(`[WARN] ${message}`, ...args);
  }
  error(message, ...args) {
    console.error(`[ERROR] ${message}`, ...args);
  }
}
// ../core/src/adapters/bun/BunRequest.ts
class BunRequest {
  raw;
  _url;
  _params = {};
  _query = null;
  _validated = {};
  constructor(raw, params = {}) {
    this.raw = raw;
    this._url = new URL(raw.url);
    this._params = params;
  }
  setParams(params) {
    this._params = params;
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get path() {
    return this._url.pathname;
  }
  param(name) {
    return this._params[name];
  }
  params() {
    return this._params;
  }
  query(name) {
    if (!this._query) {
      this.parseQuery();
    }
    const val = this._query?.[name];
    if (Array.isArray(val)) {
      return val[0];
    }
    return val;
  }
  queries() {
    if (!this._query) {
      this.parseQuery();
    }
    return this._query;
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) || undefined;
    }
    const headers = {};
    this.raw.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }
  async json() {
    return this.raw.json();
  }
  async text() {
    return this.raw.text();
  }
  async formData() {
    return this.raw.formData();
  }
  async arrayBuffer() {
    return this.raw.arrayBuffer();
  }
  setValidated(target, data2) {
    this._validated[target] = data2;
  }
  valid(target) {
    const data2 = this._validated[target];
    if (data2 === undefined) {
      throw new Error(`Validation target '${target}' not found or validation failed.`);
    }
    return data2;
  }
  parseQuery() {
    this._query = {};
    for (const [key, value] of this._url.searchParams) {
      if (this._query[key]) {
        if (Array.isArray(this._query[key])) {
          this._query[key].push(value);
        } else {
          this._query[key] = [this._query[key], value];
        }
      } else {
        this._query[key] = value;
      }
    }
  }
}

// ../core/src/adapters/bun/BunContext.ts
class BunContext {
  env;
  req;
  _variables = new Map;
  _status = 200;
  _headers = new Headers;
  _executionCtx;
  res;
  native;
  constructor(request, env = {}, executionCtx) {
    this.env = env;
    this.req = new BunRequest(request);
    this._executionCtx = executionCtx;
    this.native = { request, env, executionCtx };
  }
  static create(request, env = {}, executionCtx) {
    const instance = new BunContext(request, env, executionCtx);
    return new Proxy(instance, {
      get(target, prop, receiver) {
        if (prop in target) {
          const value = Reflect.get(target, prop, receiver);
          if (typeof value === "function") {
            return value.bind(target);
          }
          return value;
        }
        if (typeof prop === "string") {
          return target.get(prop);
        }
        return;
      }
    });
  }
  json(data2, status = 200) {
    this.status(status);
    this.header("Content-Type", "application/json");
    this.res = new Response(JSON.stringify(data2), {
      status: this._status,
      headers: this._headers
    });
    return this.res;
  }
  text(text, status = 200) {
    this.status(status);
    this.header("Content-Type", "text/plain");
    this.res = new Response(text, {
      status: this._status,
      headers: this._headers
    });
    return this.res;
  }
  html(html, status = 200) {
    this.status(status);
    this.header("Content-Type", "text/html");
    this.res = new Response(html, {
      status: this._status,
      headers: this._headers
    });
    return this.res;
  }
  redirect(url, status = 302) {
    this.status(status);
    this.header("Location", url);
    this.res = new Response(null, {
      status: this._status,
      headers: this._headers
    });
    return this.res;
  }
  body(data2, status = 200) {
    this.status(status);
    this.res = new Response(data2, {
      status: this._status,
      headers: this._headers
    });
    return this.res;
  }
  stream(stream, status = 200) {
    this.status(status);
    this.res = new Response(stream, {
      status: this._status,
      headers: this._headers
    });
    return this.res;
  }
  header(name, value, options) {
    if (value === undefined) {
      return this.req.header(name);
    }
    if (options?.append) {
      this._headers.append(name, value);
      this.res?.headers.append(name, value);
    } else {
      this._headers.set(name, value);
      if (this.res) {
        this.res.headers.set(name, value);
      }
    }
    return;
  }
  status(code) {
    this._status = code;
  }
  get(key) {
    return this._variables.get(key);
  }
  set(key, value) {
    this._variables.set(key, value);
  }
  get executionCtx() {
    return this._executionCtx;
  }
}

// ../core/src/adapters/bun/RadixNode.ts
class RadixNode {
  segment;
  type;
  children = new Map;
  paramChild = null;
  wildcardChild = null;
  handlers = new Map;
  paramName = null;
  regex = null;
  constructor(segment = "", type = 0 /* STATIC */) {
    this.segment = segment;
    this.type = type;
  }
  toJSON() {
    return {
      segment: this.segment,
      type: this.type,
      children: Array.from(this.children.entries()).map(([k, v]) => [k, v.toJSON()]),
      paramChild: this.paramChild?.toJSON() || null,
      wildcardChild: this.wildcardChild?.toJSON() || null,
      paramName: this.paramName,
      regex: this.regex ? this.regex.source : null
    };
  }
  static fromJSON(json) {
    const node = new RadixNode(json.segment, json.type);
    node.paramName = json.paramName;
    if (json.regex) {
      node.regex = new RegExp(json.regex);
    }
    if (json.children) {
      for (const [key, childJson] of json.children) {
        node.children.set(key, RadixNode.fromJSON(childJson));
      }
    }
    if (json.paramChild) {
      node.paramChild = RadixNode.fromJSON(json.paramChild);
    }
    if (json.wildcardChild) {
      node.wildcardChild = RadixNode.fromJSON(json.wildcardChild);
    }
    return node;
  }
}

// ../core/src/adapters/bun/RadixRouter.ts
class RadixRouter {
  root = new RadixNode;
  globalConstraints = new Map;
  where(param, regex) {
    this.globalConstraints.set(param, regex);
  }
  add(method, path, handlers) {
    let node = this.root;
    const segments = this.splitPath(path);
    for (let i = 0;i < segments.length; i++) {
      const segment = segments[i];
      if (segment === "*") {
        if (!node.wildcardChild) {
          node.wildcardChild = new RadixNode("*", 2 /* WILDCARD */);
        }
        node = node.wildcardChild;
        break;
      } else if (segment.startsWith(":")) {
        const paramName = segment.slice(1);
        if (!node.paramChild) {
          const child = new RadixNode(segment, 1 /* PARAM */);
          child.paramName = paramName;
          const constraint = this.globalConstraints.get(paramName);
          if (constraint) {
            child.regex = constraint;
          }
          node.paramChild = child;
        }
        node = node.paramChild;
      } else {
        if (!node.children.has(segment)) {
          node.children.set(segment, new RadixNode(segment, 0 /* STATIC */));
        }
        node = node.children.get(segment);
      }
    }
    node.handlers.set(method.toLowerCase(), handlers);
  }
  match(method, path) {
    const normalizedMethod = method.toLowerCase();
    if (path === "/" || path === "") {
      const handlers = this.root.handlers.get(normalizedMethod);
      if (handlers) {
        return { handlers, params: {} };
      }
      return null;
    }
    const searchPath = path.startsWith("/") ? path.slice(1) : path;
    const segments = searchPath.split("/");
    return this.matchRecursive(this.root, segments, 0, {}, normalizedMethod);
  }
  matchRecursive(node, segments, depth, params, method) {
    if (depth >= segments.length) {
      let handlers = node.handlers.get(method);
      if (!handlers) {
        handlers = node.handlers.get("all");
      }
      if (handlers) {
        return { handlers, params };
      }
      return null;
    }
    const segment = segments[depth];
    const staticChild = node.children.get(segment);
    if (staticChild) {
      const match = this.matchRecursive(staticChild, segments, depth + 1, params, method);
      if (match) {
        return match;
      }
    }
    const paramChild = node.paramChild;
    if (paramChild) {
      if (paramChild.regex && !paramChild.regex.test(segment)) {} else {
        if (paramChild.paramName) {
          params[paramChild.paramName] = decodeURIComponent(segment);
          const match = this.matchRecursive(paramChild, segments, depth + 1, params, method);
          if (match) {
            return match;
          }
          delete params[paramChild.paramName];
        }
      }
    }
    if (node.wildcardChild) {
      let handlers = node.wildcardChild.handlers.get(method);
      if (!handlers) {
        handlers = node.wildcardChild.handlers.get("all");
      }
      if (handlers) {
        return { handlers, params };
      }
    }
    return null;
  }
  splitPath(path) {
    if (path === "/" || path === "") {
      return [];
    }
    let p = path;
    if (p.startsWith("/")) {
      p = p.slice(1);
    }
    if (p.endsWith("/")) {
      p = p.slice(0, -1);
    }
    return p.split("/");
  }
  serialize() {
    return JSON.stringify({
      root: this.root.toJSON(),
      globalConstraints: Array.from(this.globalConstraints.entries()).map(([k, v]) => [
        k,
        v.source
      ])
    });
  }
  static fromSerialized(json) {
    const data2 = JSON.parse(json);
    const router = new RadixRouter;
    router.root = RadixNode.fromJSON(data2.root);
    if (data2.globalConstraints) {
      for (const [key, source] of data2.globalConstraints) {
        router.globalConstraints.set(key, new RegExp(source));
      }
    }
    return router;
  }
}

// ../core/src/adapters/bun/BunNativeAdapter.ts
class BunNativeAdapter {
  name = "bun-native";
  version = "0.0.1";
  get native() {
    return this;
  }
  router = new RadixRouter;
  middlewares = [];
  errorHandler = null;
  notFoundHandler = null;
  route(method, path, ...handlers) {
    this.router.add(method, path, handlers);
  }
  routes(routes) {
    for (const route of routes) {
      this.route(route.method, route.path, ...route.handlers);
    }
  }
  use(path, ...middleware) {
    this.middlewares.push({ path, handlers: middleware });
  }
  useGlobal(...middleware) {
    this.use("*", ...middleware);
  }
  mount(path, subAdapter) {
    const fullPath = path.endsWith("/") ? `${path}*` : `${path}/*`;
    this.route("all", fullPath, async (ctx) => {
      const url = new URL(ctx.req.url);
      const prefix = path.endsWith("/") ? path.slice(0, -1) : path;
      console.log("[DEBUG] Mount Prefix:", prefix);
      console.log("[DEBUG] Original Path:", url.pathname);
      if (url.pathname.startsWith(prefix)) {
        const newPath = url.pathname.slice(prefix.length);
        url.pathname = newPath === "" ? "/" : newPath;
      }
      const newReq = new Request(url.toString(), {
        method: ctx.req.method,
        headers: ctx.req.raw.headers
      });
      const res = await subAdapter.fetch(newReq);
      if (ctx instanceof BunContext) {
        ctx.res = res;
      }
      return res;
    });
  }
  createContext(request) {
    return BunContext.create(request);
  }
  onError(handler) {
    this.errorHandler = handler;
  }
  onNotFound(handler) {
    this.notFoundHandler = handler;
  }
  async fetch(request, _server) {
    const ctx = BunContext.create(request);
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;
      const match = this.router.match(method, path);
      const handlers = [];
      for (const mw of this.middlewares) {
        if (mw.path === "*" || path.startsWith(mw.path)) {
          handlers.push(...mw.handlers);
        }
      }
      if (match) {
        if (match.params) {
          ctx.req.setParams(match.params);
        }
        handlers.push(...match.handlers);
      } else {
        if (this.notFoundHandler) {
          handlers.push(this.notFoundHandler);
        } else {}
      }
      return await this.executeChain(ctx, handlers);
    } catch (err) {
      if (this.errorHandler) {
        try {
          const response2 = await this.errorHandler(err, ctx);
          if (response2) {
            return response2;
          }
        } catch (e) {
          console.error("Error handler failed", e);
        }
      }
      console.error(err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
  async executeChain(ctx, handlers) {
    let index = -1;
    const dispatch = async (i) => {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      const fn = handlers[i];
      if (!fn) {
        return;
      }
      const result = await fn(ctx, async () => {
        const res = await dispatch(i + 1);
        if (res && ctx.res !== res) {
          ctx.res = res;
        }
        return res;
      });
      return result;
    };
    const finalResponse = await dispatch(0);
    if (finalResponse && (finalResponse instanceof Response || typeof finalResponse.status === "number")) {
      return finalResponse;
    }
    if (ctx.res) {
      return ctx.res;
    }
    return new Response("Not Found", { status: 404 });
  }
}

// ../core/src/Route.ts
class Route {
  router;
  method;
  path;
  options;
  constructor(router, method, path, options) {
    this.router = router;
    this.method = method;
    this.path = path;
    this.options = options;
  }
  name(name) {
    this.router.registerName(name, this.method, this.path, this.options);
    return this;
  }
}

// ../core/src/Router.ts
function isFormRequestClass(value) {
  if (typeof value !== "function") {
    return false;
  }
  try {
    const instance = new value;
    return instance !== null && typeof instance === "object" && "schema" in instance && "validate" in instance && typeof instance.validate === "function";
  } catch {
    return false;
  }
}
function formRequestToMiddleware(RequestClass) {
  return async (ctx, next) => {
    const request = new RequestClass;
    if (typeof request.validate !== "function") {
      throw new Error("Invalid FormRequest: validate() is missing.");
    }
    const result = await request.validate(ctx);
    if (!result.success) {
      const errorCode = result.error?.error?.code;
      const status = errorCode === "AUTHORIZATION_ERROR" ? 403 : 422;
      return ctx.json(result.error, status);
    }
    ctx.set("validated", result.data);
    await next();
    return;
  };
}

class RouteGroup {
  router;
  options;
  constructor(router, options) {
    this.router = router;
    this.options = options;
  }
  prefix(path) {
    return new RouteGroup(this.router, {
      ...this.options,
      prefix: (this.options.prefix || "") + path
    });
  }
  middleware(...handlers) {
    const flattened = handlers.flat();
    return new RouteGroup(this.router, {
      ...this.options,
      middleware: [...this.options.middleware || [], ...flattened]
    });
  }
  group(callback) {
    callback(this);
  }
  get(path, requestOrHandler, handler) {
    return this.router.req("get", path, requestOrHandler, handler, this.options);
  }
  post(path, requestOrHandler, handler) {
    return this.router.req("post", path, requestOrHandler, handler, this.options);
  }
  put(path, requestOrHandler, handler) {
    return this.router.req("put", path, requestOrHandler, handler, this.options);
  }
  delete(path, requestOrHandler, handler) {
    return this.router.req("delete", path, requestOrHandler, handler, this.options);
  }
  patch(path, requestOrHandler, handler) {
    return this.router.req("patch", path, requestOrHandler, handler, this.options);
  }
  resource(name, controller, options = {}) {
    const actions = [
      "index",
      "create",
      "store",
      "show",
      "edit",
      "update",
      "destroy"
    ];
    const map = {
      index: { method: "get", path: `/${name}` },
      create: { method: "get", path: `/${name}/create` },
      store: { method: "post", path: `/${name}` },
      show: { method: "get", path: `/${name}/:id` },
      edit: { method: "get", path: `/${name}/:id/edit` },
      update: { method: "put", path: `/${name}/:id` },
      destroy: { method: "delete", path: `/${name}/:id` }
    };
    const allowed = actions.filter((action) => {
      if (options.only) {
        return options.only.includes(action);
      }
      if (options.except) {
        return !options.except.includes(action);
      }
      return true;
    });
    for (const action of allowed) {
      const { method, path } = map[action];
      if (action === "update") {
        this.router.req("put", path, [controller, action], undefined, this.options).name(`${name}.${action}`);
        this.router.req("patch", path, [controller, action], undefined, this.options);
      } else {
        this.router.req(method, path, [controller, action], undefined, this.options).name(`${name}.${action}`);
      }
    }
  }
}

class Router {
  core;
  controllers = new Map;
  namedRoutes = new Map;
  bindings = new Map;
  compile() {
    const routes = [];
    for (const [name, info] of this.namedRoutes) {
      routes.push({
        name,
        method: info.method,
        path: info.path,
        domain: info.domain
      });
    }
    return routes;
  }
  registerName(name, method, path, options = {}) {
    const fullPath = (options.prefix || "") + path;
    this.namedRoutes.set(name, {
      method: method.toUpperCase(),
      path: fullPath,
      domain: options.domain
    });
  }
  url(name, params = {}, query = {}) {
    const route = this.namedRoutes.get(name);
    if (!route) {
      throw new Error(`Named route '${name}' not found`);
    }
    let path = route.path;
    path = path.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
      const value = params[key];
      if (value === undefined || value === null) {
        throw new Error(`Missing route param '${key}' for route '${name}'`);
      }
      return encodeURIComponent(String(value));
    });
    const qs = new URLSearchParams;
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) {
        continue;
      }
      qs.set(k, String(v));
    }
    const suffix = qs.toString();
    return suffix ? `${path}?${suffix}` : path;
  }
  exportNamedRoutes() {
    return Object.fromEntries(this.namedRoutes.entries());
  }
  loadNamedRoutes(manifest) {
    this.namedRoutes = new Map(Object.entries(manifest));
  }
  bind(param, resolver) {
    this.bindings.set(param, resolver);
  }
  model(param, modelClass) {
    this.bind(param, async (id) => {
      if (modelClass && typeof modelClass === "object" && "find" in modelClass && typeof modelClass.find === "function") {
        const instance = await modelClass.find(id);
        if (!instance) {
          throw new Error("ModelNotFound");
        }
        return instance;
      }
      throw new Error(`Invalid model class for binding '${param}'`);
    });
  }
  constructor(core) {
    this.core = core;
    this.core.adapter.useGlobal(async (c, next) => {
      const routeModels = c.get("routeModels") ?? {};
      for (const [param, resolver] of this.bindings) {
        const value = c.req.param(param);
        if (value) {
          try {
            const resolved = await resolver(value);
            routeModels[param] = resolved;
          } catch (err) {
            const message = err instanceof Error ? err.message : undefined;
            if (message === "ModelNotFound") {
              throw new ModelNotFoundException(param, value);
            }
            throw err;
          }
        }
      }
      c.set("routeModels", routeModels);
      await next();
      return;
    });
  }
  prefix(path) {
    return new RouteGroup(this, { prefix: path });
  }
  domain(host) {
    return new RouteGroup(this, { domain: host });
  }
  middleware(...handlers) {
    return new RouteGroup(this, { middleware: handlers.flat() });
  }
  get(path, requestOrHandler, handler) {
    return this.req("get", path, requestOrHandler, handler);
  }
  post(path, requestOrHandler, handler) {
    return this.req("post", path, requestOrHandler, handler);
  }
  put(path, requestOrHandler, handler) {
    return this.req("put", path, requestOrHandler, handler);
  }
  delete(path, requestOrHandler, handler) {
    return this.req("delete", path, requestOrHandler, handler);
  }
  patch(path, requestOrHandler, handler) {
    return this.req("patch", path, requestOrHandler, handler);
  }
  resource(name, controller, options = {}) {
    const actions = [
      "index",
      "create",
      "store",
      "show",
      "edit",
      "update",
      "destroy"
    ];
    const map = {
      index: { method: "get", path: `/${name}` },
      create: { method: "get", path: `/${name}/create` },
      store: { method: "post", path: `/${name}` },
      show: { method: "get", path: `/${name}/:id` },
      edit: { method: "get", path: `/${name}/:id/edit` },
      update: { method: "put", path: `/${name}/:id` },
      destroy: { method: "delete", path: `/${name}/:id` }
    };
    const allowed = actions.filter((action) => {
      if (options.only) {
        return options.only.includes(action);
      }
      if (options.except) {
        return !options.except.includes(action);
      }
      return true;
    });
    for (const action of allowed) {
      const { method, path } = map[action];
      if (action === "update") {
        this.req("put", path, [controller, action]).name(`${name}.${action}`);
        this.req("patch", path, [controller, action]);
      } else {
        this.req(method, path, [controller, action]).name(`${name}.${action}`);
      }
    }
  }
  req(method, path, requestOrHandler, handler, options = {}) {
    const fullPath = (options.prefix || "") + path;
    let formRequestMiddleware = null;
    let finalRouteHandler;
    if (handler !== undefined) {
      if (isFormRequestClass(requestOrHandler)) {
        formRequestMiddleware = formRequestToMiddleware(requestOrHandler);
      }
      finalRouteHandler = handler;
    } else {
      finalRouteHandler = requestOrHandler;
    }
    let resolvedHandler;
    if (Array.isArray(finalRouteHandler)) {
      const [CtrlClass, methodName] = finalRouteHandler;
      resolvedHandler = this.resolveControllerHandler(CtrlClass, methodName);
    } else {
      resolvedHandler = finalRouteHandler;
    }
    const handlers = [];
    if (options.middleware) {
      handlers.push(...options.middleware);
    }
    if (formRequestMiddleware) {
      handlers.push(formRequestMiddleware);
    }
    handlers.push(resolvedHandler);
    if (options.domain) {
      const _wrappedHandler = async (c) => {
        if (c.req.header("host") !== options.domain) {
          return new Response("Not Found", { status: 404 });
        }
        return;
      };
      const domainCheck = async (c, next) => {
        if (c.req.header("host") !== options.domain) {
          return c.text("Not Found", 404);
        }
        await next();
      };
      handlers.unshift(domainCheck);
    }
    this.core.adapter.route(method, fullPath, ...handlers);
    return new Route(this, method, fullPath, options);
  }
  resolveControllerHandler(CtrlClass, methodName) {
    let instance = this.controllers.get(CtrlClass);
    if (!instance) {
      instance = new CtrlClass(this.core);
      this.controllers.set(CtrlClass, instance);
    }
    const handler = instance[methodName];
    if (typeof handler !== "function") {
      throw new Error(`Method '${methodName}' not found in controller '${CtrlClass.name}'`);
    }
    return handler.bind(instance);
  }
}

// ../core/src/security/Encrypter.ts
import crypto from "node:crypto";

class Encrypter {
  algorithm;
  key;
  constructor(options) {
    this.algorithm = options.cipher || "aes-256-cbc";
    if (options.key.startsWith("base64:")) {
      this.key = Buffer.from(options.key.substring(7), "base64");
    } else {
      this.key = Buffer.from(options.key);
    }
    if (this.algorithm === "aes-128-cbc" && this.key.length !== 16) {
      throw new Error("The key must be 16 bytes (128 bits) for AES-128-CBC.");
    }
    if (this.algorithm === "aes-256-cbc" && this.key.length !== 32) {
      throw new Error("The key must be 32 bytes (256 bits) for AES-256-CBC.");
    }
  }
  encrypt(value, serialize = true) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const stringValue = serialize ? JSON.stringify(value) : String(value);
    let encrypted = cipher.update(stringValue, "utf8", "base64");
    encrypted += cipher.final("base64");
    const mac = this.hash(iv.toString("base64"), encrypted);
    const payload = {
      iv: iv.toString("base64"),
      value: encrypted,
      mac,
      tag: ""
    };
    return Buffer.from(JSON.stringify(payload)).toString("base64");
  }
  decrypt(payload, deserialize = true) {
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    if (!this.validPayload(json)) {
      throw new Error("The payload is invalid.");
    }
    if (!this.validMac(json)) {
      throw new Error("The MAC is invalid.");
    }
    const iv = Buffer.from(json.iv, "base64");
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    let decrypted = decipher.update(json.value, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return deserialize ? JSON.parse(decrypted) : decrypted;
  }
  hash(iv, value) {
    const hmac = crypto.createHmac("sha256", this.key);
    hmac.update(iv + value);
    return hmac.digest("hex");
  }
  validPayload(payload) {
    return typeof payload === "object" && payload !== null && "iv" in payload && "value" in payload && "mac" in payload;
  }
  validMac(payload) {
    const calculated = this.hash(payload.iv, payload.value);
    return crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(payload.mac));
  }
  static generateKey(cipher = "aes-256-cbc") {
    const bytes = cipher === "aes-128-cbc" ? 16 : 32;
    return `base64:${crypto.randomBytes(bytes).toString("base64")}`;
  }
}

// ../core/src/security/Hasher.ts
class BunHasher {
  async make(value, options) {
    const bun = Bun;
    return await bun.password.hash(value, options);
  }
  async check(value, hashedValue) {
    const bun = Bun;
    return await bun.password.verify(value, hashedValue);
  }
  needsRehash(_hashedValue, _options) {
    return false;
  }
}

// ../core/src/PlanetCore.ts
class PlanetCore {
  _adapter;
  get app() {
    return this._adapter.native;
  }
  get adapter() {
    return this._adapter;
  }
  logger;
  config;
  hooks;
  events;
  router;
  container = new Container;
  services = new Map;
  encrypter;
  hasher;
  providers = [];
  register(provider) {
    this.providers.push(provider);
    return this;
  }
  async bootstrap() {
    for (const provider of this.providers) {
      provider.register(this.container);
    }
    for (const provider of this.providers) {
      if (provider.boot) {
        await provider.boot(this);
      }
    }
  }
  constructor(options = {}) {
    this.logger = options.logger ?? new ConsoleLogger;
    this.config = new ConfigManager(options.config ?? {});
    this.hooks = new HookManager;
    this.events = new EventManager(this);
    this.hasher = new BunHasher;
    const appKey = (this.config.has("APP_KEY") ? this.config.get("APP_KEY") : undefined) || process.env.APP_KEY;
    if (appKey) {
      try {
        this.encrypter = new Encrypter({ key: appKey });
      } catch (e) {
        this.logger.warn("Failed to initialize Encrypter (invalid APP_KEY?):", e);
      }
    }
    if (options.adapter) {
      this._adapter = options.adapter;
    } else if (typeof Bun !== "undefined") {
      this._adapter = new BunNativeAdapter;
    } else {
      this._adapter = new HonoAdapter;
    }
    this.adapter.use("*", async (c, next) => {
      c.set("core", this);
      c.set("logger", this.logger);
      c.set("config", this.config);
      const cookieJar = new CookieJar(this.encrypter);
      c.set("cookieJar", cookieJar);
      c.route = (name, params, query) => this.router.url(name, params, query);
      await next();
      return;
    });
    this.router = new Router(this);
    this.adapter.onError(async (err, c) => {
      const isProduction = false;
      const codeFromStatus = (status2) => {
        switch (status2) {
          case 400:
            return "BAD_REQUEST";
          case 401:
            return "UNAUTHENTICATED";
          case 403:
            return "FORBIDDEN";
          case 404:
            return "NOT_FOUND";
          case 405:
            return "METHOD_NOT_ALLOWED";
          case 409:
            return "CONFLICT";
          case 422:
            return "VALIDATION_ERROR";
          case 429:
            return "TOO_MANY_REQUESTS";
          default:
            return status2 >= 500 ? "INTERNAL_ERROR" : "HTTP_ERROR";
        }
      };
      const messageFromStatus = (status2) => {
        switch (status2) {
          case 400:
            return "Bad Request";
          case 401:
            return "Unauthorized";
          case 403:
            return "Forbidden";
          case 404:
            return "Not Found";
          case 405:
            return "Method Not Allowed";
          case 409:
            return "Conflict";
          case 422:
            return "Unprocessable Content";
          case 429:
            return "Too Many Requests";
          case 500:
            return "Internal Server Error";
          case 502:
            return "Bad Gateway";
          case 503:
            return "Service Unavailable";
          case 504:
            return "Gateway Timeout";
          default:
            return status2 >= 500 ? "Internal Server Error" : "Request Error";
        }
      };
      const view = c.get("view");
      const i18n = c.get("i18n");
      const accept = c.req.header("Accept") || "";
      const wantsHtml = Boolean(view && accept.includes("text/html") && !accept.includes("application/json"));
      let status = 500;
      let message = messageFromStatus(500);
      let code = "INTERNAL_ERROR";
      let details;
      if (err instanceof GravitoException) {
        status = err.status;
        code = err.code;
        if (code === "HTTP_ERROR") {
          code = codeFromStatus(status);
        }
        if (i18n?.t && err.i18nKey) {
          message = i18n.t(err.i18nKey, err.i18nParams);
        } else {
          message = err.message || messageFromStatus(status);
        }
        if (err instanceof ValidationException) {
          details = err.errors;
          if (wantsHtml) {
            const session = c.get("session");
            if (session) {
              const errorBag = {};
              for (const e of err.errors) {
                if (!errorBag[e.field]) {
                  errorBag[e.field] = [];
                }
                errorBag[e.field]?.push(e.message);
              }
              session.flash("errors", errorBag);
              if (err.input) {
                session.flash("_old_input", err.input);
              }
              const redirectUrl = err.redirectTo ?? c.req.header("Referer") ?? "/";
              return c.redirect(redirectUrl);
            }
          }
        } else if (err instanceof Error && !isProduction && err.cause) {
          details = { cause: err.cause };
        }
      } else if (err instanceof HttpException) {
        status = err.status;
        message = err.message;
      } else if (err instanceof Error && "status" in err && typeof err.status === "number") {
        status = err.status;
        message = err.message;
        code = codeFromStatus(status);
      } else if (err instanceof Error) {
        if (!isProduction) {
          message = err.message || message;
        }
      } else if (typeof err === "string") {
        if (!isProduction) {
          message = err;
        }
      }
      if (isProduction && status >= 500) {
        message = messageFromStatus(status);
      }
      if (!isProduction && err instanceof Error && !details) {
        details = { stack: err.stack, ...details };
      }
      let handlerContext = {
        core: this,
        c,
        error: err,
        isProduction,
        accept,
        wantsHtml,
        status,
        payload: fail(message, code, details),
        ...wantsHtml ? {
          html: {
            templates: status === 500 ? ["errors/500"] : [`errors/${status}`, "errors/500"],
            data: {
              status,
              message,
              code,
              error: !isProduction && err instanceof Error ? err.stack : undefined,
              debug: !isProduction,
              details
            }
          }
        } : {}
      };
      handlerContext = await this.hooks.applyFilters("error:context", handlerContext);
      const defaultLogLevel = handlerContext.status >= 500 ? "error" : "none";
      const logLevel = handlerContext.logLevel ?? defaultLogLevel;
      if (logLevel !== "none") {
        const rawErrorMessage = handlerContext.error instanceof Error ? handlerContext.error.message : typeof handlerContext.error === "string" ? handlerContext.error : handlerContext.payload.error.message;
        const msg = handlerContext.logMessage ?? (logLevel === "error" ? `Application Error: ${rawErrorMessage || handlerContext.payload.error.message}` : `HTTP ${handlerContext.status}: ${handlerContext.payload.error.message}`);
        if (logLevel === "error") {
          this.logger.error(msg, err);
        } else if (logLevel === "warn") {
          this.logger.warn(msg);
        } else {
          this.logger.info(msg);
        }
      }
      await this.hooks.doAction("error:report", handlerContext);
      const customResponse = await this.hooks.applyFilters("error:render", null, handlerContext);
      if (customResponse) {
        return customResponse;
      }
      if (handlerContext.wantsHtml && view && handlerContext.html) {
        let lastRenderError;
        for (const template of handlerContext.html.templates) {
          try {
            return c.html(view.render(template, handlerContext.html.data), handlerContext.status);
          } catch (renderError) {
            lastRenderError = renderError;
          }
        }
        this.logger.error("Failed to render error view", lastRenderError);
      }
      return c.json(handlerContext.payload, handlerContext.status);
    });
    this.adapter.onNotFound(async (c) => {
      const view = c.get("view");
      const accept = c.req.header("Accept") || "";
      const wantsHtml = view && accept.includes("text/html") && !accept.includes("application/json");
      const isProduction = false;
      let handlerContext = {
        core: this,
        c,
        error: new HttpException(404, { message: "Route not found" }),
        isProduction,
        accept,
        wantsHtml: Boolean(wantsHtml),
        status: 404,
        payload: fail("Route not found", "NOT_FOUND"),
        ...wantsHtml ? {
          html: {
            templates: ["errors/404", "errors/500"],
            data: {
              status: 404,
              message: "Route not found",
              code: "NOT_FOUND",
              debug: !isProduction
            }
          }
        } : {}
      };
      handlerContext = await this.hooks.applyFilters("notFound:context", handlerContext);
      const logLevel = handlerContext.logLevel ?? "info";
      if (logLevel !== "none") {
        const msg = handlerContext.logMessage ?? `404 Not Found: ${c.req.url}`;
        if (logLevel === "error") {
          this.logger.error(msg);
        } else if (logLevel === "warn") {
          this.logger.warn(msg);
        } else {
          this.logger.info(msg);
        }
      }
      await this.hooks.doAction("notFound:report", handlerContext);
      const customResponse = await this.hooks.applyFilters("notFound:render", null, handlerContext);
      if (customResponse) {
        return customResponse;
      }
      if (handlerContext.wantsHtml && view && handlerContext.html) {
        let lastRenderError;
        for (const template of handlerContext.html.templates) {
          try {
            return c.html(view.render(template, handlerContext.html.data), handlerContext.status);
          } catch (renderError) {
            lastRenderError = renderError;
          }
        }
        this.logger.error("Failed to render 404 view", lastRenderError);
      }
      return c.json(handlerContext.payload, handlerContext.status);
    });
  }
  async orbit(orbit) {
    const instance = typeof orbit === "function" ? new orbit : orbit;
    await instance.install(this);
    return this;
  }
  async use(satellite) {
    if (typeof satellite === "function") {
      await satellite(this);
    } else {
      this.register(satellite);
    }
    return this;
  }
  registerGlobalErrorHandlers(options = {}) {
    return registerGlobalErrorHandlers({ ...options, core: this });
  }
  static async boot(config) {
    const core = new PlanetCore({
      ...config.logger && { logger: config.logger },
      ...config.config && { config: config.config },
      ...config.adapter && { adapter: config.adapter }
    });
    if (config.orbits) {
      for (const OrbitClassOrInstance of config.orbits) {
        let orbit;
        if (typeof OrbitClassOrInstance === "function") {
          orbit = new OrbitClassOrInstance;
        } else {
          orbit = OrbitClassOrInstance;
        }
        await orbit.install(core);
      }
    }
    return core;
  }
  mountOrbit(path, orbitApp) {
    this.logger.info(`Mounting orbit at path: ${path}`);
    if (this.adapter.name === "hono") {
      this.adapter.native.route(path, orbitApp);
    } else {
      const subAdapter = new HonoAdapter({}, orbitApp);
      this.adapter.mount(path, subAdapter);
    }
  }
  liftoff(port) {
    const finalPort = port ?? this.config.get("PORT", 3000);
    this.hooks.doAction("app:liftoff", { port: finalPort });
    this.logger.info(`Ready to liftoff on port ${finalPort} \uD83D\uDE80`);
    return {
      port: finalPort,
      fetch: this.adapter.fetch.bind(this.adapter),
      core: this
    };
  }
}

// ../core/src/index.ts
var VERSION = package_default.version;

// ../ion/src/InertiaService.ts
class InertiaService {
  context;
  config;
  sharedProps = {};
  constructor(context, config = {}) {
    this.context = context;
    this.config = config;
  }
  escapeForSingleQuotedHtmlAttribute(value) {
    return value.replace(/&/g, "&amp;").replace(/\\"/g, "\\&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#039;");
  }
  render(component, props = {}, rootVars = {}) {
    let pageUrl;
    try {
      const reqUrl = new URL(this.context.req.url, "http://localhost");
      pageUrl = reqUrl.pathname + reqUrl.search;
    } catch {
      pageUrl = this.context.req.url;
    }
    const resolveProps = (p) => {
      const resolved = {};
      for (const [key, value] of Object.entries(p)) {
        resolved[key] = typeof value === "function" ? value() : value;
      }
      return resolved;
    };
    const page = {
      component,
      props: resolveProps({ ...this.sharedProps, ...props }),
      url: pageUrl,
      version: this.config.version
    };
    if (this.context.req.header("X-Inertia")) {
      this.context.header("X-Inertia", "true");
      this.context.header("Vary", "Accept");
      return this.context.json(page);
    }
    const view = this.context.get("view");
    const rootView = this.config.rootView ?? "app";
    if (!view) {
      throw new Error("OrbitPrism is required for the initial page load in OrbitIon");
    }
    const isDev = true;
    return this.context.html(view.render(rootView, {
      ...rootVars,
      page: this.escapeForSingleQuotedHtmlAttribute(JSON.stringify(page)),
      isDev
    }, { layout: "" }));
  }
  share(key, value) {
    this.sharedProps[key] = value;
  }
  shareAll(props) {
    Object.assign(this.sharedProps, props);
  }
  getSharedProps() {
    return { ...this.sharedProps };
  }
}

// ../ion/src/index.ts
class OrbitIon {
  install(core) {
    core.logger.info("\uD83D\uDEF0️ Orbit Inertia installed");
    const appVersion = core.config.get("APP_VERSION", "1.0.0");
    core.adapter.use("*", async (c, next) => {
      const gravitoCtx = new HonoContextWrapper(c);
      const inertia = new InertiaService(gravitoCtx, {
        version: String(appVersion),
        rootView: "app"
      });
      c.set("inertia", inertia);
      await next();
      return;
    });
  }
}
var src_default = OrbitIon;
export {
  src_default as default,
  OrbitIon,
  InertiaService
};
