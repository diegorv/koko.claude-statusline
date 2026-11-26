import { expect, test } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { dirname, relative, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const files = readdirSync(resolve(root, "src"), { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith(".ts"))
  .map(entry => resolve(entry.parentPath, entry.name))

test("shared modules do not depend on an agent, host SDK or CLI entry point", () => {
  const violations: string[] = []
  for (const file of files) {
    const source = relative(root, file)
    for (const match of readFileSync(file, "utf8").matchAll(/(?:from\s*|import\s*\(?)["']([^"']+)["']/g)) {
      const specifier = match[1]
      const target = specifier.startsWith(".") ? relative(root, resolve(dirname(file), specifier)) : specifier
      const shared = /^src\/(core|ui|collection|export)\//.test(source)
      if (shared && /^(src\/(agents|cli)\/|integrations\/|@opencode\/|@opentui\/|solid-js)/.test(target)) violations.push(`${source} -> ${target}`)
      if (source.startsWith("src/core/") && !target.startsWith("src/core/")) violations.push(`${source} -> ${target}`)
      const owner = source.match(/^src\/agents\/([^/]+)\//)?.[1]
      const other = target.match(/^src\/agents\/([^/]+)\//)?.[1]
      if (owner && other && owner !== other) violations.push(`${source} -> ${target}`)
      if (source.startsWith("src/") && /^(integrations\/|@opencode\/|@opentui\/|solid-js)/.test(target)) violations.push(`${source} -> ${target}`)
    }
  }
  expect(violations).toEqual([])
})
