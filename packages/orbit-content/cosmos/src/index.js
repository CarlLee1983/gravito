import { createRequire } from "node:module";
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
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// ../cosmos/src/I18nService.ts
class I18nManager {
  config;
  _locale;
  translations = {};
  constructor(config) {
    this.config = config;
    this._locale = config.defaultLocale;
    if (config.translations) {
      this.translations = config.translations;
    }
  }
  get locale() {
    return this._locale;
  }
  set locale(value) {
    this.setLocale(value);
  }
  setLocale(locale) {
    if (this.config.supportedLocales.includes(locale)) {
      this._locale = locale;
    }
  }
  getLocale() {
    return this._locale;
  }
  addResource(locale, translations) {
    this.translations[locale] = {
      ...this.translations[locale] || {},
      ...translations
    };
  }
  t(key, replacements) {
    const keys = key.split(".");
    let value = this.translations[this._locale];
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }
    if (value === undefined && this._locale !== this.config.defaultLocale) {
      let fallbackValue = this.translations[this.config.defaultLocale];
      for (const k of keys) {
        if (fallbackValue && typeof fallbackValue === "object" && k in fallbackValue) {
          fallbackValue = fallbackValue[k];
        } else {
          fallbackValue = undefined;
          break;
        }
      }
      value = fallbackValue;
    }
    if (value === undefined || typeof value !== "string") {
      return key;
    }
    if (replacements) {
      for (const [search, replace] of Object.entries(replacements)) {
        value = value.replace(new RegExp(`:${search}`, "g"), String(replace));
      }
    }
    return value;
  }
  has(key) {
    return this.t(key) !== key;
  }
}
var localeMiddleware = (i18n) => {
  return async (c, next) => {
    const paramLocale = c.req.param("locale");
    if (paramLocale) {
      i18n.setLocale(paramLocale);
    }
    c.set("i18n", i18n);
    await next();
  };
};
// ../cosmos/src/loader.ts
import { readdir, readFile } from "node:fs/promises";
import { join, parse } from "node:path";
async function loadTranslations(directory) {
  const translations = {};
  try {
    const files = await readdir(directory);
    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const locale = parse(file).name;
      const content = await readFile(join(directory, file), "utf-8");
      try {
        translations[locale] = JSON.parse(content);
      } catch (e) {
        console.error(`[Orbit-I18n] Failed to parse translation file: ${file}`, e);
      }
    }
  } catch (_e) {
    console.warn(`[Orbit-I18n] Could not load translations from ${directory}. Directory might not exist.`);
  }
  return translations;
}

// ../cosmos/src/index.ts
class I18nOrbit {
  config;
  constructor(config) {
    this.config = config;
  }
  install(core) {
    const i18n = new I18nManager(this.config);
    core.app.use("*", async (c, next) => {
      c.set("i18n", i18n);
      await next();
    });
    core.logger.info(`I18n Orbit initialized with locale: ${this.config.defaultLocale}`);
  }
}
export {
  localeMiddleware,
  loadTranslations,
  I18nOrbit,
  I18nManager
};
