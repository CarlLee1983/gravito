import { createRequire } from "node:module";
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// ../ion/src/index.ts
import { HonoContextWrapper } from "gravito-core";

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
