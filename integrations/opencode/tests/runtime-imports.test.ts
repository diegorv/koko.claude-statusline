import { expect, test } from "bun:test"
import { globSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

const hostModules = new Set(["@opencode/plugin/tui", "@opentui/core", "@opentui/solid", "solid-js", "solid-js/store"])

function unsupportedImports(source: string, loader: "ts" | "tsx") {
  return new Bun.Transpiler({ loader }).scan(source).imports
    .map(entry => entry.path)
    .filter(path => !path.startsWith(".") && !hostModules.has(path))
}

test("production plugin modules execute only relative imports and host-provided packages", () => {
  const dir = resolve(import.meta.dir, "..")
  const files = globSync("**/*.{ts,tsx}", {
    cwd: dir, exclude: ["**/node_modules/**", "**/tests/**", "**/*.{test,spec}.{ts,tsx}"],
  })
  const violations = files.flatMap(file =>
    unsupportedImports(readFileSync(join(dir, file), "utf8"), file.endsWith(".tsx") ? "tsx" : "ts")
      .map(specifier => `${file}: ${specifier}`))
  expect(violations).toEqual([])
})

test("separates erased SDK types from runtime imports, reexports and lazy loads", () => {
  expect(unsupportedImports(`
    import type { Message } from "@opencode/client"
    import { type Info } from "@opencode/schema"
    export type { Model } from "@opencode/client"
    export { type Theme } from "@opencode/theme"
    import { For } from "solid-js"
    import "@opencode/client/solid"
    export { type T, value } from "@opencode/schema/token-usage"
    const lazy = () => import("@opencode/theme")
  `, "ts")).toEqual(["@opencode/client/solid", "@opencode/schema/token-usage", "@opencode/theme"])
})
