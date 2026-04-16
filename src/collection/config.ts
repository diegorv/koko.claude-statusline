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

/**
 * Counts CLAUDE.md files, rules, enabled MCP servers, and hooks from the filesystem.
 * Caches parsed JSON per file path to avoid redundant reads.
 * @param cwd - Current working directory of the Claude Code session.
 * @returns Configuration counts for display in the status line.
 */
export function getConfigCounts(cwd: string): ConfigCounts {
  const home = homedir()
  const claude = join(home, ".claude")

  // Cache parsed JSON per file path — avoids reading the same file multiple times
  const jsonCache = new Map<string, any>()
  const readJson = (path: string): any => {
    if (jsonCache.has(path)) return jsonCache.get(path)
    let result: any = null
    try { result = JSON.parse(readFileSync(path, "utf-8")) } catch {}
    jsonCache.set(path, result)
    return result
  }
  const jsonKeys = (path: string, key: string): number => {
    const obj = readJson(path)?.[key]
    return obj && typeof obj === "object" ? Object.keys(obj).length : 0
  }
  const jsonArray = (path: string, key: string): string[] => {
    const arr = readJson(path)?.[key]
    return Array.isArray(arr) ? arr : []
  }

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
  const claudeSettings = join(claude, "settings.json")
  const projectSettings = join(cwd, ".claude", "settings.json")

  const mcpTotal = jsonKeys(claudeSettings, "mcpServers")
                 + jsonKeys(join(home, ".claude.json"), "mcpServers")
                 + jsonKeys(join(cwd, ".mcp.json"), "mcpServers")
                 + jsonKeys(projectSettings, "mcpServers")
                 + jsonKeys(join(cwd, ".claude", "settings.local.json"), "mcpServers")

  const disabled = new Set([
    ...jsonArray(claudeSettings, "disabledMcpServers"),
    ...jsonArray(claudeSettings, "disabledMcpjsonServers"),
    ...jsonArray(projectSettings, "disabledMcpServers"),
    ...jsonArray(projectSettings, "disabledMcpjsonServers"),
  ])
  const mcps = Math.max(0, mcpTotal - disabled.size)

  // Hooks (hooks keys)
  const hooks = jsonKeys(claudeSettings, "hooks")
              + jsonKeys(projectSettings, "hooks")
              + jsonKeys(join(cwd, ".claude", "settings.local.json"), "hooks")

  return { claudeMd, rules, mcps, hooks }
}
