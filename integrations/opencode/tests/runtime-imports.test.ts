import { expect, test } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

test("runtime entry points only import host-provided packages, not development SDK helpers", () => {
  const dir = resolve(import.meta.dir, "..")
  const hostModules = new Set(["@opencode/plugin/tui", "@opentui/core", "@opentui/solid", "solid-js", "solid-js/store"])
  const violations: string[] = []
  for (const file of readdirSync(dir).filter(file => /\.tsx?$/.test(file))) {
    for (const match of readFileSync(resolve(dir, file), "utf8").matchAll(/^import(?!\s+type\b)[\s\S]*?from\s+["']([^"']+)["']/gm)) {
      if (!match[1].startsWith(".") && !hostModules.has(match[1])) violations.push(`${file}: ${match[1]}`)
    }
  }
  expect(violations).toEqual([])
})
