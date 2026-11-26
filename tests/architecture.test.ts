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
  "src/agents/opencode": "opencode",
  "src/core": "core",
  "src/collection": "collection",
  "src/export": "export",
  "src/ui": "ui",
  "src/ui/components": "ui",
  "integrations/opencode": "plugin",
} as const
type Layer = (typeof layers)[keyof typeof layers]

const dependencies: Record<Layer, readonly Layer[]> = {
  cli: ["cli", "claude", "antigravity", "core", "collection", "ui", "export"],
  claude: ["claude", "core"],
  antigravity: ["antigravity", "core"],
  opencode: ["opencode", "core"],
  core: ["core"],
  collection: ["collection", "core"],
  export: ["export", "core"],
  ui: ["ui", "core"],
  plugin: ["plugin", "opencode", "core", "ui", "export"],
}

// Existing edges to remove as the corresponding contracts and collectors move.
const migrationEdges: Record<string, readonly string[]> = {
  "src/agents/claude/caveman-badge.ts": ["src/ui/format.ts"],
  "src/agents/opencode/git.ts": ["src/collection/git.ts"],
  "src/ui/render.ts": ["src/collection/git.ts", "src/collection/worktrunk.ts"],
  "src/ui/components/git-status.ts": ["src/collection/git.ts", "src/collection/worktrunk.ts"],
}

function layer(file: string): Layer | undefined {
  if (file === "src/index.ts") return "cli"
  return layers[dirname(file) as keyof typeof layers]
}

function allowed(file: string, owner: Layer, specifier: string): boolean {
  if (!specifier.startsWith(".")) {
    if (isBuiltin(specifier)) {
      return ["cli", "claude", "collection", "export", "plugin"].includes(owner) || file === "src/ui/terminal.ts"
    }
    return owner === "plugin" && /^(?:@opencode\/|@opentui\/|solid-js(?:\/|$))/.test(specifier)
  }
  const target = join(dirname(file), specifier)
  if (/^(src\/index|integrations\/opencode\/tui)(?:\.[jt]sx?)?$/.test(target)) return false
  const targetLayer = layer(target)
  return (targetLayer !== undefined && dependencies[owner].includes(targetLayer))
    || migrationEdges[file]?.includes(target) === true
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
      "src/ui/fixture.tsx": 'import "../index.ts"; export { x } from "../agents/claude/adapter.ts";',
      "src/agents/claude/fixture.ts": 'import type { X } from "@opencode/client"; const x = import("../antigravity/adapter.ts")',
      "integrations/opencode/fixture.ts": 'export * from "./tui.tsx"',
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
      "integrations/opencode/fixture.ts -> ./tui.tsx",
      "unclassified: new-package/index.ts",
      "src/agents/claude/fixture.ts -> @opencode/client",
      "src/agents/claude/fixture.ts -> ../antigravity/adapter.ts",
      "src/ui/fixture.tsx -> ../index.ts",
      "src/ui/fixture.tsx -> ../agents/claude/adapter.ts",
      "unclassified: src/ui/widgets/nested.ts",
    ])
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
})
