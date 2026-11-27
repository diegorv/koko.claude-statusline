import { expect, test } from "bun:test"
import { globSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { isBuiltin } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { API } from "typescript/unstable/async"
import { isStringLiteralLikeNode } from "typescript/unstable/ast/is"

const root = resolve(import.meta.dir, "..")
const layers = {
  "src/cli": "cli",
  "src/agents/claude": "claude",
  "src/agents/antigravity": "antigravity",
  "src/core": "core",
  "src/cli/workspace": "localCli",
  "src/workspace": "workspace",
  "src/export": "export",
  "src/ui": "ui",
  "src/ui/components": "ui",
  "src/ui/content": "content",
  "integrations/codex": "codex",
  "integrations/opencode": "plugin",
  "integrations/opencode/mapping": "mapping",
} as const
type Layer = (typeof layers)[keyof typeof layers]

const dependencies: Record<Layer, readonly Layer[]> = {
  localCli: ["localCli", "workspace", "core"],
  cli: ["cli", "claude", "antigravity", "core", "localCli", "ui", "export"],
  claude: ["claude", "core"],
  antigravity: ["antigravity", "core"],
  mapping: ["mapping", "core"],
  core: ["core"],
  workspace: ["workspace", "core"],
  export: ["export", "core"],
  ui: ["ui", "core", "content"],
  content: ["content", "core"],
  codex: ["codex", "content", "core", "workspace"],
  plugin: ["plugin", "mapping", "core", "ui", "export"],
}

function layer(file: string): Layer | undefined {
  if (file === "src/index.ts") return "cli"
  return layers[dirname(file) as keyof typeof layers]
}

function allowed(file: string, owner: Layer, specifier: string): boolean {
  if (!specifier.startsWith(".")) {
    if (isBuiltin(specifier)) {
      return ["cli", "localCli", "claude", "export", "plugin", "codex"].includes(owner)
    }
    return owner === "plugin" && /^(?:@opencode\/|@opentui\/|solid-js(?:\/|$))/.test(specifier)
  }
  const target = join(dirname(file), specifier)
  if (/^(src\/index|integrations\/opencode\/tui|integrations\/codex\/server)(?:\.[jt]sx?)?$/.test(target)) return false
  if (owner !== "ui" && /^src\/ui\/(?:rows|lines)\.ts$/.test(target)) return false
  const targetLayer = layer(target)
  return targetLayer !== undefined && dependencies[owner].includes(targetLayer)
}

async function violations(directory: string) {
  const files = globSync("**/*.{ts,tsx}", {
    cwd: directory, exclude: ["**/node_modules/**", "**/tests/**", "**/*.{test,spec}.{ts,tsx}"],
  }).sort()
  // Parse every listed file even when the production tsconfigs do not include its directory.
  const temp = mkdtempSync(join(tmpdir(), "koko-imports-"))
  const config = join(temp, "tsconfig.json")
  const api = new API({})
  try {
    writeFileSync(config, JSON.stringify({
      compilerOptions: { noResolve: true, noLib: true, types: [], jsx: "preserve" },
      files: files.map(file => join(directory, file)),
    }))
    const snapshot = await api.updateSnapshot({ openProjects: [config] })
    const project = snapshot.getProjects()[0]
    const result: string[] = []
    for (const file of files) {
      const owner = layer(file)
      if (!owner) {
        result.push(`unclassified: ${file}`)
        continue
      }
      const source = await project.program.getSourceFile(join(directory, file))
      if (!source) throw new Error(`TypeScript did not parse ${file}`)
      for (const specifier of source.imports.filter(isStringLiteralLikeNode)) {
        if (!allowed(file, owner, specifier.text)) result.push(`${file} -> ${specifier.text}`)
      }
    }
    return result
  } finally {
    await api.close()
    rmSync(temp, { recursive: true, force: true })
  }
}

test("production modules import only from their layer's dependencies", async () => {
  expect(await violations(root)).toEqual([])
})

test("finds forbidden dependencies and unclassified directories while skipping tests and packages", async () => {
  const temp = mkdtempSync(join(tmpdir(), "koko-layers-"))
  try {
    const samples = {
      "src/ui/content/fixture.ts": 'import "../format.ts"; import "node:fs"; import "@opencode/client"',
      "src/ui/fixture.tsx": 'import "../index.ts"; export { x } from "../agents/claude/adapter.ts";',
      "src/agents/claude/caveman-badge.ts": 'import "../../ui/format.ts"; import type { StdinAdapter } from "../../cli/adapter.ts"',
      "src/agents/claude/fixture.ts": 'import type { X } from "@opencode/client"; const x = import("../antigravity/adapter.ts")',
      "integrations/codex/fixture.ts": 'import "../../src/ui/render.ts"; import "../opencode/workspace.ts"; import "./server.ts"',
      "integrations/opencode/fixture.ts": 'export * from "./tui.tsx"; import "../../src/workspace/git.ts"',
      "integrations/opencode/mapping/fixture.ts": 'import "../host.ts"; import "solid-js"; export * from "node:fs"; import("@opencode/client/solid")',
      "src/ui/widgets/nested.ts": "",
      "new-package/index.ts": "",
      "src/ui/tests/fixture.ts": "",
      "integrations/opencode/node_modules/other/index.tsx": "",
    }
    for (const [file, source] of Object.entries(samples)) {
      mkdirSync(join(temp, dirname(file)), { recursive: true })
      writeFileSync(join(temp, file), source)
    }
    expect(await violations(temp)).toEqual([
      "integrations/codex/fixture.ts -> ../../src/ui/render.ts",
      "integrations/codex/fixture.ts -> ../opencode/workspace.ts",
      "integrations/codex/fixture.ts -> ./server.ts",
      "integrations/opencode/fixture.ts -> ./tui.tsx",
      "integrations/opencode/fixture.ts -> ../../src/workspace/git.ts",
      "integrations/opencode/mapping/fixture.ts -> ../host.ts",
      "integrations/opencode/mapping/fixture.ts -> solid-js",
      "integrations/opencode/mapping/fixture.ts -> node:fs",
      "integrations/opencode/mapping/fixture.ts -> @opencode/client/solid",
      "unclassified: new-package/index.ts",
      "src/agents/claude/caveman-badge.ts -> ../../ui/format.ts",
      "src/agents/claude/caveman-badge.ts -> ../../cli/adapter.ts",
      "src/agents/claude/fixture.ts -> @opencode/client",
      "src/agents/claude/fixture.ts -> ../antigravity/adapter.ts",
      "src/ui/content/fixture.ts -> ../format.ts",
      "src/ui/content/fixture.ts -> node:fs",
      "src/ui/content/fixture.ts -> @opencode/client",
      "src/ui/fixture.tsx -> ../index.ts",
      "src/ui/fixture.tsx -> ../agents/claude/adapter.ts",
      "unclassified: src/ui/widgets/nested.ts",
    ])
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
})
