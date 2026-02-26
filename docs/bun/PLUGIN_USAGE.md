# Bun Plugin Usage in Gravito

## Overview
Plugins enable custom file loading and build-time processing.

## Built-in Gravito Plugin

### Installation
```ts
// bunfig.toml
[build]
plugins = ["./packages/luminosity-cli/src/plugins/bun-loader.ts"]
```

### Usage
```ts
import { createGravitoPlugin } from "@gravito/luminosity-cli";

const plugin = createGravitoPlugin({
  validateSchemas: true,
  debug: false,
});
```

## Creating Custom Plugins

### Example: YAML Schema Loader
```ts
import type { Plugin } from "bun";

export const yamlSchemaPlugin: Plugin = {
  name: "yaml-schema",
  setup(build) {
    build.onLoad(
      { filter: /\.schema\.ya?ml$/ },
      async (args) => {
        const yaml = await import("yaml");
        const content = await Bun.file(args.path).text();
        const data = yaml.parse(content);
        return {
          contents: `export default ${JSON.stringify(data)}`,
          loader: "js",
        };
      }
    );
  },
};
```
