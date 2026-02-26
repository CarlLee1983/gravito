# Bun Quick Start for Developers

## Running Scripts

```bash
# Auto-installs dependencies on first run
bun run scripts/check-versions.ts

# Specific version
bun run scripts/validate-docs.ts
```

## Using Import Attributes

```ts
// Config file
import config from "./app.toml" with { type: "toml" };

// Database
import db from "./data.sqlite" with { type: "sqlite" };
```

## JSX in Multiple Frameworks

React (default):
```tsx
export const App = () => <div>React</div>;
```

Preact (file-specific):
```tsx
// @jsxImportSource preact
export const App = () => <div>Preact</div>;
```

## File System Router

```ts
import { FileSystemRouter } from "bun";

const router = new Bun.FileSystemRouter({
  style: "nextjs",
  dir: "./pages",
});

const match = router.match("/about");
```
