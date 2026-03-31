import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { depsGraph, resolveEntryPath } from "../src/commands/depsGraph";

const REPO_ROOT = process.cwd();

async function createFixture() {
  const dir = await fs.mkdtemp(path.join(import.meta.dir, "temp-deps-"));
  return {
    dir,
    entry: path.join(dir, "app.ts"),
    srcIndex: path.join(dir, "src/index.ts"),
    config: path.join(dir, "gravito.config.ts"),
  };
}

function buildOrbitAppContent() {
  return `
import { PlanetCore } from "${path.resolve(REPO_ROOT, "packages/core/src/index.ts")}";

const core = new PlanetCore();
await core.orbit({
  name: "database",
  async install() {}
});
await core.plugin({
  name: "auth",
  dependencies: ["database"],
  async install() {}
});

export { core };
`;
}

function buildInvalidAppContent() {
  return `
const core = { notValid: true };

export { core };
`;
}

async function captureConsole() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = ((...args: unknown[]) => {
    stdout.push(args.map(String).join(" "));
  }) as typeof console.log;
  console.error = ((...args: unknown[]) => {
    stderr.push(args.map(String).join(" "));
  }) as typeof console.error;

  return {
    stdout,
    stderr,
    restore() {
      console.log = originalLog;
      console.error = originalError;
    },
  };
}

function mockCwd(dir: string) {
  const original = process.cwd;
  (process as typeof process & { cwd: () => string }).cwd = () => dir;
  return () => {
    (process as typeof process & { cwd: () => string }).cwd = original;
  };
}

describe("Dependency Graph Generation (Phase 31)", () => {
  test("generates dependency graph JSON output", async () => {
    const fixture = await createFixture();
    const consoleCapture = await captureConsole();

    try {
      await fs.writeFile(fixture.entry, buildOrbitAppContent());

      await depsGraph({ entry: fixture.entry, format: "json" });

      const jsonOutput = consoleCapture.stdout.find((line) => line.trimStart().startsWith("["));
      expect(jsonOutput).toBeDefined();

      const graph = JSON.parse(jsonOutput!);
      expect(graph).toHaveLength(2);
      expect(graph.find((orbit: { name: string; dependencies: string[] }) => orbit.name === "auth")?.dependencies).toContain("database");
    } finally {
      consoleCapture.restore();
      await fs.rm(fixture.dir, { recursive: true, force: true });
    }
  });

  test("generates DOT output with leaf and internal node styling", async () => {
    const fixture = await createFixture();
    const consoleCapture = await captureConsole();

    try {
      await fs.writeFile(fixture.entry, buildOrbitAppContent());

      await depsGraph({ entry: fixture.entry, format: "dot" });

      const output = consoleCapture.stdout.join("\n");
      expect(output).toContain("digraph GravitoDependencies {");
      expect(output).toContain("rankdir=LR");
      expect(output).toContain('"database" [fillcolor="#c8e6c9"]');
      expect(output).toContain('"auth" [fillcolor="#e1f5fe"]');
      expect(output).toContain('"auth" -> "database"');
    } finally {
      consoleCapture.restore();
      await fs.rm(fixture.dir, { recursive: true, force: true });
    }
  });

  test("fails clearly when the entry file has no valid PlanetCore export", async () => {
    const fixture = await createFixture();
    const consoleCapture = await captureConsole();
    const originalExit = process.exit;

    try {
      await fs.writeFile(fixture.entry, buildInvalidAppContent());

      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error(`process.exit:${String(code)}`);
      }) as typeof process.exit;

      await expect(depsGraph({ entry: fixture.entry, format: "json" })).rejects.toThrow("process.exit:1");
      expect(exitCode).toBe(1);
      expect(consoleCapture.stderr.join("\n")).toContain("Could not find a valid Gravito PlanetCore");
    } finally {
      process.exit = originalExit;
      consoleCapture.restore();
      await fs.rm(fixture.dir, { recursive: true, force: true });
    }
  });

  test("falls back to app.ts when the default entry file is missing", async () => {
    const fixture = await createFixture();
    const consoleCapture = await captureConsole();
    const restoreCwd = mockCwd(fixture.dir);

    try {
      await fs.writeFile(fixture.entry, buildOrbitAppContent());

      await depsGraph({ entry: "src/index.ts", format: "json" });

      const jsonOutput = consoleCapture.stdout.find((line) => line.trimStart().startsWith("["));
      expect(jsonOutput).toBeDefined();

      const graph = JSON.parse(jsonOutput!);
      expect(graph).toHaveLength(2);
      expect(graph.map((orbit: { name: string }) => orbit.name)).toContain("database");
    } finally {
      restoreCwd();
      consoleCapture.restore();
      await fs.rm(fixture.dir, { recursive: true, force: true });
    }
  });

  test("honors gravito.config.ts and resolves src/index.ts directly", async () => {
    const fixture = await createFixture();
    const consoleCapture = await captureConsole();
    const restoreCwd = mockCwd(fixture.dir);

    try {
      await fs.writeFile(fixture.config, "export default {};\n");
      await fs.mkdir(path.dirname(fixture.srcIndex), { recursive: true });
      await fs.writeFile(fixture.srcIndex, buildOrbitAppContent());

      expect(resolveEntryPath("src/index.ts", fixture.dir)).toBe(path.resolve(fixture.dir, "src/index.ts"));

      await depsGraph({ entry: "src/index.ts", format: "json" });

      const jsonOutput = consoleCapture.stdout.find((line) => line.trimStart().startsWith("["));
      expect(jsonOutput).toBeDefined();

      const graph = JSON.parse(jsonOutput!);
      expect(graph).toHaveLength(2);
    } finally {
      restoreCwd();
      consoleCapture.restore();
      await fs.rm(fixture.dir, { recursive: true, force: true });
    }
  });
});
