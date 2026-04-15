// Component: activity box title (config counts + session name)

import type { ConfigCounts } from "../../collection/config"
import type { McpStatus } from "../../parsing/transcript"
import { c } from "../format"
import { GAP } from "../constants"

/**
 * Renders the activity box title with config counts (CLAUDE.md, MCPs, hooks, rules) and session name.
 * @param config - Configuration counts (may be null).
 * @param mcpStatus - MCP server health status (may be null).
 * @param sessionName - Current session name (may be null).
 * @returns Formatted title string for the activity box right side.
 */
export function renderActivityTitle(config: ConfigCounts | null, mcpStatus: McpStatus | null, sessionName: string | null): string {
  const titleParts: string[] = []
  if (config) {
    if (config.claudeMd > 0) titleParts.push(`${config.claudeMd} CLAUDE.md`)

    const mcpOk = mcpStatus?.ok ?? new Set()
    const mcpErr = mcpStatus?.errored ?? new Set()
    const mcpSeen = new Set([...mcpOk, ...mcpErr])
    const mcpCount = Math.max(config.mcps, mcpSeen.size)
    if (mcpCount > 0) {
      if (mcpErr.size > 0) {
        titleParts.push(c("red", `${mcpCount} MCPs (${mcpErr.size} ✗)`))
      } else if (mcpOk.size > 0) {
        titleParts.push(c("green", `${mcpCount} MCPs ✓`))
      } else {
        titleParts.push(`${mcpCount} MCPs`)
      }
    }
    if (config.hooks > 0) titleParts.push(`${config.hooks} hooks`)
    if (config.rules > 0) titleParts.push(`${config.rules} rules`)
  }
  if (sessionName) titleParts.push(sessionName)
  return titleParts.join(GAP)
}
