// Component: activity box title (config counts + output style + session name)

import type { ConfigCounts } from "../../collection/config"
import type { McpStatus } from "../../parsing/transcript"
import { c } from "../format"
import { GAP } from "../constants"

/**
 * Renders the activity box title with config counts, optional output style,
 * and session name.
 *
 * The "default" output style is intentionally hidden — most sessions run on
 * default and showing it would just be header noise. Any non-default style
 * (e.g. "explanatory", "succinct") gets surfaced so the user can see at a
 * glance that they're on a non-stock preset.
 */
export function renderActivityTitle(
  config: ConfigCounts | null,
  mcpStatus: McpStatus | null,
  sessionName: string | null,
  outputStyle: string | null = null,
): string {
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
  if (outputStyle && outputStyle !== "default") titleParts.push(c("magenta", outputStyle))
  if (sessionName) titleParts.push(sessionName)
  return titleParts.join(GAP)
}
