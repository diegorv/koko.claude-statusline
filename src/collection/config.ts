// Count CLAUDE.md files, rules, MCPs and hooks from the filesystem

import { existsSync, readdirSync, readFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"

export interface ConfigCounts {
  claudeMd: number
  rules: number
  mcps: number
  hooks: number
}

function countMdFiles(dir: string): number {
  try {
    let count = 0
    for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
      if (entry.isFile() && entry.name.endsWith(".md")) count++
    }
    return count
  } catch { return 0 }
}

function readJson(path: string): any {
  try { return JSON.parse(readFileSync(path, "utf-8")) } catch { return null }
}

function jsonKeys(path: string, key: string): number {
  const obj = readJson(path)?.[key]
  return obj && typeof obj === "object" ? Object.keys(obj).length : 0
}

function jsonArray(path: string, key: string): string[] {
  const arr = readJson(path)?.[key]
  return Array.isArray(arr) ? arr : []
}

export function getConfigCounts(cwd: string): ConfigCounts {
  const home = homedir()
  const claude = join(home, ".claude")

  // CLAUDE.md files
  const mdPaths = [
    join(claude, "CLAUDE.md"),
    join(cwd, "CLAUDE.md"),
    join(cwd, "CLAUDE.local.md"),
    join(cwd, ".claude", "CLAUDE.md"),
    join(cwd, ".claude", "CLAUDE.local.md"),
  ]
  const claudeMd = mdPaths.filter(p => existsSync(p)).length

  // Rules (.md files in rules dirs)
  const rules = countMdFiles(join(claude, "rules"))
              + countMdFiles(join(cwd, ".claude", "rules"))

  // MCPs (mcpServers keys minus disabled)
  const mcpTotal = jsonKeys(join(claude, "settings.json"), "mcpServers")
                 + jsonKeys(join(home, ".claude.json"), "mcpServers")
                 + jsonKeys(join(cwd, ".mcp.json"), "mcpServers")
                 + jsonKeys(join(cwd, ".claude", "settings.json"), "mcpServers")
                 + jsonKeys(join(cwd, ".claude", "settings.local.json"), "mcpServers")

  const disabled = new Set([
    ...jsonArray(join(claude, "settings.json"), "disabledMcpServers"),
    ...jsonArray(join(claude, "settings.json"), "disabledMcpjsonServers"),
    ...jsonArray(join(cwd, ".claude", "settings.json"), "disabledMcpServers"),
    ...jsonArray(join(cwd, ".claude", "settings.json"), "disabledMcpjsonServers"),
  ])
  const mcps = Math.max(0, mcpTotal - disabled.size)

  // Hooks (hooks keys)
  const hooks = jsonKeys(join(claude, "settings.json"), "hooks")
              + jsonKeys(join(cwd, ".claude", "settings.json"), "hooks")
              + jsonKeys(join(cwd, ".claude", "settings.local.json"), "hooks")

  return { claudeMd, rules, mcps, hooks }
}
