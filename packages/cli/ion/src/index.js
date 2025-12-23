// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = import.meta.require;

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/compose.js
var require_compose = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var compose_exports = {};
  __export2(compose_exports, {
    compose: () => compose
  });
  module.exports = __toCommonJS(compose_exports);
  var compose = (middleware, onError, onNotFound) => {
    return (context, next) => {
      let index = -1;
      return dispatch(0);
      async function dispatch(i) {
        if (i <= index) {
          throw new Error("next() called multiple times");
        }
        index = i;
        let res;
        let isError = false;
        let handler;
        if (middleware[i]) {
          handler = middleware[i][0][0];
          context.req.routeIndex = i;
        } else {
          handler = i === middleware.length && next || undefined;
        }
        if (handler) {
          try {
            res = await handler(context, () => dispatch(i + 1));
          } catch (err) {
            if (err instanceof Error && onError) {
              context.error = err;
              res = await onError(err, context);
              isError = true;
            } else {
              throw err;
            }
          }
        } else {
          if (context.finalized === false && onNotFound) {
            res = await onNotFound(context);
          }
        }
        if (res && (context.finalized === false || isError)) {
          context.res = res;
        }
        return context;
      }
    };
  };
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/http-exception.js
var require_http_exception = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var http_exception_exports = {};
  __export2(http_exception_exports, {
    HTTPException: () => HTTPException
  });
  module.exports = __toCommonJS(http_exception_exports);

  class HTTPException extends Error {
    res;
    status;
    constructor(status = 500, options) {
      super(options?.message, { cause: options?.cause });
      this.res = options?.res;
      this.status = status;
    }
    getResponse() {
      if (this.res) {
        const newResponse = new Response(this.res.body, {
          status: this.status,
          headers: this.res.headers
        });
        return newResponse;
      }
      return new Response(this.message, {
        status: this.status
      });
    }
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/request/constants.js
var require_constants = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var constants_exports = {};
  __export2(constants_exports, {
    GET_MATCH_RESULT: () => GET_MATCH_RESULT
  });
  module.exports = __toCommonJS(constants_exports);
  var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/utils/body.js
var require_body = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var body_exports = {};
  __export2(body_exports, {
    parseBody: () => parseBody
  });
  module.exports = __toCommonJS(body_exports);
  var import_request = require_request();
  var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
    const { all = false, dot = false } = options;
    const headers = request instanceof import_request.HonoRequest ? request.raw.headers : request.headers;
    const contentType = headers.get("Content-Type");
    if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
      return parseFormData(request, { all, dot });
    }
    return {};
  };
  async function parseFormData(request, options) {
    const formData = await request.formData();
    if (formData) {
      return convertFormDataToBodyData(formData, options);
    }
    return {};
  }
  function convertFormDataToBodyData(formData, options) {
    const form = /* @__PURE__ */ Object.create(null);
    formData.forEach((value, key) => {
      const shouldParseAllValues = options.all || key.endsWith("[]");
      if (!shouldParseAllValues) {
        form[key] = value;
      } else {
        handleParsingAllValues(form, key, value);
      }
    });
    if (options.dot) {
      Object.entries(form).forEach(([key, value]) => {
        const shouldParseDotValues = key.includes(".");
        if (shouldParseDotValues) {
          handleParsingNestedValues(form, key, value);
          delete form[key];
        }
      });
    }
    return form;
  }
  var handleParsingAllValues = (form, key, value) => {
    if (form[key] !== undefined) {
      if (Array.isArray(form[key])) {
        form[key].push(value);
      } else {
        form[key] = [form[key], value];
      }
    } else {
      if (!key.endsWith("[]")) {
        form[key] = value;
      } else {
        form[key] = [value];
      }
    }
  };
  var handleParsingNestedValues = (form, key, value) => {
    let nestedForm = form;
    const keys = key.split(".");
    keys.forEach((key2, index) => {
      if (index === keys.length - 1) {
        nestedForm[key2] = value;
      } else {
        if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
          nestedForm[key2] = /* @__PURE__ */ Object.create(null);
        }
        nestedForm = nestedForm[key2];
      }
    });
  };
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/utils/url.js
var require_url = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var url_exports = {};
  __export2(url_exports, {
    checkOptionalParameter: () => checkOptionalParameter,
    decodeURIComponent_: () => decodeURIComponent_,
    getPath: () => getPath,
    getPathNoStrict: () => getPathNoStrict,
    getPattern: () => getPattern,
    getQueryParam: () => getQueryParam,
    getQueryParams: () => getQueryParams,
    getQueryStrings: () => getQueryStrings,
    mergePath: () => mergePath,
    splitPath: () => splitPath,
    splitRoutingPath: () => splitRoutingPath,
    tryDecode: () => tryDecode
  });
  module.exports = __toCommonJS(url_exports);
  var splitPath = (path) => {
    const paths = path.split("/");
    if (paths[0] === "") {
      paths.shift();
    }
    return paths;
  };
  var splitRoutingPath = (routePath) => {
    const { groups, path } = extractGroupsFromPath(routePath);
    const paths = splitPath(path);
    return replaceGroupMarks(paths, groups);
  };
  var extractGroupsFromPath = (path) => {
    const groups = [];
    path = path.replace(/\{[^}]+\}/g, (match, index) => {
      const mark = `@${index}`;
      groups.push([mark, match]);
      return mark;
    });
    return { groups, path };
  };
  var replaceGroupMarks = (paths, groups) => {
    for (let i = groups.length - 1;i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = paths.length - 1;j >= 0; j--) {
        if (paths[j].includes(mark)) {
          paths[j] = paths[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    return paths;
  };
  var patternCache = {};
  var getPattern = (label, next) => {
    if (label === "*") {
      return "*";
    }
    const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    if (match) {
      const cacheKey = `${label}#${next}`;
      if (!patternCache[cacheKey]) {
        if (match[2]) {
          patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match[1], new RegExp(`^${match[2]}(?=/${next})`)] : [label, match[1], new RegExp(`^${match[2]}$`)];
        } else {
          patternCache[cacheKey] = [label, match[1], true];
        }
      }
      return patternCache[cacheKey];
    }
    return null;
  };
  var tryDecode = (str, decoder) => {
    try {
      return decoder(str);
    } catch {
      return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
        try {
          return decoder(match);
        } catch {
          return match;
        }
      });
    }
  };
  var tryDecodeURI = (str) => tryDecode(str, decodeURI);
  var getPath = (request) => {
    const url = request.url;
    const start = url.indexOf("/", url.indexOf(":") + 4);
    let i = start;
    for (;i < url.length; i++) {
      const charCode = url.charCodeAt(i);
      if (charCode === 37) {
        const queryIndex = url.indexOf("?", i);
        const path = url.slice(start, queryIndex === -1 ? undefined : queryIndex);
        return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
      } else if (charCode === 63) {
        break;
      }
    }
    return url.slice(start, i);
  };
  var getQueryStrings = (url) => {
    const queryIndex = url.indexOf("?", 8);
    return queryIndex === -1 ? "" : "?" + url.slice(queryIndex + 1);
  };
  var getPathNoStrict = (request) => {
    const result = getPath(request);
    return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
  };
  var mergePath = (base, sub, ...rest) => {
    if (rest.length) {
      sub = mergePath(sub, ...rest);
    }
    return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
  };
  var checkOptionalParameter = (path) => {
    if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
      return null;
    }
    const segments = path.split("/");
    const results = [];
    let basePath = "";
    segments.forEach((segment) => {
      if (segment !== "" && !/\:/.test(segment)) {
        basePath += "/" + segment;
      } else if (/\:/.test(segment)) {
        if (/\?/.test(segment)) {
          if (results.length === 0 && basePath === "") {
            results.push("/");
          } else {
            results.push(basePath);
          }
          const optionalSegment = segment.replace("?", "");
          basePath += "/" + optionalSegment;
          results.push(basePath);
        } else {
          basePath += "/" + segment;
        }
      }
    });
    return results.filter((v, i, a) => a.indexOf(v) === i);
  };
  var _decodeURI = (value) => {
    if (!/[%+]/.test(value)) {
      return value;
    }
    if (value.indexOf("+") !== -1) {
      value = value.replace(/\+/g, " ");
    }
    return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
  };
  var _getQueryParam = (url, key, multiple) => {
    let encoded;
    if (!multiple && key && !/[%+]/.test(key)) {
      let keyIndex2 = url.indexOf("?", 8);
      if (keyIndex2 === -1) {
        return;
      }
      if (!url.startsWith(key, keyIndex2 + 1)) {
        keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
      }
      while (keyIndex2 !== -1) {
        const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
        if (trailingKeyCode === 61) {
          const valueIndex = keyIndex2 + key.length + 2;
          const endIndex = url.indexOf("&", valueIndex);
          return _decodeURI(url.slice(valueIndex, endIndex === -1 ? undefined : endIndex));
        } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
          return "";
        }
        keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
      }
      encoded = /[%+]/.test(url);
      if (!encoded) {
        return;
      }
    }
    const results = {};
    encoded ??= /[%+]/.test(url);
    let keyIndex = url.indexOf("?", 8);
    while (keyIndex !== -1) {
      const nextKeyIndex = url.indexOf("&", keyIndex + 1);
      let valueIndex = url.indexOf("=", keyIndex);
      if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
        valueIndex = -1;
      }
      let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? undefined : nextKeyIndex : valueIndex);
      if (encoded) {
        name = _decodeURI(name);
      }
      keyIndex = nextKeyIndex;
      if (name === "") {
        continue;
      }
      let value;
      if (valueIndex === -1) {
        value = "";
      } else {
        value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? undefined : nextKeyIndex);
        if (encoded) {
          value = _decodeURI(value);
        }
      }
      if (multiple) {
        if (!(results[name] && Array.isArray(results[name]))) {
          results[name] = [];
        }
        results[name].push(value);
      } else {
        results[name] ??= value;
      }
    }
    return key ? results[key] : results;
  };
  var getQueryParam = _getQueryParam;
  var getQueryParams = (url, key) => {
    return _getQueryParam(url, key, true);
  };
  var decodeURIComponent_ = decodeURIComponent;
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/request.js
var require_request = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var request_exports = {};
  __export2(request_exports, {
    HonoRequest: () => HonoRequest,
    cloneRawRequest: () => cloneRawRequest
  });
  module.exports = __toCommonJS(request_exports);
  var import_http_exception = require_http_exception();
  var import_constants = require_constants();
  var import_body = require_body();
  var import_url = require_url();
  var tryDecodeURIComponent = (str) => (0, import_url.tryDecode)(str, import_url.decodeURIComponent_);

  class HonoRequest {
    raw;
    #validatedData;
    #matchResult;
    routeIndex = 0;
    path;
    bodyCache = {};
    constructor(request, path = "/", matchResult = [[]]) {
      this.raw = request;
      this.path = path;
      this.#matchResult = matchResult;
      this.#validatedData = {};
    }
    param(key) {
      return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
    }
    #getDecodedParam(key) {
      const paramKey = this.#matchResult[0][this.routeIndex][1][key];
      const param = this.#getParamValue(paramKey);
      return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
    }
    #getAllDecodedParams() {
      const decoded = {};
      const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
      for (const key of keys) {
        const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
        if (value !== undefined) {
          decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
        }
      }
      return decoded;
    }
    #getParamValue(paramKey) {
      return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
    }
    query(key) {
      return (0, import_url.getQueryParam)(this.url, key);
    }
    queries(key) {
      return (0, import_url.getQueryParams)(this.url, key);
    }
    header(name) {
      if (name) {
        return this.raw.headers.get(name) ?? undefined;
      }
      const headerData = {};
      this.raw.headers.forEach((value, key) => {
        headerData[key] = value;
      });
      return headerData;
    }
    async parseBody(options) {
      return this.bodyCache.parsedBody ??= await (0, import_body.parseBody)(this, options);
    }
    #cachedBody = (key) => {
      const { bodyCache, raw } = this;
      const cachedBody = bodyCache[key];
      if (cachedBody) {
        return cachedBody;
      }
      const anyCachedKey = Object.keys(bodyCache)[0];
      if (anyCachedKey) {
        return bodyCache[anyCachedKey].then((body) => {
          if (anyCachedKey === "json") {
            body = JSON.stringify(body);
          }
          return new Response(body)[key]();
        });
      }
      return bodyCache[key] = raw[key]();
    };
    json() {
      return this.#cachedBody("text").then((text) => JSON.parse(text));
    }
    text() {
      return this.#cachedBody("text");
    }
    arrayBuffer() {
      return this.#cachedBody("arrayBuffer");
    }
    blob() {
      return this.#cachedBody("blob");
    }
    formData() {
      return this.#cachedBody("formData");
    }
    addValidatedData(target, data) {
      this.#validatedData[target] = data;
    }
    valid(target) {
      return this.#validatedData[target];
    }
    get url() {
      return this.raw.url;
    }
    get method() {
      return this.raw.method;
    }
    get [import_constants.GET_MATCH_RESULT]() {
      return this.#matchResult;
    }
    get matchedRoutes() {
      return this.#matchResult[0].map(([[, route]]) => route);
    }
    get routePath() {
      return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
    }
  }
  var cloneRawRequest = async (req) => {
    if (!req.raw.bodyUsed) {
      return req.raw.clone();
    }
    const cacheKey = Object.keys(req.bodyCache)[0];
    if (!cacheKey) {
      throw new import_http_exception.HTTPException(500, {
        message: "Cannot clone request: body was already consumed and not cached. Please use HonoRequest methods (e.g., req.json(), req.text()) instead of consuming req.raw directly."
      });
    }
    const requestInit = {
      body: await req[cacheKey](),
      cache: req.raw.cache,
      credentials: req.raw.credentials,
      headers: req.header(),
      integrity: req.raw.integrity,
      keepalive: req.raw.keepalive,
      method: req.method,
      mode: req.raw.mode,
      redirect: req.raw.redirect,
      referrer: req.raw.referrer,
      referrerPolicy: req.raw.referrerPolicy,
      signal: req.raw.signal
    };
    return new Request(req.url, requestInit);
  };
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/utils/html.js
var require_html = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var html_exports = {};
  __export2(html_exports, {
    HtmlEscapedCallbackPhase: () => HtmlEscapedCallbackPhase,
    escapeToBuffer: () => escapeToBuffer,
    raw: () => raw,
    resolveCallback: () => resolveCallback,
    resolveCallbackSync: () => resolveCallbackSync,
    stringBufferToString: () => stringBufferToString
  });
  module.exports = __toCommonJS(html_exports);
  var HtmlEscapedCallbackPhase = {
    Stringify: 1,
    BeforeStream: 2,
    Stream: 3
  };
  var raw = (value, callbacks) => {
    const escapedString = new String(value);
    escapedString.isEscaped = true;
    escapedString.callbacks = callbacks;
    return escapedString;
  };
  var escapeRe = /[&<>'"]/;
  var stringBufferToString = async (buffer, callbacks) => {
    let str = "";
    callbacks ||= [];
    const resolvedBuffer = await Promise.all(buffer);
    for (let i = resolvedBuffer.length - 1;; i--) {
      str += resolvedBuffer[i];
      i--;
      if (i < 0) {
        break;
      }
      let r = resolvedBuffer[i];
      if (typeof r === "object") {
        callbacks.push(...r.callbacks || []);
      }
      const isEscaped = r.isEscaped;
      r = await (typeof r === "object" ? r.toString() : r);
      if (typeof r === "object") {
        callbacks.push(...r.callbacks || []);
      }
      if (r.isEscaped ?? isEscaped) {
        str += r;
      } else {
        const buf = [str];
        escapeToBuffer(r, buf);
        str = buf[0];
      }
    }
    return raw(str, callbacks);
  };
  var escapeToBuffer = (str, buffer) => {
    const match = str.search(escapeRe);
    if (match === -1) {
      buffer[0] += str;
      return;
    }
    let escape;
    let index;
    let lastIndex = 0;
    for (index = match;index < str.length; index++) {
      switch (str.charCodeAt(index)) {
        case 34:
          escape = "&quot;";
          break;
        case 39:
          escape = "&#39;";
          break;
        case 38:
          escape = "&amp;";
          break;
        case 60:
          escape = "&lt;";
          break;
        case 62:
          escape = "&gt;";
          break;
        default:
          continue;
      }
      buffer[0] += str.substring(lastIndex, index) + escape;
      lastIndex = index + 1;
    }
    buffer[0] += str.substring(lastIndex, index);
  };
  var resolveCallbackSync = (str) => {
    const callbacks = str.callbacks;
    if (!callbacks?.length) {
      return str;
    }
    const buffer = [str];
    const context = {};
    callbacks.forEach((c) => c({ phase: HtmlEscapedCallbackPhase.Stringify, buffer, context }));
    return buffer[0];
  };
  var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
    if (typeof str === "object" && !(str instanceof String)) {
      if (!(str instanceof Promise)) {
        str = str.toString();
      }
      if (str instanceof Promise) {
        str = await str;
      }
    }
    const callbacks = str.callbacks;
    if (!callbacks?.length) {
      return Promise.resolve(str);
    }
    if (buffer) {
      buffer[0] += str;
    } else {
      buffer = [str];
    }
    const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
    if (preserveCallbacks) {
      return raw(await resStr, callbacks);
    } else {
      return resStr;
    }
  };
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/context.js
var require_context = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var context_exports = {};
  __export2(context_exports, {
    Context: () => Context,
    TEXT_PLAIN: () => TEXT_PLAIN
  });
  module.exports = __toCommonJS(context_exports);
  var import_request = require_request();
  var import_html = require_html();
  var TEXT_PLAIN = "text/plain; charset=UTF-8";
  var setDefaultContentType = (contentType, headers) => {
    return {
      "Content-Type": contentType,
      ...headers
    };
  };

  class Context {
    #rawRequest;
    #req;
    env = {};
    #var;
    finalized = false;
    error;
    #status;
    #executionCtx;
    #res;
    #layout;
    #renderer;
    #notFoundHandler;
    #preparedHeaders;
    #matchResult;
    #path;
    constructor(req, options) {
      this.#rawRequest = req;
      if (options) {
        this.#executionCtx = options.executionCtx;
        this.env = options.env;
        this.#notFoundHandler = options.notFoundHandler;
        this.#path = options.path;
        this.#matchResult = options.matchResult;
      }
    }
    get req() {
      this.#req ??= new import_request.HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
      return this.#req;
    }
    get event() {
      if (this.#executionCtx && "respondWith" in this.#executionCtx) {
        return this.#executionCtx;
      } else {
        throw Error("This context has no FetchEvent");
      }
    }
    get executionCtx() {
      if (this.#executionCtx) {
        return this.#executionCtx;
      } else {
        throw Error("This context has no ExecutionContext");
      }
    }
    get res() {
      return this.#res ||= new Response(null, {
        headers: this.#preparedHeaders ??= new Headers
      });
    }
    set res(_res) {
      if (this.#res && _res) {
        _res = new Response(_res.body, _res);
        for (const [k, v] of this.#res.headers.entries()) {
          if (k === "content-type") {
            continue;
          }
          if (k === "set-cookie") {
            const cookies = this.#res.headers.getSetCookie();
            _res.headers.delete("set-cookie");
            for (const cookie of cookies) {
              _res.headers.append("set-cookie", cookie);
            }
          } else {
            _res.headers.set(k, v);
          }
        }
      }
      this.#res = _res;
      this.finalized = true;
    }
    render = (...args) => {
      this.#renderer ??= (content) => this.html(content);
      return this.#renderer(...args);
    };
    setLayout = (layout) => this.#layout = layout;
    getLayout = () => this.#layout;
    setRenderer = (renderer) => {
      this.#renderer = renderer;
    };
    header = (name, value, options) => {
      if (this.finalized) {
        this.#res = new Response(this.#res.body, this.#res);
      }
      const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers;
      if (value === undefined) {
        headers.delete(name);
      } else if (options?.append) {
        headers.append(name, value);
      } else {
        headers.set(name, value);
      }
    };
    status = (status) => {
      this.#status = status;
    };
    set = (key, value) => {
      this.#var ??= /* @__PURE__ */ new Map;
      this.#var.set(key, value);
    };
    get = (key) => {
      return this.#var ? this.#var.get(key) : undefined;
    };
    get var() {
      if (!this.#var) {
        return {};
      }
      return Object.fromEntries(this.#var);
    }
    #newResponse(data, arg, headers) {
      const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers;
      if (typeof arg === "object" && "headers" in arg) {
        const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
        for (const [key, value] of argHeaders) {
          if (key.toLowerCase() === "set-cookie") {
            responseHeaders.append(key, value);
          } else {
            responseHeaders.set(key, value);
          }
        }
      }
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
      const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
      return new Response(data, { status, headers: responseHeaders });
    }
    newResponse = (...args) => this.#newResponse(...args);
    body = (data, arg, headers) => this.#newResponse(data, arg, headers);
    text = (text, arg, headers) => {
      return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
    };
    json = (object, arg, headers) => {
      return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
    };
    html = (html, arg, headers) => {
      const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
      return typeof html === "object" ? (0, import_html.resolveCallback)(html, import_html.HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
    };
    redirect = (location, status) => {
      const locationString = String(location);
      this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
      return this.newResponse(null, status ?? 302);
    };
    notFound = () => {
      this.#notFoundHandler ??= () => new Response;
      return this.#notFoundHandler(this);
    };
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router.js
var require_router = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var router_exports = {};
  __export2(router_exports, {
    MESSAGE_MATCHER_IS_ALREADY_BUILT: () => MESSAGE_MATCHER_IS_ALREADY_BUILT,
    METHODS: () => METHODS,
    METHOD_NAME_ALL: () => METHOD_NAME_ALL,
    METHOD_NAME_ALL_LOWERCASE: () => METHOD_NAME_ALL_LOWERCASE,
    UnsupportedPathError: () => UnsupportedPathError
  });
  module.exports = __toCommonJS(router_exports);
  var METHOD_NAME_ALL = "ALL";
  var METHOD_NAME_ALL_LOWERCASE = "all";
  var METHODS = ["get", "post", "put", "delete", "options", "patch"];
  var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";

  class UnsupportedPathError extends Error {
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/utils/constants.js
var require_constants2 = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var constants_exports = {};
  __export2(constants_exports, {
    COMPOSED_HANDLER: () => COMPOSED_HANDLER
  });
  module.exports = __toCommonJS(constants_exports);
  var COMPOSED_HANDLER = "__COMPOSED_HANDLER";
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/hono-base.js
var require_hono_base = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var hono_base_exports = {};
  __export2(hono_base_exports, {
    HonoBase: () => Hono2
  });
  module.exports = __toCommonJS(hono_base_exports);
  var import_compose = require_compose();
  var import_context = require_context();
  var import_router = require_router();
  var import_constants = require_constants2();
  var import_url = require_url();
  var notFoundHandler = (c) => {
    return c.text("404 Not Found", 404);
  };
  var errorHandler = (err, c) => {
    if ("getResponse" in err) {
      const res = err.getResponse();
      return c.newResponse(res.body, res);
    }
    console.error(err);
    return c.text("Internal Server Error", 500);
  };

  class Hono2 {
    get;
    post;
    put;
    delete;
    options;
    patch;
    all;
    on;
    use;
    router;
    getPath;
    _basePath = "/";
    #path = "/";
    routes = [];
    constructor(options = {}) {
      const allMethods = [...import_router.METHODS, import_router.METHOD_NAME_ALL_LOWERCASE];
      allMethods.forEach((method) => {
        this[method] = (args1, ...args) => {
          if (typeof args1 === "string") {
            this.#path = args1;
          } else {
            this.#addRoute(method, this.#path, args1);
          }
          args.forEach((handler) => {
            this.#addRoute(method, this.#path, handler);
          });
          return this;
        };
      });
      this.on = (method, path, ...handlers) => {
        for (const p of [path].flat()) {
          this.#path = p;
          for (const m of [method].flat()) {
            handlers.map((handler) => {
              this.#addRoute(m.toUpperCase(), this.#path, handler);
            });
          }
        }
        return this;
      };
      this.use = (arg1, ...handlers) => {
        if (typeof arg1 === "string") {
          this.#path = arg1;
        } else {
          this.#path = "*";
          handlers.unshift(arg1);
        }
        handlers.forEach((handler) => {
          this.#addRoute(import_router.METHOD_NAME_ALL, this.#path, handler);
        });
        return this;
      };
      const { strict, ...optionsWithoutStrict } = options;
      Object.assign(this, optionsWithoutStrict);
      this.getPath = strict ?? true ? options.getPath ?? import_url.getPath : import_url.getPathNoStrict;
    }
    #clone() {
      const clone = new Hono2({
        router: this.router,
        getPath: this.getPath
      });
      clone.errorHandler = this.errorHandler;
      clone.#notFoundHandler = this.#notFoundHandler;
      clone.routes = this.routes;
      return clone;
    }
    #notFoundHandler = notFoundHandler;
    errorHandler = errorHandler;
    route(path, app) {
      const subApp = this.basePath(path);
      app.routes.map((r) => {
        let handler;
        if (app.errorHandler === errorHandler) {
          handler = r.handler;
        } else {
          handler = async (c, next) => (await (0, import_compose.compose)([], app.errorHandler)(c, () => r.handler(c, next))).res;
          handler[import_constants.COMPOSED_HANDLER] = r.handler;
        }
        subApp.#addRoute(r.method, r.path, handler);
      });
      return this;
    }
    basePath(path) {
      const subApp = this.#clone();
      subApp._basePath = (0, import_url.mergePath)(this._basePath, path);
      return subApp;
    }
    onError = (handler) => {
      this.errorHandler = handler;
      return this;
    };
    notFound = (handler) => {
      this.#notFoundHandler = handler;
      return this;
    };
    mount(path, applicationHandler, options) {
      let replaceRequest;
      let optionHandler;
      if (options) {
        if (typeof options === "function") {
          optionHandler = options;
        } else {
          optionHandler = options.optionHandler;
          if (options.replaceRequest === false) {
            replaceRequest = (request) => request;
          } else {
            replaceRequest = options.replaceRequest;
          }
        }
      }
      const getOptions = optionHandler ? (c) => {
        const options2 = optionHandler(c);
        return Array.isArray(options2) ? options2 : [options2];
      } : (c) => {
        let executionContext = undefined;
        try {
          executionContext = c.executionCtx;
        } catch {}
        return [c.env, executionContext];
      };
      replaceRequest ||= (() => {
        const mergedPath = (0, import_url.mergePath)(this._basePath, path);
        const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
        return (request) => {
          const url = new URL(request.url);
          url.pathname = url.pathname.slice(pathPrefixLength) || "/";
          return new Request(url, request);
        };
      })();
      const handler = async (c, next) => {
        const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
        if (res) {
          return res;
        }
        await next();
      };
      this.#addRoute(import_router.METHOD_NAME_ALL, (0, import_url.mergePath)(path, "*"), handler);
      return this;
    }
    #addRoute(method, path, handler) {
      method = method.toUpperCase();
      path = (0, import_url.mergePath)(this._basePath, path);
      const r = { basePath: this._basePath, path, method, handler };
      this.router.add(method, path, [handler, r]);
      this.routes.push(r);
    }
    #handleError(err, c) {
      if (err instanceof Error) {
        return this.errorHandler(err, c);
      }
      throw err;
    }
    #dispatch(request, executionCtx, env, method) {
      if (method === "HEAD") {
        return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
      }
      const path = this.getPath(request, { env });
      const matchResult = this.router.match(method, path);
      const c = new import_context.Context(request, {
        path,
        matchResult,
        env,
        executionCtx,
        notFoundHandler: this.#notFoundHandler
      });
      if (matchResult[0].length === 1) {
        let res;
        try {
          res = matchResult[0][0][0][0](c, async () => {
            c.res = await this.#notFoundHandler(c);
          });
        } catch (err) {
          return this.#handleError(err, c);
        }
        return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
      }
      const composed = (0, import_compose.compose)(matchResult[0], this.errorHandler, this.#notFoundHandler);
      return (async () => {
        try {
          const context = await composed(c);
          if (!context.finalized) {
            throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
          }
          return context.res;
        } catch (err) {
          return this.#handleError(err, c);
        }
      })();
    }
    fetch = (request, ...rest) => {
      return this.#dispatch(request, rest[1], rest[0], request.method);
    };
    request = (input, requestInit, Env, executionCtx) => {
      if (input instanceof Request) {
        return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
      }
      input = input.toString();
      return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${(0, import_url.mergePath)("/", input)}`, requestInit), Env, executionCtx);
    };
    fire = () => {
      addEventListener("fetch", (event) => {
        event.respondWith(this.#dispatch(event.request, event, undefined, event.request.method));
      });
    };
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router/reg-exp-router/matcher.js
var require_matcher = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var matcher_exports = {};
  __export2(matcher_exports, {
    emptyParam: () => emptyParam,
    match: () => match
  });
  module.exports = __toCommonJS(matcher_exports);
  var import_router = require_router();
  var emptyParam = [];
  function match(method, path) {
    const matchers = this.buildAllMatchers();
    const match2 = (method2, path2) => {
      const matcher = matchers[method2] || matchers[import_router.METHOD_NAME_ALL];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match3 = path2.match(matcher[0]);
      if (!match3) {
        return [[], emptyParam];
      }
      const index = match3.indexOf("", 1);
      return [matcher[1][index], match3];
    };
    this.match = match2;
    return match2(method, path);
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router/reg-exp-router/node.js
var require_node = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var node_exports = {};
  __export2(node_exports, {
    Node: () => Node,
    PATH_ERROR: () => PATH_ERROR
  });
  module.exports = __toCommonJS(node_exports);
  var LABEL_REG_EXP_STR = "[^/]+";
  var ONLY_WILDCARD_REG_EXP_STR = ".*";
  var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
  var PATH_ERROR = /* @__PURE__ */ Symbol();
  var regExpMetaChars = new Set(".\\+*[^]$()");
  function compareKey(a, b) {
    if (a.length === 1) {
      return b.length === 1 ? a < b ? -1 : 1 : -1;
    }
    if (b.length === 1) {
      return 1;
    }
    if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
      return 1;
    } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
      return -1;
    }
    if (a === LABEL_REG_EXP_STR) {
      return 1;
    } else if (b === LABEL_REG_EXP_STR) {
      return -1;
    }
    return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
  }

  class Node {
    #index;
    #varIndex;
    #children = /* @__PURE__ */ Object.create(null);
    insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
      if (tokens.length === 0) {
        if (this.#index !== undefined) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        this.#index = index;
        return;
      }
      const [token, ...restTokens] = tokens;
      const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let node;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          if (regexpStr === ".*") {
            throw PATH_ERROR;
          }
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        node = this.#children[regexpStr];
        if (!node) {
          if (Object.keys(this.#children).some((k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR)) {
            throw PATH_ERROR;
          }
          if (pathErrorCheckOnly) {
            return;
          }
          node = this.#children[regexpStr] = new Node;
          if (name !== "") {
            node.#varIndex = context.varIndex++;
          }
        }
        if (!pathErrorCheckOnly && name !== "") {
          paramMap.push([name, node.#varIndex]);
        }
      } else {
        node = this.#children[token];
        if (!node) {
          if (Object.keys(this.#children).some((k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR)) {
            throw PATH_ERROR;
          }
          if (pathErrorCheckOnly) {
            return;
          }
          node = this.#children[token] = new Node;
        }
      }
      node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
    }
    buildRegExpStr() {
      const childKeys = Object.keys(this.#children).sort(compareKey);
      const strList = childKeys.map((k) => {
        const c = this.#children[k];
        return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
      });
      if (typeof this.#index === "number") {
        strList.unshift(`#${this.#index}`);
      }
      if (strList.length === 0) {
        return "";
      }
      if (strList.length === 1) {
        return strList[0];
      }
      return "(?:" + strList.join("|") + ")";
    }
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router/reg-exp-router/trie.js
var require_trie = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var trie_exports = {};
  __export2(trie_exports, {
    Trie: () => Trie
  });
  module.exports = __toCommonJS(trie_exports);
  var import_node = require_node();

  class Trie {
    #context = { varIndex: 0 };
    #root = new import_node.Node;
    insert(path, index, pathErrorCheckOnly) {
      const paramAssoc = [];
      const groups = [];
      for (let i = 0;; ) {
        let replaced = false;
        path = path.replace(/\{[^}]+\}/g, (m) => {
          const mark = `@\\${i}`;
          groups[i] = [mark, m];
          i++;
          replaced = true;
          return mark;
        });
        if (!replaced) {
          break;
        }
      }
      const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
      for (let i = groups.length - 1;i >= 0; i--) {
        const [mark] = groups[i];
        for (let j = tokens.length - 1;j >= 0; j--) {
          if (tokens[j].indexOf(mark) !== -1) {
            tokens[j] = tokens[j].replace(mark, groups[i][1]);
            break;
          }
        }
      }
      this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
      return paramAssoc;
    }
    buildRegExp() {
      let regexp = this.#root.buildRegExpStr();
      if (regexp === "") {
        return [/^$/, [], []];
      }
      let captureIndex = 0;
      const indexReplacementMap = [];
      const paramReplacementMap = [];
      regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
        if (handlerIndex !== undefined) {
          indexReplacementMap[++captureIndex] = Number(handlerIndex);
          return "$()";
        }
        if (paramIndex !== undefined) {
          paramReplacementMap[Number(paramIndex)] = ++captureIndex;
          return "";
        }
        return "";
      });
      return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
    }
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router/reg-exp-router/router.js
var require_router2 = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var router_exports = {};
  __export2(router_exports, {
    RegExpRouter: () => RegExpRouter2
  });
  module.exports = __toCommonJS(router_exports);
  var import_router = require_router();
  var import_url = require_url();
  var import_matcher = require_matcher();
  var import_node = require_node();
  var import_trie = require_trie();
  var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
  var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
  function buildWildcardRegExp(path) {
    return wildcardRegExpCache[path] ??= new RegExp(path === "*" ? "" : `^${path.replace(/\/\*$|([.\\+*[^\]$()])/g, (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)")}$`);
  }
  function clearWildcardRegExpCache() {
    wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
  }
  function buildMatcherFromPreprocessedRoutes(routes) {
    const trie = new import_trie.Trie;
    const handlerData = [];
    if (routes.length === 0) {
      return nullMatcher;
    }
    const routesWithStaticPathFlag = routes.map((route) => [!/\*|\/:/.test(route[0]), ...route]).sort(([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length);
    const staticMap = /* @__PURE__ */ Object.create(null);
    for (let i = 0, j = -1, len = routesWithStaticPathFlag.length;i < len; i++) {
      const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
      if (pathErrorCheckOnly) {
        staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), import_matcher.emptyParam];
      } else {
        j++;
      }
      let paramAssoc;
      try {
        paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
      } catch (e) {
        throw e === import_node.PATH_ERROR ? new import_router.UnsupportedPathError(path) : e;
      }
      if (pathErrorCheckOnly) {
        continue;
      }
      handlerData[j] = handlers.map(([h, paramCount]) => {
        const paramIndexMap = /* @__PURE__ */ Object.create(null);
        paramCount -= 1;
        for (;paramCount >= 0; paramCount--) {
          const [key, value] = paramAssoc[paramCount];
          paramIndexMap[key] = value;
        }
        return [h, paramIndexMap];
      });
    }
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (let i = 0, len = handlerData.length;i < len; i++) {
      for (let j = 0, len2 = handlerData[i].length;j < len2; j++) {
        const map = handlerData[i][j]?.[1];
        if (!map) {
          continue;
        }
        const keys = Object.keys(map);
        for (let k = 0, len3 = keys.length;k < len3; k++) {
          map[keys[k]] = paramReplacementMap[map[keys[k]]];
        }
      }
    }
    const handlerMap = [];
    for (const i in indexReplacementMap) {
      handlerMap[i] = handlerData[indexReplacementMap[i]];
    }
    return [regexp, handlerMap, staticMap];
  }
  function findMiddleware(middleware, path) {
    if (!middleware) {
      return;
    }
    for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
      if (buildWildcardRegExp(k).test(path)) {
        return [...middleware[k]];
      }
    }
    return;
  }

  class RegExpRouter2 {
    name = "RegExpRouter";
    #middleware;
    #routes;
    constructor() {
      this.#middleware = { [import_router.METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
      this.#routes = { [import_router.METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    }
    add(method, path, handler) {
      const middleware = this.#middleware;
      const routes = this.#routes;
      if (!middleware || !routes) {
        throw new Error(import_router.MESSAGE_MATCHER_IS_ALREADY_BUILT);
      }
      if (!middleware[method]) {
        [middleware, routes].forEach((handlerMap) => {
          handlerMap[method] = /* @__PURE__ */ Object.create(null);
          Object.keys(handlerMap[import_router.METHOD_NAME_ALL]).forEach((p) => {
            handlerMap[method][p] = [...handlerMap[import_router.METHOD_NAME_ALL][p]];
          });
        });
      }
      if (path === "/*") {
        path = "*";
      }
      const paramCount = (path.match(/\/:/g) || []).length;
      if (/\*$/.test(path)) {
        const re = buildWildcardRegExp(path);
        if (method === import_router.METHOD_NAME_ALL) {
          Object.keys(middleware).forEach((m) => {
            middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[import_router.METHOD_NAME_ALL], path) || [];
          });
        } else {
          middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[import_router.METHOD_NAME_ALL], path) || [];
        }
        Object.keys(middleware).forEach((m) => {
          if (method === import_router.METHOD_NAME_ALL || method === m) {
            Object.keys(middleware[m]).forEach((p) => {
              re.test(p) && middleware[m][p].push([handler, paramCount]);
            });
          }
        });
        Object.keys(routes).forEach((m) => {
          if (method === import_router.METHOD_NAME_ALL || method === m) {
            Object.keys(routes[m]).forEach((p) => re.test(p) && routes[m][p].push([handler, paramCount]));
          }
        });
        return;
      }
      const paths = (0, import_url.checkOptionalParameter)(path) || [path];
      for (let i = 0, len = paths.length;i < len; i++) {
        const path2 = paths[i];
        Object.keys(routes).forEach((m) => {
          if (method === import_router.METHOD_NAME_ALL || method === m) {
            routes[m][path2] ||= [
              ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[import_router.METHOD_NAME_ALL], path2) || []
            ];
            routes[m][path2].push([handler, paramCount - len + i + 1]);
          }
        });
      }
    }
    match = import_matcher.match;
    buildAllMatchers() {
      const matchers = /* @__PURE__ */ Object.create(null);
      Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
        matchers[method] ||= this.#buildMatcher(method);
      });
      this.#middleware = this.#routes = undefined;
      clearWildcardRegExpCache();
      return matchers;
    }
    #buildMatcher(method) {
      const routes = [];
      let hasOwnRoute = method === import_router.METHOD_NAME_ALL;
      [this.#middleware, this.#routes].forEach((r) => {
        const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
        if (ownRoute.length !== 0) {
          hasOwnRoute ||= true;
          routes.push(...ownRoute);
        } else if (method !== import_router.METHOD_NAME_ALL) {
          routes.push(...Object.keys(r[import_router.METHOD_NAME_ALL]).map((path) => [path, r[import_router.METHOD_NAME_ALL][path]]));
        }
      });
      if (!hasOwnRoute) {
        return null;
      } else {
        return buildMatcherFromPreprocessedRoutes(routes);
      }
    }
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router/reg-exp-router/prepared-router.js
var require_prepared_router = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var prepared_router_exports = {};
  __export2(prepared_router_exports, {
    PreparedRegExpRouter: () => PreparedRegExpRouter2,
    buildInitParams: () => buildInitParams2,
    serializeInitParams: () => serializeInitParams2
  });
  module.exports = __toCommonJS(prepared_router_exports);
  var import_router = require_router();
  var import_matcher = require_matcher();
  var import_router2 = require_router2();

  class PreparedRegExpRouter2 {
    name = "PreparedRegExpRouter";
    #matchers;
    #relocateMap;
    constructor(matchers, relocateMap) {
      this.#matchers = matchers;
      this.#relocateMap = relocateMap;
    }
    #addWildcard(method, handlerData) {
      const matcher = this.#matchers[method];
      matcher[1].forEach((list) => list && list.push(handlerData));
      Object.values(matcher[2]).forEach((list) => list[0].push(handlerData));
    }
    #addPath(method, path, handler, indexes, map) {
      const matcher = this.#matchers[method];
      if (!map) {
        matcher[2][path][0].push([handler, {}]);
      } else {
        indexes.forEach((index) => {
          if (typeof index === "number") {
            matcher[1][index].push([handler, map]);
          } else {
            matcher[2][index || path][0].push([handler, map]);
          }
        });
      }
    }
    add(method, path, handler) {
      if (!this.#matchers[method]) {
        const all = this.#matchers[import_router.METHOD_NAME_ALL];
        const staticMap = {};
        for (const key in all[2]) {
          staticMap[key] = [all[2][key][0].slice(), import_matcher.emptyParam];
        }
        this.#matchers[method] = [
          all[0],
          all[1].map((list) => Array.isArray(list) ? list.slice() : 0),
          staticMap
        ];
      }
      if (path === "/*" || path === "*") {
        const handlerData = [handler, {}];
        if (method === import_router.METHOD_NAME_ALL) {
          for (const m in this.#matchers) {
            this.#addWildcard(m, handlerData);
          }
        } else {
          this.#addWildcard(method, handlerData);
        }
        return;
      }
      const data = this.#relocateMap[path];
      if (!data) {
        throw new Error(`Path ${path} is not registered`);
      }
      for (const [indexes, map] of data) {
        if (method === import_router.METHOD_NAME_ALL) {
          for (const m in this.#matchers) {
            this.#addPath(m, path, handler, indexes, map);
          }
        } else {
          this.#addPath(method, path, handler, indexes, map);
        }
      }
    }
    buildAllMatchers() {
      return this.#matchers;
    }
    match = import_matcher.match;
  }
  var buildInitParams2 = ({ paths }) => {
    const RegExpRouterWithMatcherExport = class extends import_router2.RegExpRouter {
      buildAndExportAllMatchers() {
        return this.buildAllMatchers();
      }
    };
    const router = new RegExpRouterWithMatcherExport;
    for (const path of paths) {
      router.add(import_router.METHOD_NAME_ALL, path, path);
    }
    const matchers = router.buildAndExportAllMatchers();
    const all = matchers[import_router.METHOD_NAME_ALL];
    const relocateMap = {};
    for (const path of paths) {
      if (path === "/*" || path === "*") {
        continue;
      }
      all[1].forEach((list, i) => {
        list.forEach(([p, map]) => {
          if (p === path) {
            if (relocateMap[path]) {
              relocateMap[path][0][1] = {
                ...relocateMap[path][0][1],
                ...map
              };
            } else {
              relocateMap[path] = [[[], map]];
            }
            if (relocateMap[path][0][0].findIndex((j) => j === i) === -1) {
              relocateMap[path][0][0].push(i);
            }
          }
        });
      });
      for (const path2 in all[2]) {
        all[2][path2][0].forEach(([p]) => {
          if (p === path) {
            relocateMap[path] ||= [[[]]];
            const value = path2 === path ? "" : path2;
            if (relocateMap[path][0][0].findIndex((v) => v === value) === -1) {
              relocateMap[path][0][0].push(value);
            }
          }
        });
      }
    }
    for (let i = 0, len = all[1].length;i < len; i++) {
      all[1][i] = all[1][i] ? [] : 0;
    }
    for (const path in all[2]) {
      all[2][path][0] = [];
    }
    return [matchers, relocateMap];
  };
  var serializeInitParams2 = ([matchers, relocateMap]) => {
    const matchersStr = JSON.stringify(matchers, (_, value) => value instanceof RegExp ? `##${value.toString()}##` : value).replace(/"##(.+?)##"/g, (_, str) => str.replace(/\\\\/g, "\\"));
    const relocateMapStr = JSON.stringify(relocateMap);
    return `[${matchersStr},${relocateMapStr}]`;
  };
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router/reg-exp-router/index.js
var require_reg_exp_router = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var reg_exp_router_exports = {};
  __export2(reg_exp_router_exports, {
    PreparedRegExpRouter: () => import_prepared_router.PreparedRegExpRouter,
    RegExpRouter: () => import_router.RegExpRouter,
    buildInitParams: () => import_prepared_router.buildInitParams,
    serializeInitParams: () => import_prepared_router.serializeInitParams
  });
  module.exports = __toCommonJS(reg_exp_router_exports);
  var import_router = require_router2();
  var import_prepared_router = require_prepared_router();
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router/smart-router/router.js
var require_router3 = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var router_exports = {};
  __export2(router_exports, {
    SmartRouter: () => SmartRouter2
  });
  module.exports = __toCommonJS(router_exports);
  var import_router = require_router();

  class SmartRouter2 {
    name = "SmartRouter";
    #routers = [];
    #routes = [];
    constructor(init) {
      this.#routers = init.routers;
    }
    add(method, path, handler) {
      if (!this.#routes) {
        throw new Error(import_router.MESSAGE_MATCHER_IS_ALREADY_BUILT);
      }
      this.#routes.push([method, path, handler]);
    }
    match(method, path) {
      if (!this.#routes) {
        throw new Error("Fatal error");
      }
      const routers = this.#routers;
      const routes = this.#routes;
      const len = routers.length;
      let i = 0;
      let res;
      for (;i < len; i++) {
        const router = routers[i];
        try {
          for (let i2 = 0, len2 = routes.length;i2 < len2; i2++) {
            router.add(...routes[i2]);
          }
          res = router.match(method, path);
        } catch (e) {
          if (e instanceof import_router.UnsupportedPathError) {
            continue;
          }
          throw e;
        }
        this.match = router.match.bind(router);
        this.#routers = [router];
        this.#routes = undefined;
        break;
      }
      if (i === len) {
        throw new Error("Fatal error");
      }
      this.name = `SmartRouter + ${this.activeRouter.name}`;
      return res;
    }
    get activeRouter() {
      if (this.#routes || this.#routers.length !== 1) {
        throw new Error("No active router has been determined yet.");
      }
      return this.#routers[0];
    }
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router/smart-router/index.js
var require_smart_router = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var smart_router_exports = {};
  __export2(smart_router_exports, {
    SmartRouter: () => import_router.SmartRouter
  });
  module.exports = __toCommonJS(smart_router_exports);
  var import_router = require_router3();
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router/trie-router/node.js
var require_node2 = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var node_exports = {};
  __export2(node_exports, {
    Node: () => Node
  });
  module.exports = __toCommonJS(node_exports);
  var import_router = require_router();
  var import_url = require_url();
  var emptyParams = /* @__PURE__ */ Object.create(null);

  class Node {
    #methods;
    #children;
    #patterns;
    #order = 0;
    #params = emptyParams;
    constructor(method, handler, children) {
      this.#children = children || /* @__PURE__ */ Object.create(null);
      this.#methods = [];
      if (method && handler) {
        const m = /* @__PURE__ */ Object.create(null);
        m[method] = { handler, possibleKeys: [], score: 0 };
        this.#methods = [m];
      }
      this.#patterns = [];
    }
    insert(method, path, handler) {
      this.#order = ++this.#order;
      let curNode = this;
      const parts = (0, import_url.splitRoutingPath)(path);
      const possibleKeys = [];
      for (let i = 0, len = parts.length;i < len; i++) {
        const p = parts[i];
        const nextP = parts[i + 1];
        const pattern = (0, import_url.getPattern)(p, nextP);
        const key = Array.isArray(pattern) ? pattern[0] : p;
        if (key in curNode.#children) {
          curNode = curNode.#children[key];
          if (pattern) {
            possibleKeys.push(pattern[1]);
          }
          continue;
        }
        curNode.#children[key] = new Node;
        if (pattern) {
          curNode.#patterns.push(pattern);
          possibleKeys.push(pattern[1]);
        }
        curNode = curNode.#children[key];
      }
      curNode.#methods.push({
        [method]: {
          handler,
          possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
          score: this.#order
        }
      });
      return curNode;
    }
    #getHandlerSets(node, method, nodeParams, params) {
      const handlerSets = [];
      for (let i = 0, len = node.#methods.length;i < len; i++) {
        const m = node.#methods[i];
        const handlerSet = m[method] || m[import_router.METHOD_NAME_ALL];
        const processedSet = {};
        if (handlerSet !== undefined) {
          handlerSet.params = /* @__PURE__ */ Object.create(null);
          handlerSets.push(handlerSet);
          if (nodeParams !== emptyParams || params && params !== emptyParams) {
            for (let i2 = 0, len2 = handlerSet.possibleKeys.length;i2 < len2; i2++) {
              const key = handlerSet.possibleKeys[i2];
              const processed = processedSet[handlerSet.score];
              handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
              processedSet[handlerSet.score] = true;
            }
          }
        }
      }
      return handlerSets;
    }
    search(method, path) {
      const handlerSets = [];
      this.#params = emptyParams;
      const curNode = this;
      let curNodes = [curNode];
      const parts = (0, import_url.splitPath)(path);
      const curNodesQueue = [];
      for (let i = 0, len = parts.length;i < len; i++) {
        const part = parts[i];
        const isLast = i === len - 1;
        const tempNodes = [];
        for (let j = 0, len2 = curNodes.length;j < len2; j++) {
          const node = curNodes[j];
          const nextNode = node.#children[part];
          if (nextNode) {
            nextNode.#params = node.#params;
            if (isLast) {
              if (nextNode.#children["*"]) {
                handlerSets.push(...this.#getHandlerSets(nextNode.#children["*"], method, node.#params));
              }
              handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
            } else {
              tempNodes.push(nextNode);
            }
          }
          for (let k = 0, len3 = node.#patterns.length;k < len3; k++) {
            const pattern = node.#patterns[k];
            const params = node.#params === emptyParams ? {} : { ...node.#params };
            if (pattern === "*") {
              const astNode = node.#children["*"];
              if (astNode) {
                handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
                astNode.#params = params;
                tempNodes.push(astNode);
              }
              continue;
            }
            const [key, name, matcher] = pattern;
            if (!part && !(matcher instanceof RegExp)) {
              continue;
            }
            const child = node.#children[key];
            const restPathString = parts.slice(i).join("/");
            if (matcher instanceof RegExp) {
              const m = matcher.exec(restPathString);
              if (m) {
                params[name] = m[0];
                handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
                if (Object.keys(child.#children).length) {
                  child.#params = params;
                  const componentCount = m[0].match(/\//)?.length ?? 0;
                  const targetCurNodes = curNodesQueue[componentCount] ||= [];
                  targetCurNodes.push(child);
                }
                continue;
              }
            }
            if (matcher === true || matcher.test(part)) {
              params[name] = part;
              if (isLast) {
                handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
                if (child.#children["*"]) {
                  handlerSets.push(...this.#getHandlerSets(child.#children["*"], method, params, node.#params));
                }
              } else {
                child.#params = params;
                tempNodes.push(child);
              }
            }
          }
        }
        curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
      }
      if (handlerSets.length > 1) {
        handlerSets.sort((a, b) => {
          return a.score - b.score;
        });
      }
      return [handlerSets.map(({ handler, params }) => [handler, params])];
    }
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router/trie-router/router.js
var require_router4 = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var router_exports = {};
  __export2(router_exports, {
    TrieRouter: () => TrieRouter2
  });
  module.exports = __toCommonJS(router_exports);
  var import_url = require_url();
  var import_node = require_node2();

  class TrieRouter2 {
    name = "TrieRouter";
    #node;
    constructor() {
      this.#node = new import_node.Node;
    }
    add(method, path, handler) {
      const results = (0, import_url.checkOptionalParameter)(path);
      if (results) {
        for (let i = 0, len = results.length;i < len; i++) {
          this.#node.insert(method, results[i], handler);
        }
        return;
      }
      this.#node.insert(method, path, handler);
    }
    match(method, path) {
      return this.#node.search(method, path);
    }
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/router/trie-router/index.js
var require_trie_router = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var trie_router_exports = {};
  __export2(trie_router_exports, {
    TrieRouter: () => import_router.TrieRouter
  });
  module.exports = __toCommonJS(trie_router_exports);
  var import_router = require_router4();
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/hono.js
var require_hono = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var hono_exports = {};
  __export2(hono_exports, {
    Hono: () => Hono2
  });
  module.exports = __toCommonJS(hono_exports);
  var import_hono_base = require_hono_base();
  var import_reg_exp_router = require_reg_exp_router();
  var import_smart_router = require_smart_router();
  var import_trie_router = require_trie_router();

  class Hono2 extends import_hono_base.HonoBase {
    constructor(options = {}) {
      super(options);
      this.router = options.router ?? new import_smart_router.SmartRouter({
        routers: [new import_reg_exp_router.RegExpRouter, new import_trie_router.TrieRouter]
      });
    }
  }
});

// ../../node_modules/.bun/hono@4.11.1/node_modules/hono/dist/cjs/index.js
var require_cjs = __commonJS((exports, module) => {
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames2 = Object.getOwnPropertyNames;
  var __hasOwnProp2 = Object.prototype.hasOwnProperty;
  var __export2 = (target, all) => {
    for (var name in all)
      __defProp2(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames2(from))
        if (!__hasOwnProp2.call(to, key) && key !== except)
          __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var index_exports = {};
  __export2(index_exports, {
    Hono: () => import_hono.Hono
  });
  module.exports = __toCommonJS(index_exports);
  var import_hono = require_hono();
});
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
      const { Hono: HonoClass } = require_cjs();
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
import crypto from "crypto";

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
    core.logger.info("\uD83D\uDEF0\uFE0F Orbit Inertia installed");
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
